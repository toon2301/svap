'use client';

/**
 * Okno detailu príspevku – otvárateľné odkiaľkoľvek v appke.
 *
 * Prečo KONTEXT a nie window event (ako `feedShareEvents`): eventy appka
 * používa na oznámenia „stalo sa X" bez odpovede. Tu volajúci potrebuje aj
 * odpoveď – či okno vôbec existuje. Bez providera (samostatne vykreslená
 * karta v teste, budúce prostredie bez dashboardu) sa `useFeedPostOverlay`
 * vráti `null` a volajúci ostane pri pôvodnom správaní, čo sa eventom
 * vyjadriť nedá.
 *
 * Kontext NIČ nevykresľuje – len nesie príkaz „otvor". Samotné okno mountuje
 * dashboard, aby ležalo nad celou appkou a nič pod ním sa neodmountovalo.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type FeedPostOverlayTarget = {
  postId: number;
  /** Komentár z notifikácie – okno naň doscrolluje a zvýrazní ho. */
  highlightCommentId?: number | null;
};

export type FeedPostOverlayCloseOptions = {
  /**
   * Appka práve naviguje inam, takže si adresu rieši sama.
   *
   * Bežné zatvorenie vracia adresu na stav spred otvorenia (krok späť). Keď sa
   * ale zatvára PRETO, že používateľ preklikol ďalej (napr. na zdieľanú
   * ponuku), krok späť by tú navigáciu vzápätí zrušil.
   */
  keepHistory?: boolean;
};

type FeedPostOverlayContextValue = {
  /** Otvorí okno nad appkou. Volajúci nemusí vedieť, kde okno žije. */
  open: (target: FeedPostOverlayTarget) => void;
  close: (options?: FeedPostOverlayCloseOptions) => void;
  /** Práve zobrazený príspevok, alebo null keď je okno zavreté. */
  target: FeedPostOverlayTarget | null;
};

const FeedPostOverlayContext = createContext<FeedPostOverlayContextValue | null>(
  null,
);

/**
 * `null` znamená „okno v tomto strome nie je" – volajúci vtedy ostáva pri
 * pôvodnom správaní (rozbalenie komentárov v karte, otvorenie fotky rovno).
 */
export function useFeedPostOverlay(): FeedPostOverlayContextValue | null {
  return useContext(FeedPostOverlayContext);
}

type FeedPostOverlayProviderProps = {
  children: ReactNode;
  /** Volá sa pri otvorení/zatvorení – dashboard podľa toho synchronizuje URL. */
  onTargetChange?: (
    target: FeedPostOverlayTarget | null,
    options?: FeedPostOverlayCloseOptions,
  ) => void;
};

export function FeedPostOverlayProvider({
  children,
  onTargetChange,
}: FeedPostOverlayProviderProps) {
  const [target, setTarget] = useState<FeedPostOverlayTarget | null>(null);

  const open = useCallback(
    (next: FeedPostOverlayTarget) => {
      setTarget(next);
      onTargetChange?.(next);
    },
    [onTargetChange],
  );

  const close = useCallback(
    (options?: FeedPostOverlayCloseOptions) => {
      setTarget(null);
      onTargetChange?.(null, options);
    },
    [onTargetChange],
  );

  const value = useMemo(
    () => ({ open, close, target }),
    [open, close, target],
  );

  return (
    <FeedPostOverlayContext.Provider value={value}>
      {children}
    </FeedPostOverlayContext.Provider>
  );
}
