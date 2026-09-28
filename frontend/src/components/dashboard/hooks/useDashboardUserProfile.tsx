"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { type User } from '@/types';
import { type SearchUserResult } from '../modules/search/types';
import { endpoints } from '@/lib/api';
import {
  getUserProfileFromCache,
  setUserProfileToCache,
} from '../modules/profile/profileUserCache';
import { type UseDashboardStateResult } from './useDashboardState';
import { supportsSkillHighlight } from './useDashboardHighlighting';
import { dashboardSectionPath, isSameDashboardPath } from '../components/dashboardRoutes';
import { fetchUserProfile, startViewedUserResolution } from './viewedUserResolution';

export interface DashboardUserProfileProps {
  viewedUserId: number | null;
  setViewedUserId: (userId: number | null) => void;
  viewedUserSlug: string | null;
  setViewedUserSlug: (slug: string | null) => void;
  viewedUserSummary: SearchUserResult | null;
  setViewedUserSummary: (summary: SearchUserResult | null) => void;
  viewedUserNotFound: boolean;
  /** Profil sa nepodarilo načítať (sieť, 5xx, 429, timeout) – nie 404. */
  viewedUserLoadError: boolean;
  /** Nový pokus o načítanie profilu po chybe. */
  retryViewedUserLoad: () => void;
  initialRightItemAppliedRef: React.MutableRefObject<boolean>;
}

/**
 * Adresa profilu so zachovaným query a fragmentom AKTUÁLNEJ stránky.
 *
 * Kanonizácia mení iba identifikátor v ceste (číselné ID → slug, starý slug →
 * nový), takže `?tab=`, `?offer=` aj `?highlight=` patria ďalej tej istej
 * stránke a musia prejsť so sebou. Jedna implementácia pre celý hook – aby
 * nevznikli dve, ktoré sa časom rozídu.
 *
 * NEPOUŽÍVAŤ pri prechode z inej stránky na profil: tam query patrí tomu,
 * odkiaľ sa odchádza, a preniesť ho by bola chyba.
 */
function profileUrlKeepingQuery(path: string): string {
  if (typeof window === 'undefined') return path;
  return `${path}${window.location.search}${window.location.hash}`;
}

interface UseDashboardUserProfileParams {
  user: User | null;
  activeModule: string;
  dashboardState: UseDashboardStateResult;
  initialViewedUserId?: number | null;
  initialHighlightedSkillId?: number | null;
  initialProfileSlug?: string | null;
  initialRightItem?: string | null;
  setHighlightedSkillId: (skillId: number | null) => void;
}

/**
 * Custom hook pre user profile handling v Dashboard
 */
