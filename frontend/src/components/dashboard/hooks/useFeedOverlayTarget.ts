'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type {
  FeedPostOverlayCloseOptions,
  FeedPostOverlayTarget,
} from '../contexts/FeedPostOverlayContext';
import {
  forgetFeedOverlayHistory,
  popFeedOverlayHistory,
  pushFeedOverlayHistory,
} from '../modules/feed/feedOverlayHistory';
import { buildFeedPostPath } from '../modules/feed/feedPostRouting';

/**
 * Preklik na profil (cudzí aj vlastný): okno detailu nad ním nesmie ostať otvorené.
 * Posiela ich každé miesto v appke, odkiaľ sa dá na profil prejsť (`openUserProfile`, zoznam lajkujúcich,
 * správy, upozornenia, „Môj profil“…), takže pravidlo platí všeobecne a netreba ho písať na každom z nich.
 */
const PROFILE_NAVIGATION_EVENTS = ['goToUserProfile', 'goToMyProfile'] as const;

/** Cieľ okna detailu príspevku nad appkou: stav, záznam v histórii a tlačidlo späť. */
export function useFeedOverlayTarget() {
  // --- Okno detailu prispevku -------------------------------------------
  // Vrstva nad appkou: URL sa meni cez history API, teda BEZ Next navigacie,
  // takze sa nic pod oknom neodmountuje ani nestrati scroll. Otvorenie prida
  // presne jeden zaznam historie a zatvorenie ho odoberie - detaily aj s
  // odovodnenim su vo `feedOverlayHistory`.
  const [feedOverlayTarget, setTarget] =
    useState<FeedPostOverlayTarget | null>(null);
  // AKTUÁLNY cieľ pre obsluhy udalostí. Zapisuje sa SYNCHRÓNNE pri každej zmene (aj priamym nastavením),
  // nie pri vykreslení: zatvorenie cez kontext okna (`beforeNavigate`) a udalosť prekliku na profil bežia
  // v tej istej obsluhe kliknutia a stav sa medzitým neprekreslí, takže uzáver efektu by videl okno, ktoré
  // je už zavreté.
  const targetRef = useRef<FeedPostOverlayTarget | null>(null);

  const setFeedOverlayTarget = useCallback<
    Dispatch<SetStateAction<FeedPostOverlayTarget | null>>
  >((next) => {
    const resolved = typeof next === 'function' ? next(targetRef.current) : next;
    targetRef.current = resolved;
    setTarget(resolved);
  }, []);

  const handleFeedOverlayTargetChange = useCallback(
    (
      target: FeedPostOverlayTarget | null,
      options?: FeedPostOverlayCloseOptions,
    ) => {
      setFeedOverlayTarget(target);
      if (target) {
        pushFeedOverlayHistory(
          buildFeedPostPath(target.postId, target.highlightCommentId),
        );
        return;
      }
      // Appka práve naviguje inam a adresu si rieši sama - krok spat by tu
      // navigaciu vzapati zrusil.
      if (options?.keepHistory) {
        forgetFeedOverlayHistory();
        return;
      }
      popFeedOverlayHistory();
    },
    [setFeedOverlayTarget],
  );

  // Tlacidlo spat v prehliadaci zavrie okno namiesto navigacie prec.
  useEffect(() => {
    if (!feedOverlayTarget || typeof window === 'undefined') return;
    const handlePopState = () => {
      // Zaznam okna prave zmizol - zatvorenie uz nema co odoberat.
      forgetFeedOverlayHistory();
      setFeedOverlayTarget(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [feedOverlayTarget, setFeedOverlayTarget]);

  // Preklik na profil zavrie okno bez ohľadu na to, ako bolo otvorené. Kontext okna o oknách otvorených
  // z upozornenia alebo z adresy nevie (jeho kópia cieľa je prázdna), takže sa na ňu nedá spoľahnúť; a
  // zoznam lajkujúcich v okne dialóg zatvorí, no okno nie. Zatvára sa s `keepHistory`: adresu profilu
  // rieši samotná navigácia a krok späť by ju vzápätí zrušil. Záznam okna v histórii ostáva, takže Späť
  // z profilu vráti na adresu príspevku a appka okno znova otvorí (`decideFeedPostEntry`).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleProfileNavigation = () => {
      // Zavreté okno sa nezatvára druhýkrát: `beforeNavigate` (zatvorenie karty alebo komentára) už okno
      // zavrelo a `forgetFeedOverlayHistory()` by zhasol príznak `closing`, kým ešte beží krok späť po
      // zatvorení bez `keepHistory`, takže by appka pod zavretým oknom otvorila stránku príspevku.
      if (!targetRef.current) return;
      handleFeedOverlayTargetChange(null, { keepHistory: true });
    };
    PROFILE_NAVIGATION_EVENTS.forEach((name) =>
      window.addEventListener(name, handleProfileNavigation),
    );
    return () =>
      PROFILE_NAVIGATION_EVENTS.forEach((name) =>
        window.removeEventListener(name, handleProfileNavigation),
      );
  }, [handleFeedOverlayTargetChange]);

  return {
    feedOverlayTarget,
    setFeedOverlayTarget,
    handleFeedOverlayTargetChange,
  };
}
