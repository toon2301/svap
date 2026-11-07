# -*- coding: utf-8 -*-
"""Roztriedenie pôvodných otvorených položiek 1–172 (zoznam z druhej konverzácie).

Kľúč je číslo nálezu, hodnota je (skupina, dopad, zložitosť, balík, poznámka, rozhodnutie). Text „Čo“ sa berie
z `povodny_zoznam.json`; tu je len roztriedenie a poznámka. Po oprave sa položka z `ORIG_OPEN` odstráni a zapíše
sa do `stav.DONE_SINCE`.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

ORIG_OPEN = {
    # P1 – viditeľné a latentné chyby
    8: (A, N, ES, 'Navigácia – drobnosti', 'Kozmetika: prázdne zvýraznenie ľavého menu na jednej obrazovke.', None),
    13: (P, S_, ES, 'Navigácia a Späť',
         'V iPhone PWA nie je prehliadačové Späť. Bez šípky v hornej lište plnostránkového detailu príspevku '
         '(vstup z upozornenia alebo odkazu) používateľ uviazne.', None),
    14: (P, S_, EM, 'Navigácia a Späť',
         'Šípka v konverzácii pridáva záznam do histórie namiesto kroku späť. Nález 160 to vyriešil len pre '
         'konverzáciu otvorenú z profilu, ostatné vstupy ostávajú.', None),
    17: (P, S_, ES, 'Žiadosti',
         'Obyčajné opätovné kliknutie na tú istú položku menu neočakávane zmení údaje (všetko sa označí ako prečítané).', None),
    51: (A, N, EM, 'Zvýraznenie ponuky',
         'Zvyšok po oprave 104; po oprave 49 / 105 (service worker) sa tvrdé navigácie takmer nevyskytujú.', None),
    57: (A, N, ES, 'Mazanie ponuky',
         'Prakticky nedosiahnuteľné (pomocné funkcie nevyhadzujú výnimky); stačí spresniť spracovanie chýb.', None),
    81: (P, S_, EM, 'Profil a identita',
         'Slug zložený len z číslic sa na ≥ 9 miestach číta ako ID používateľa, takže profil môže ukázať iného '
         'človeka. Pri verejnom štarte si ľubovoľné meno (napr. „12345“, firma „2024“) vyberie ktokoľvek. '
         'Oprava: zakázať číselné slugy (predpona `u-`) + migrácia existujúcich, alebo uprednostniť slug vo frontende.',
         'ROZHODNUTIE R3'),
    91: (A, N, EM, 'Nástenka a zdieľanie',
         'ČIASTOČNE HOTOVÉ: frontendová časť (záložný obrázok) je hotová v K7 (PR #235, zlúčené 7. 11. 2026, commit `0c89587f`): '
         '`BlurredContainImage` má voliteľný `onError`, ktorý hlási aj zlyhanie chráneného obrázka, a zdieľaná karta '
         '(`feed/SharedContentPreviewCard.tsx`) po zlyhanom náhľade ukáže náhradu: ponuka „Bez fotografie“, portfólio „Bez titulnej '
         'fotky“, zdieľaný príspevok fotku vynechá (ako príspevok bez fotky) a nedostupný zdroj existujúcu ikonu (táto vetva bola predtým '
         'nedosiahnuteľná, mŕtvy kód). Testy: 5 nových v `shared/BlurredContainImage.test.tsx` (blok `onError`) a 6 v '
         '`feed/__tests__/SharedContentPreviewCard.imageError.test.tsx`. OSTÁVA: obnova zastaraného snímku na backende (väčšia vec, od '
         'začiatku určená na neskôr, preto sa nález presúva do PO NASADENÍ) a manuálny test majiteľa (zdieľaná ponuka, ktorej sa potom '
         'zmaže fotka), ktorý sa 7. 11. 2026 nedal urobiť kvôli nálezu 274. Rovnaké chýbajúce `onError` majú ďalšie miesta (nález 279).', None),
    92: (P, S_, EM, 'Zdieľanie a obrázky',
         'iPhone: okná zdieľania sa otvárajú orezané hore (hypotéza `90vh` vs `dvh`, neoverené). Je to prvé, '
         'čo používateľ vidí pri zdieľaní; treba overiť na zariadení. Rovnaký vzor je v 36 (lightboxy).', None),
    107: (A, N, EM, 'Údaje a cache',
          'Zastaraná odpoveď v lete môže prepísať novšie ponuky; nízke riziko, zdieľaný modul PC + mobil.', None),
    141: (A, N, EM, 'Profil a identita',
          'Druhá polovica nálezu: stavy „prebieha“ žijú v module, nie v profile; zriedkavé. Prvá polovica opravená.', None),
    142: (A, N, ES, 'Výkon a plynulosť', 'Záblesk „Načítavam profil…“ (~50 ms) po prepnutí cez číselné ID.', None),
    143: (A, S_, EM, 'Výkon a plynulosť',
          'Na pomalej sieti pôsobí vstup na vlastný profil z Nástenky ako „mŕtve“ ťuknutie (~0,8 s). Premerať '
          'na novom serveri, kde bude latencia iná.', None),
    # P2 – väčšie balíky
    46: (A, S_, EL, 'Funkcie – väčšie balíky',
         'Mobil: detail príspevku nemá vlastnú adresu, F5 ho zavrie. Rozhodnuté odložiť (je to funkcia).', None),
    70: (A, S_, EL, 'Funkcie – väčšie balíky',
         'Podľa zoznamu majiteľa (príloha D) niektoré upozornenia stále vedú na staršiu z týchto dvoch obrazoviek. Postup: najprv '
         'zmapovať všetky vstupné body, ktoré naň ešte vedú, presmerovať ich a ak sa dá, starý komponent úplne zrušiť. Súvisí s 13 a 46.', None),
    74: (P, S_, EL, 'Upozornenia na zmazaný obsah',
         'Rozšíriť kontrolu existencie cieľa (oprava 111) na všetky typy upozornení: portfólio, príspevky, '
         'komentáre, pozvánky do skupiny (dnes mŕtve tlačidlo bez hlášky). Backend aj frontend naraz.',
         'ROZHODNUTIE R4'),
    93: (A, N, EM, 'Upratovanie a architektúra',
         '`DashboardContent.tsx` má dnes 711 riadkov (limit 500); rozhodnúť: zoskupiť vstupy / ďalší hook / prijať (=TECH-01).', None),
    94: (A, N, EM, 'Upratovanie a architektúra', 'Veľmi široké rozhrania (49 / 88 vstupov); riešiť spolu s 93.', None),
    125: (A, N, EM, 'Navigácia – scroll', 'Pamätanie scrollu len po návrate z recenzií.', None),
    129: (A, N, EM, 'Navigácia – scroll', 'Obnova scrollu pri viackrokovom skoku v histórii.', None),
    132: (A, N, ES, 'Výkon a plynulosť', 'Sledovanie: najprv kostra, potom zoznam „vyskočí“.', None),
    135: (A, N, ES, 'iPhone overenia',
          'Neoverené: systémové gesto späť + naša animácia = možná dvojitá animácia; pravdepodobne prijateľné.', None),
    148: (A, S_, EL, 'Upratovanie a architektúra',
          'Spoločný počítaný zámok scrollu pre ~13 komponentov (trieda chýb 116 / 147); návrh balíka. Do tej doby '
          'držať E2E stráž, že sa zámok vždy uvoľní.', None),
    # P3 – okrajové správanie
    5: (A, N, ES, 'Navigácia – drobnosti', '`SettingsDetailHeader`: udalosť klikom presakuje do `onBack` (8 obrazoviek).', None),
    6: (A, N, ES, 'Navigácia – drobnosti', 'Rozhodnúť spolu s 5.', None),
    7: (A, N, EM, 'Navigácia – drobnosti', 'Chvost histórie po šípke z `/edit`, zastaraná adresa.', None),
    10: (A, N, ES, 'Upratovanie a architektúra', 'Vedľajšie efekty vo vnútri updatera stavu (`handleUserUpdate`).', None),
    11: (A, N, EM, 'Navigácia – drobnosti', 'Desktopový overlay `goForward` vykreslí plný detail s novým `<main>`.', None),
    15: (A, N, EM, 'Navigácia – drobnosti', 'Desktopový vyhľadávací panel nie je route (produktové rozhodnutie).', None),
    18: (A, N, ES, 'Pravdepodobne už vyriešené',
         'OVERIŤ A ZATVORIŤ: hlavička konverzácie mimo prvej stránky zoznamu sa teraz dohľadá cez detail '
         '(`useMobileMessagePeer` → `listMessages`), čo prinieslo nález 161. Overené čítaním kódu 26. 10. 2026, '
         'chýba manuálny test.', None),
    21: (A, N, ES, 'Navigácia – drobnosti',
         'Overené 6. 11. 2026 (agent): `from=push` ani `#top` sa v kóde (frontend, `public/sw.js` a backend) nikde nevytvára, takže '
         'zatiaľ neexistuje adresa, ktorú by ochrana odmietla. Návrh: zatvoriť rozhodnutím, alebo len pridať test, že ochrana tieto '
         'tvary odmietne. Zdroj: zoznam majiteľa (príloha D).', None),
    22: (A, N, ES, 'Navigácia – drobnosti', 'Nezhoda pravidiel pre ID zvýraznenia (0 / −3 / 1,5).', None),
    23: (A, N, ES, 'Upratovanie a architektúra', 'Nedosiahnuteľná vetva `null` v `parseRequestsTargetUrl`.', None),
    24: (A, N, ES, 'Navigácia – drobnosti',
         'Zoznam majiteľa (príloha D) to vedie ako pravdepodobne reálnu chybu: vynuluje sa len stav v pamäti, nie zápis v '
         '`sessionStorage`, takže sa neskôr môže znova vytiahnuť stará zvýraznená karta. Overené 6. 11. 2026 (agent): hook '
         '`useDashboardHighlighting.tsx` (346 riadkov) má `clearHighlighting()` aj `clearPersistedHighlight()`, ktoré zálohu mažú; '
         'surový setter ju nemaže, takže chyba platí len pre volania s priamym `setHighlightedSkillId(null)`. Súvisí s 51 (zvyšok po '
         'oprave 104).', None),
    27: (A, N, ES, 'Navigácia – drobnosti', 'Popstate na cudzie `/edit` sa kanonizuje na adresu vlastného profilu.', None),
    28: (A, N, ES, 'Navigácia – drobnosti', '`offerId: 0` zamaskuje platné `highlightId`; `goToMyProfile` ignoruje `offerId`.', None),
    29: (A, N, ES, 'Upratovanie a architektúra', 'Nadbytočné priame zápisy do `sessionStorage` v handleroch.', None),
    38: (A, N, ES, 'Navigácia – drobnosti', 'Záložka vlastného profilu závisí od identity objektu `user` (najprv overiť reálny dopad).', None),
    40: (A, N, EM, 'Navigácia – drobnosti', 'Zvýraznenie na 10–70 ms zhasne a vráti sa (efekt číta starú adresu).', None),
    53: (A, N, EM, 'Výkon a plynulosť',
         '`useMobileMessagePeer` beží aj na desktope: zbytočné požiadavky a druhý POST pri otvorení konverzácie '
         '(zaťažuje aj rate limit).', None),
    73: (A, N, ES, 'Navigácia – drobnosti', 'Chýbajúce ID príspevku sa berie ako zmazaný príspevok (spevnenie).', None),
    79: (A, N, ES, 'Výkon a plynulosť', 'Inline šípka vzniká pri každom vykreslení (len pozorovanie).', None),
    86: (A, N, ES, 'Navigácia – drobnosti', '`goToUserProfile` očakáva reťazec; nereťazec by vyhodil TypeError.', None),
    87: (A, N, ES, 'Navigácia – drobnosti', 'Handlery neukladajú modul do `localStorage` (pravdepodobne zámer).', None),
    104: (A, N, EM, 'Údaje a cache', 'Zastaraná vybraná karta po odloženom zmazaní fotky.', None),
    106: (A, N, ES, 'Výkon a plynulosť', 'Mobilné `initialTags || []` = nové pole pri každom vykreslení (neoverené).', None),
    124: (A, N, ES, 'Navigácia – drobnosti', 'Po F5 router prepíše `history.state` (pozorovanie).', None),
    152: (A, N, EM, 'Upratovanie a architektúra', 'Audit `Sidebar` / `RightSidebar` (`AnimatePresence`): držia globálne efekty počas výstupu?', None),
    # P4 – výkon
    62: (A, N, ES, 'Výkon (memoizácia)', 'Handler upozornení sa vytvára pri každom vykreslení.', None),
    65: (A, N, ES, 'Výkon (memoizácia)', 'Možno nadbytočné volanie `setHighlightedSkillId` v hooku upozornení.', None),
    76: (A, N, ES, 'Výkon (memoizácia)', 'Rodina 62 pre onboarding.', None),
    88: (A, N, ES, 'Výkon (memoizácia)', 'Poslucháči `useProfileWindowEvents` sa registrujú pri každom vykreslení.', None),
    # P5 – upratovanie a kozmetika
    3: (A, N, ES, 'Upratovanie a architektúra', 'Nadbytočný kód pri parsovaní cieľov upozornení.', None),
    26: (A, N, ES, 'Upratovanie a architektúra', 'Nadbytočný / nedosiahnuteľný kód na viacerých miestach.', None),
    30: (A, N, ES, 'Upratovanie a architektúra', 'Mojibake v komentároch `DashboardContent.tsx`.', None),
    36: (P, N, EM, 'Zdieľanie a obrázky',
         'Majiteľ 6. 11. 2026: všetky vzhľadové veci sú pred nasadením. Tri lightboxy s `max-h-[calc(100vh-2rem)]` patria do rodiny '
         '`vh` z nálezu 92 a riešia sa s ním; zvyšok (lint v `SearchLayout`, mŕtve `max-lg:` triedy, `min-h-screen` vo '
         '`FeedPostCreateScreen`) sú drobnosti.', None),
    39: (A, N, ES, 'Upratovanie a architektúra', 'Duplicitná kontrola „vlastný profil“; `/dashboard/messages/0`.', None),
    54: (A, N, ES, 'Upratovanie a architektúra', 'Mŕtvy kód v `useMobileMessagePeer`.', None),
    55: (A, N, ES, 'Upratovanie a architektúra', '`useOwnProfileOfferActions` vracia surový setter kvôli dialógu.', None),
    56: (A, N, ES, 'Upratovanie a architektúra', 'Zdvojená logika pri mazaní vlastnej ponuky.', None),
    61: (A, N, ES, 'Upratovanie a architektúra', 'Texty „Vymazať“ vs „Odstrániť“ nie sú jednotné.', None),
    64: (A, N, ES, 'Upratovanie a architektúra', 'Zbytočná ochrana `typeof window`; komentáre bez diakritiky.', None),
    75: (A, N, ES, 'Upratovanie a architektúra', 'Nadbytočné ochrany v štyroch hookoch.', None),
    77: (A, N, ES, 'Upratovanie a architektúra', 'Komentáre bez diakritiky a anglické komentáre.', None),
    82: (A, N, ES, 'Upratovanie a architektúra', 'Nadbytočný kód v dvoch hookoch.', None),
    83: (A, N, ES, 'Upratovanie a architektúra', 'Komentáre bez diakritiky a mojibake pri popstate efekte.', None),
    85: (A, N, ES, 'Upratovanie a architektúra', 'Nadbytočný kód v `useProfileWindowEvents`.', None),
    89: (A, N, ES, 'Upratovanie a architektúra', '8 pokazených riadkov v `DashboardContent.tsx`.', None),
    95: (A, N, ES, 'Upratovanie a architektúra', 'Zvláštne odsadenie detí `FeedPostOverlayProvider`.', None),
    96: (A, N, ES, 'Upratovanie a architektúra', 'Zvyšky v súboroch kroku 9.', None),
    97: (A, N, ES, 'Upratovanie a architektúra', 'Nadbytočný kód v presunutom JSX.', None),
    105: (A, N, EM, 'Upratovanie a architektúra', '`SkillDescriptionModal.tsx` má 502 riadkov (=TECH-09).', None),
    133: (A, N, ES, 'Upratovanie a architektúra', 'Riadok „Sledovanie“ volá `onClose?.()` zbytočne.', None),
    138: (A, N, EM, 'Upratovanie a architektúra', 'Kozmetika modulu cudzieho profilu (duplicitné zoznamy props).', None),
    145: (A, N, ES, 'Upratovanie a architektúra', 'Nadbytočné príkazy v dátovom hooku cudzieho profilu.', None),
    149: (A, N, ES, 'Navigácia – drobnosti', 'Menu meny vo formulári prežije výstup obrazovky Sledovanie (~0,5 s).', None),
    156: (A, N, EM, 'Upratovanie a architektúra', 'Pozorovania pre všetky riadky Nastavení.', None),
    # P6 – nástroje, testy, repozitár
    4: (A, N, EM, 'Nástroje a testy', '`tsc` nekontroluje testy; zapnutie môže odhaliť veľa chýb.', None),
    16: (A, N, ES, 'Nástroje a testy',
         'Testovací účet drží 20+ vlastných príspevkov. Na novom serveri nebudú testovacie účty; riešené cez N4 (staging).', None),
    19: (A, N, ES, 'Nástroje a testy', 'Dva E2E testy majú vlastné kópie `recordMainInstance`.', None),
    20: (A, N, ES, 'Nástroje a testy', 'E2E S6 / S7 sa nikdy nespustili (treba `E2E_PEER_SLUG` a súhlas používateľa).', None),
    31: (P, S_, ES, 'Spoľahlivosť CI a testov',
         'Nestabilné Jest testy (časové limity). Ak nasadenie čaká na zelené CI, náhodné zlyhanie zablokuje '
         'vydanie. Návrh: `asyncUtilTimeout` + `jest.setTimeout`, len testové súbory.', None),
    32: (A, N, ES, 'Nástroje a testy',
         'Cudzie súbory v repozitári. Rozšírené 26. 10. 2026: v koreni sú navyše commitnuté `cd`, `git`, `main`, '
         '`out)`, `.mp4`, `frontend-build.zip`, dva prázdne WinRAR zipy, `Dockerfile.backup`, `test-autosave.html`, '
         '`linecount*`. Tajomstvá som v repozitári ani v histórii nenašiel. Doplnené 29. 10. 2026 (vetva 152): v `backend/` sú sledované aj '
         'štyri prázdne súbory `list`, `x.id`, `{` a `r.json())`, v koreni druhé video `ezgif.com-video-to-gif-converter-desktop.mp4` (0,6 MB) '
         'a `.coverage` (98 KB). Doplnené 5. 11. 2026 (vetva 163, nahlásil kolega pri nálezu 192): koreňový `.coverage` obsahoval 241 '
         'absolútnych ciest z Windowsu vrátane jedného používateľského adresára vo verejnom repozitári (cesty sa nevypisujú). '
         'Odstránila ho K2 (PR #225, commit `2c7ec137`, so súhlasom majiteľa); v histórii ostáva a pravidlo `**/.coverage` (PR #223) '
         'bráni pridaniu nových takých súborov. Staré reporty `FINAL_RESULTS.md` a `REVIEW_SUMMARY.md` spomínajú zmazaný '
         '`swaply/test_settings.py` (nález 221) a `CLEANUP_REPORT_FINAL.md` spomína `swaply/settings_test.py` (nález 241); patria '
         'pod tento nález. Ostatné časti nálezu 32 sú otvorené.', None),
    34: (A, N, ES, 'Nástroje a testy', 'Zmiešané konce riadkov (`autocrlf`, bez `.gitattributes`).', None),
    35: (A, N, ES, 'Nástroje a testy', 'Zabudnuté nečinné Jest procesy na počítači používateľa (pýtať sa pred ukončením).', None),
    78: (A, N, ES, 'Nástroje a testy', 'Tri TypeScript chyby v teste `onboardingHandlers`.', None),
    110: (A, N, EM, 'Nástroje a testy', 'Chýba E2E Vyhľadávanie → profil → detail → Späť.', None),
    113: (A, N, ES, 'Nástroje a testy', 'Chýba E2E pre nízke okno mobilných Nastavení.', None),
    157: (A, N, ES, 'Nástroje a testy', 'Preteky „Viac počas výstupu“ majú len unit testy.', None),
}

# Pri pôvodných položkách v časti PO NASADENÍ sa poznámka zobrazí len tam, kde pridáva informáciu
# k textu zo zoznamu (inak by sa text len opakoval). V častiach HNEĎ a PRED NASADENÍM sa zobrazí vždy.
KEEP_NOTE = {4, 16, 18, 21, 24, 32, 36, 51, 53, 57, 70, 87, 91, 93, 94, 105, 107, 135, 143, 148}