export function useDashboardUserProfile({
  user,
  activeModule,
  dashboardState,
  initialViewedUserId,
  initialHighlightedSkillId,
  initialProfileSlug,
  initialRightItem,
  setHighlightedSkillId,
}: UseDashboardUserProfileParams): DashboardUserProfileProps {
  const [viewedUserId, setViewedUserId] = useState<number | null>(null);
  const [viewedUserSlug, setViewedUserSlug] = useState<string | null>(null);
  const [viewedUserSummary, setViewedUserSummary] = useState<SearchUserResult | null>(null);
  // True ak slug profil neexistuje (404 – napr. zmazaný/anonymizovaný účet).
  const [viewedUserNotFound, setViewedUserNotFound] = useState(false);
  const [viewedUserLoadError, setViewedUserLoadError] = useState(false);
  // Zvýšenie spustí preklad slug → ID znova (tlačidlo „Skúsiť znova").
  const [resolveAttempt, setResolveAttempt] = useState(0);
  const initialRightItemAppliedRef = useRef(false);
  // Aktuálny modul pre efekty, ktoré sa ním NEMAJÚ spúšťať. Inicializácia
  // profilu patrí výhradne props: keby ju prebudila zmena modulu, prepísala by
  // interaktívnu navigáciu späť na stav z času mountu.
  const activeModuleRef = useRef(activeModule);
  activeModuleRef.current = activeModule;

  const {
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    isRightSidebarOpen,
    activeRightItem,
  } = dashboardState;

  // Rozlíšenie slug -> viewedUserId (cache, inak API). Vracia zrušenie behu –
  // neskorá odpoveď zo staršieho vstupu už nič nezapíše. Viď viewedUserResolution.
  const resolveViewedUserBySlug = useCallback((slug: string): (() => void) => {
    setViewedUserLoadError(false);
    return startViewedUserResolution(slug, {
      onResolved: setViewedUserId,
      onNotFound: () => setViewedUserNotFound(true),
      onFailed: () => setViewedUserLoadError(true),
    });
  }, []);

  const retryViewedUserLoad = useCallback(() => {
    setViewedUserLoadError(false);
    setResolveAttempt((attempt) => attempt + 1);
  }, []);

  // Chyba načítania patrí JEDNÉMU zobrazovanému profilu – pri jeho zmene
  // (iný slug alebo ID) sa zahodí, aj keď preklad slugu vôbec nebeží (vstup so
  // známym ID). Kedysi prežila do ďalšieho profilu: skryla na ňom menu a pri
  // ďalšom preklade slugu sa na okamih ukázala stará hláška.
  useEffect(() => {
    setViewedUserLoadError(false);
  }, [viewedUserSlug, viewedUserId]);

  // Inicializácia profilu podľa slug alebo ID
  useEffect(() => {
    // Nová navigácia → vyresetuj "not found" stav.
    setViewedUserNotFound(false);
    // Priorita: ak máme initialViewedUserId, použiť ho
    if (initialViewedUserId) {
      setViewedUserId(initialViewedUserId);
      // Zvýraznenie z props nastav LEN keď o ňom nerozhoduje adresa.
      //
      // Tú istú hodnotu z props nastavuje aj `useDashboardHighlighting`, a to
      // PREDTÝM, než ju prepíše hodnotou z adresy. Tento efekt sa registruje
      // až za ním, takže druhý zápis tej istej hodnoty by adresu prepísal
      // späť na props – a tie vedia byť staršie: krok späť cez hranicu
      // stránky obnoví strom pôvodnej stránky, takže nesú zvýraznenie z času,
      // keď záznam vznikol. Zvýraznila by sa iná karta, než na ktorú odkaz
      // ukazuje. Prejavovalo sa to len pri číselnom ID – slugová vetva sem
      // nedôjde, vracia sa až nižšie.
      if (initialHighlightedSkillId != null && !supportsSkillHighlight(activeModuleRef.current)) {
        setHighlightedSkillId(initialHighlightedSkillId);
      }
      return;
    }

    if (!initialProfileSlug) return;

    // Slug -> id prekladá JEDINE efekt nižšie – preklad aj tu posielal na ten
    // istý vstup druhý súbežný request.
    setViewedUserSlug(initialProfileSlug);
  }, [initialProfileSlug, initialViewedUserId, initialHighlightedSkillId, setHighlightedSkillId]);

  const viewingSelf =
    (Boolean(user?.slug) && viewedUserSlug === user?.slug) ||
    (user?.id != null && viewedUserId === user.id);

  // Vlastný profil zobrazujeme cez plnohodnotný `profile` modul (edit, atď.) –
  // pri KAŽDOM vstupe. Kedysi sa to kontrolovalo až za „ID je známe": slug ->
  // ID je v cache od prvého vstupu, takže každý ďalší preklik na vlastnú ponuku
  // mal ID hneď a vlastný profil sa ukázal ako cudzí (so šípkou, bez Upraviť).
  useEffect(() => {
    if (activeModule === 'user-profile' && viewingSelf) setActiveModule('profile');
  }, [activeModule, viewingSelf, setActiveModule]);

  // Slug -> id: JEDINÝ preklad – pri tvrdom načítaní route (aj mimo profilu,
  // napr. portfólio po F5) aj pri state-driven navigácii (popstate, návrat
  // z portfólia, notifikácie). Bez neho ostane ModuleRouter trvalo na
  // „Načítavam profil..." – `viewedUserId` je null a nič ho nedoplní.
  // Vlastný slug mimo tvrdo načítanej route sa neprekladá: ten prepne efekt vyššie.
  //
  // Efekt závisí len od toho, ČI a ČO prekladať – prepnutie modulu uprostred
  // prekladu ho nezruší. Zmena slugu áno: cleanup preruší request a neskorá
  // odpoveď zo staršieho vstupu už nič nezapíše. `viewedUserNotFound` zámerne
  // nie je v deps: po 404 sa ten istý slug znovu neprekladá (žiadny
  // refetch-loop), až pri zmene slugu alebo novom pokuse (`resolveAttempt`).
  const slugToResolve =
    !viewedUserId &&
    viewedUserSlug &&
    (viewedUserSlug === initialProfileSlug || (activeModule === 'user-profile' && !viewingSelf))
      ? viewedUserSlug
      : null;

  useEffect(() => {
    if (!slugToResolve) return;
    // Nový slug → vyresetuj prípadný stale not-found z predošlého profilu, nech nový
    // profil nezostane omylom na "not found". 404 pre tento slug ho nastaví znovu.
    setViewedUserNotFound(false);
    return resolveViewedUserBySlug(slugToResolve);
  }, [slugToResolve, resolveViewedUserBySlug, resolveAttempt]);

  // Vlastny slug prepina na ProfileModule iba pre bezny profil route.
  // Portfolio detail/create si musia zachovat vlastny aktivny modul aj po reloade.
  useEffect(() => {
    if (!user || !initialProfileSlug) return;
    if (activeModule !== 'user-profile') return;
    // `initialProfileSlug` je zamrznuty Next.js params prop – pri pushState navigacii
    // (klik na ponuku/cudzi profil) sa NEaktualizuje a pri router.push zaostava za
    // synchronnym `setActiveModule('user-profile')`. Bez tohto guardu by prepnutie na
    // vlastny profil vyskocilo aj ked uz interaktivne prezerame INEHO pouzivatela.
    // Prepiname preto len ked zobrazovany slug je naozaj vlastny. Slug, nie id: slug
    // nastavuje preklik hned (`goToUserProfile`), id sa dopocita az neskor – a
    // nevyriesene id nesmie znamenat „pozeram seba".
    const viewingSelf = viewedUserSlug === user.slug;
    if (viewingSelf && user.slug && user.slug === initialProfileSlug) {
      setActiveModule('profile');
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeModule', 'profile');
        }
      } catch {
        // ignore
      }
    }
  }, [activeModule, user, initialProfileSlug, viewedUserSlug, setActiveModule]);

  // Aplikuj počiatočný stav pravého sidebaru pre vlastný profil na základe URL (edit, account, privacy, language)
  useEffect(() => {
    if (!user || !initialRightItem || initialRightItemAppliedRef.current) {
      return;
    }

    // Priamy desktopový route nastavení nepotrebuje profilový slug. Držíme
    // ho v existujúcom settings module, aby ostala zachovaná pravá navigácia
    // aj jej návratová história bez rozširovania nadlimitného state hooku.
    if (
      initialRightItem === 'offer-watches'
      && activeModule === 'settings'
      && typeof window !== 'undefined'
      && window.innerWidth >= 1024
    ) {
      initialRightItemAppliedRef.current = true;
      setIsRightSidebarOpen(true);
      setActiveRightItem('offer-watches');
      return;
    }

    if (!initialProfileSlug) return;

    if (user.slug && user.slug === initialProfileSlug) {
      initialRightItemAppliedRef.current = true;

      if (initialRightItem === 'edit-profile') {
        // Zodpovedá handleRightSidebarToggle() pri zapnutí edit módu
        setActiveModule('profile');
        setIsRightSidebarOpen(true);
        setActiveRightItem('edit-profile');
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('activeModule', 'profile');
          }
        } catch {
          // ignore
        }
      } else if (initialRightItem === 'account-type') {
        // Zodpovedá handleSidebarAccountTypeClick()
        setActiveModule('profile');
        setIsRightSidebarOpen(true);
        setActiveRightItem('account-type');
      } else if (initialRightItem === 'privacy') {
        // Zodpovedá handleSidebarPrivacyClick()
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setActiveModule('privacy');
          setIsRightSidebarOpen(false);
          setActiveRightItem('');
          try {
            localStorage.setItem('activeModule', 'privacy');
          } catch {
            // ignore
          }
        } else {
          setActiveModule('profile');
          setIsRightSidebarOpen(true);
          setActiveRightItem('privacy');
        }
      } else if (initialRightItem === 'language') {
        // Zodpovedá handleSidebarLanguageClick()
        setActiveModule('profile');
        setIsRightSidebarOpen(true);
        setActiveRightItem('language');
      }
    }
  }, [
    user,
    activeModule,
    initialProfileSlug,
    initialRightItem,
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
  ]);

  // Aktualizácia URL na slug pre vlastný profil
  useEffect(() => {
    // Len ak sme na vlastnom profile a máme slug
    if (!user?.slug || activeModule !== 'profile' || !user?.id) return;

    // Skontrolovať, či sme na vlastnom profile (nie na cudzom)
    // Ak je viewedUserId nastavený a je iný ako user.id, sme na cudzom profile
    if (viewedUserId && viewedUserId !== user.id) return;

    // Skontrolovať, či sme v edit móde
    const isEditMode = isRightSidebarOpen && activeRightItem === 'edit-profile';
    
    // Zistiť aktuálnu URL
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const expectedPath = `/dashboard/users/${user.slug}`;
    const expectedPathWithEdit = `/dashboard/users/${user.slug}/edit`;

    // Ak sme v edit móde, očakávaná URL by mala obsahovať /edit
    const expectedPathForCurrentMode = isEditMode ? expectedPathWithEdit : expectedPath;

    // Ak sme na správnej URL, nič nerobiť
    if (currentPath === expectedPathForCurrentMode) {
      return;
    }

    // Aktualizovať URL bez reloadu - window.history.replaceState mení URL bez prerenderovania stránky
    //
    // Všetky prepisy nižšie menia LEN tvar adresy toho istého záznamu, preto si
    // odovzdávajú jeho stav. Nesie štítky, ktoré prepis adresy nemá zrušiť –
    // napríklad pôvod profilu pre appkovú šípku alebo návrat z Nastavení.
    if (currentPath.startsWith('/dashboard/users/')) {
      const currentIdentifier = currentPath.replace('/dashboard/users/', '').split('/')[0];
      const isCurrentPathEdit = currentPath.endsWith('/edit');
      
      // Kontrola, či URL obsahuje /edit - ak áno a je to vlastný profil, nastaviť edit mode
      if (isCurrentPathEdit && currentIdentifier === user.slug) {
        // URL obsahuje /edit - nastaviť edit mode (ak ešte nie je nastavený)
        if (!isEditMode) {
          setActiveModule('profile');
          setIsRightSidebarOpen(true);
          setActiveRightItem('edit-profile');
        }
        // Zachovať URL s /edit - nemeníme ju
        return;
      }
      
      // Ak sme v edit móde a slug sa zmenil, aktualizovať URL s novým slugom a zachovať /edit
      if (isEditMode && currentIdentifier !== user.slug) {
        if (typeof window !== 'undefined') {
          window.history.replaceState(window.history.state, '', profileUrlKeepingQuery(expectedPathWithEdit));
        }
        return;
      }
      
      // Ak je aktuálny identifikátor číslo (ID) a máme slug
      if (/^\d+$/.test(currentIdentifier) && currentIdentifier !== user.slug) {
        const newUrl = isEditMode ? expectedPathWithEdit : expectedPath;
        if (typeof window !== 'undefined') {
          window.history.replaceState(window.history.state, '', profileUrlKeepingQuery(newUrl));
        }
      } else if (currentIdentifier !== user.slug) {
        if (typeof window !== 'undefined') {
          window.history.replaceState(window.history.state, '', profileUrlKeepingQuery(expectedPathForCurrentMode));
        }
      }
    } else {
      // Sme mimo user profile URL štruktúry – spravidla prichádzame z INEJ
      // stránky a query ani fragment sa ZÁMERNE neprenášajú: patria tomu,
      // odkiaľ sa odchádza. Výnimkou je `/dashboard/profile` – len iný tvar
      // adresy TOHO ISTÉHO profilu (`goToMyProfile`, Spolupráce), ktorého
      // `?highlight=` či `?tab=` patrí profilu a musí prejsť so sebou.
      if (typeof window !== 'undefined') {
        const isOwnProfileAlias = isSameDashboardPath(currentPath, dashboardSectionPath('profile'));
        window.history.replaceState(
          window.history.state,
          '',
          isOwnProfileAlias
            ? profileUrlKeepingQuery(expectedPathForCurrentMode)
            : expectedPathForCurrentMode,
        );
      }
    }
  }, [
    user?.slug,
    user?.id,
    activeModule,
    viewedUserId,
    isRightSidebarOpen,
    activeRightItem,
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
  ]);

  // Aktualizácia URL na slug, keď sa načíta profil cudzieho používateľa
  useEffect(() => {
    // Len ak sme na cudzom profile (nie na vlastnom)
    if (!viewedUserId || !user || viewedUserId === user.id) return;
    if (activeModule !== 'user-profile') return;

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const currentIdentifier = currentPath.startsWith('/dashboard/users/') 
      ? currentPath.replace('/dashboard/users/', '').split('/')[0] 
      : null;

    // Skús získať slug z cache alebo z viewedUserSummary
    let userSlug: string | null | undefined = viewedUserSlug;
    
    // Ak nemáme slug, skús ho získať z viewedUserSummary
    if (!userSlug && viewedUserSummary?.slug) {
      userSlug = viewedUserSummary.slug;
    }
    
    // Ak nemáme slug, skús ho získať z cache
    if (!userSlug) {
      const cachedUser = getUserProfileFromCache(viewedUserId);
      if (cachedUser?.slug) {
        userSlug = cachedUser.slug;
      }
    }
    
    // Pomocná funkcia na aktualizáciu URL so slugom
    const updateUrlWithSlug = (slug: string) => {
      if (typeof window === 'undefined') return;
      
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/dashboard/users/')) return;
      
      const currentIdentifier = currentPath.replace('/dashboard/users/', '').split('/')[0];
      
      // Ak je aktuálny identifikátor číslo (ID) a máme slug, aktualizovať URL
      if (/^\d+$/.test(currentIdentifier) && currentIdentifier !== slug) {
        // Kanonizácia mení IBA identifikátor v ceste – query aj fragment patria
        // stránke, na ktorú sa práve pozeráme (`?tab=`, `?offer=`,
        // `?highlight=`), takže idú so sebou. Query sa tu zachovávalo už
        // predtým, fragment nie.
        const newUrl = profileUrlKeepingQuery(`/dashboard/users/${slug}`);

        // Aktualizovať URL bez reloadu - window.history.replaceState je konzistentnejšie
        window.history.replaceState(window.history.state, '', newUrl);
        
        // Aktualizovať viewedUserSlug
        setViewedUserSlug(slug);
      }
    };

    // Ak máme slug a URL má ID namiesto slugu, aktualizovať URL
    if (userSlug) {
      updateUrlWithSlug(userSlug);
    } else {
      // Fallback: Ak nemáme slug, načítať profil z API
      // Len ak URL má ID (nie slug), načítať profil z API
      if (currentIdentifier && /^\d+$/.test(currentIdentifier)) {
        const controller = new AbortController();

        const loadProfileFromApi = async () => {
          const result = await fetchUserProfile(
            endpoints.dashboard.userProfile(viewedUserId),
            controller.signal,
          );
          if (result.status === 'not_found') {
            setViewedUserNotFound(true);
            return;
          }
          // Iná chyba ani zrušenie tu nič nemenia – ide len o tvar adresy;
          // profil (aj chybu) zobrazuje SearchUserProfileModule.
          if (result.status !== 'ok') return;
          const { data } = result;

          // Uložiť do cache
          setUserProfileToCache(data.id, data);

          // Ak má používateľ slug, aktualizovať URL a viewedUserSlug
          if (data.slug) {
            setViewedUserSlug(data.slug);
            updateUrlWithSlug(data.slug);
          }
        };

        void loadProfileFromApi();

        return () => {
          controller.abort();
        };
      }
    }
  }, [viewedUserId, user, activeModule, viewedUserSlug, viewedUserSummary]);

  return {
    viewedUserId,
    setViewedUserId,
    viewedUserSlug,
    setViewedUserSlug,
    viewedUserSummary,
    setViewedUserSummary,
    viewedUserNotFound,
    viewedUserLoadError,
    retryViewedUserLoad,
    initialRightItemAppliedRef,
  };
}
