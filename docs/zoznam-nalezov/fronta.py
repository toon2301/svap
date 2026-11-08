# -*- coding: utf-8 -*-
"""Poradie prác pre kolegu (dávky) a voliteľný stav ich riešenia.

Poradie je návrh agenta (malé, lokálne zmeny s nízkym rizikom, ktoré nemenia súbory nad 500 riadkov); schvaľuje majiteľ. Od 6. 11. 2026 smie
kolega robiť aj nálezy PRED NASADENÍM a HNEĎ (predtým len PO NASADENÍ), preto fronta smie obsahovať ktorýkoľvek otvorený nález. Súbor sa
upravuje len pri zmene poradia alebo keď je nález hotový:
- keď je nález hotový, záznam sa odstráni odtiaľto a nález sa presunie do `hotove_dalsie.DONE_SINCE_DALSIE`;
- stav riešenia je voliteľný: ak sa zapíše, vyplnia sa spolu `kto`, `stav` (`STAV_ROZROBENE` alebo `STAV_CAKA`) a `od` (dátum).

Od 5. 11. 2026 sa polia `kto`, `stav` a `od` pri práci kolegu nevyplňujú: v kóde pracuje vždy len jeden a začiatok aj koniec práce
hlási majiteľ (postup je v `README.md`, časť „Postup s kolegom“). Záznam bez týchto polí sa v zozname zobrazí ako „nesleduje sa“,
nie ako voľný, lebo kým kolega pracuje, zoznam o tom nevie. Polia a ich kontrola ostávajú pre prípad, že by sa postup zmenil.

Dávky K1 až K14 sú hotové a zlúčené (K6 až K14 sú v `hotove_dalsie.py`): K8 (mapovanie nálezov 275, 274 a 276) sa robila na dva razy,
PR #237 a #238 (druhé kolo sa volalo K9), dávka drobných opráv (193, 279, 277, 281) išla ako K10 (PR #239), K11 (PR #241) bola o fotkách
na frontende (279, 293, 291 a 292, ktorý je PO NASADENÍ a majiteľ ho do dávky zaradil 7. 11. 2026), K12 (PR #242) o súkromí a CI (282, 246,
194 a časť 204), K13 (PR #244) o starom endpointe fotiek ponúk, zámkoch pri zmazaní účtu, CI prekladoch a toastoch (301, 296, 297 a časť
302) a K14 (PR #245) o zámku závislostí, obnove prihlásenia a prechodných stavoch Nastavení (244, 286 a časť 245). Dávky K15 a K16
navrhol agent 8. 11. 2026 podľa ručných testov majiteľa po K14: K15 začína nálezom HNEĎ 318 (push na iPhone, najprv diagnostika) a
pokračuje nálezmi PRED NASADENÍM z ručných testov, K16 sú zvyšky po 286. Dávky K17 a K18 sú pôvodne navrhnuté dávky zo 6. 11. 2026 (24,
22, 23, 26 a 247, 248, 250, 256) z nálezov PO NASADENÍ; v zozname sa volali K9 a K10, potom K13 a K14 a naposledy K15 a K16, no tie
označenia sa použili na iné dávky. Nález 302 (osem `alert()` v súboroch nad 500 riadkov, rozhodnutie R31) a zvyšok nálezu 245 (overenie
v logoch Railway, prípadný `api.ts` s výnimkou) čakajú na majiteľa, preto nie sú v poradí. Kľúč `davka` je len označenie dávky pre
čitateľa. Poradie dávok určuje majiteľ (`SCHVALENE`). V poradí idú všetky nálezy HNEĎ a PRED NASADENÍM pred nálezmi PO NASADENÍ. Výnimku
schvaľuje majiteľ a zapíše sa slovom „Výnimka“ do textu `preco` pri nálezu (naposledy 292 v K11).

Kontrola v `model.py` zlyhá, ak záznam odkazuje na nález, ktorý už nie je otvorený (je hotový, zatvorený alebo neexistuje), takže
zoznam nemôže ticho zastarať.
"""

SCHVALENE = ('Majiteľ 6. 11. 2026 schválil striedanie 2 : 1 (dve dávky kolegu, potom jedna vetva agenta; kolega smie robiť aj nálezy PRED '
             'NASADENÍM a HNEĎ; majiteľ môže pomer dočasne zmeniť, napr. na 1 : 1). K6 až K14 sú hotové; vetvy agenta 167, 168, 169 a 170 sú len '
             'zoznam (majiteľ 7. 11. 2026: opravy nálezov agentom sa odkladajú, kým majiteľ nedá vedieť). Dávky K15 a K16 navrhol agent '
             '8. 11. 2026 (najprv nález HNEĎ 318 a nálezy PRED NASADENÍM z ručných testov po K14) a čakajú na schválenie; dávky K17 a K18 sú '
             'staršie návrhy z nálezov PO NASADENÍ.')

STAV_ROZROBENE = 'rozrobené'
STAV_CAKA = 'čaká na zlúčenie'
STAVY = (STAV_ROZROBENE, STAV_CAKA)

# Záznam: dict(n='221', co='krátky popis', preco='prečo je v dávke a v tomto poradí'); voliteľne navyše davka='K13' a
# kto='kolega', stav=STAV_ROZROBENE, od='3. 11. 2026' (od 5. 11. 2026 sa nepoužíva). ID je reťazec (číslo nálezu alebo ID z
# registra, napr. 'APP-05').
FRONTA = [
    dict(n='318', davka='K15',
         co='Push upozornenia na správy na iPhone neprichádzajú po nasadení K14 (podozrenie na regresiu, príčina nepotvrdená).',
         preco='HNEĎ. Najprv diagnostika bez zmeny kódu: majiteľ pošle z logov Railway len počty a `skipped_reason` z riadku '
               '`message_push_delivery_summary`; podľa neho sa určí, či je príčina v aplikácii, v nastavení (rollout, potlačenie '
               'prítomnosťou, zrušený odber) alebo na zariadení. Zámok závislostí (244) balíky pre push podľa rekonštrukcie nepohol. '
               'Oprava až po výsledku.'),
    dict(n='320', davka='K15',
         co='Zmena hesla: na iPhone s tmavým systémom sú polia čierne na svetlej karte (`ResetPasswordClient.tsx`).',
         preco='Vzhľadová vec PRED NASADENÍM, potvrdená screenshotom; jeden súbor (350 riadkov) a jedna príčina (polia bez `bg-white '
               'text-gray-900`); rovnakú kontrolu urobiť na `forgot-password`, `verify-email` a `delete-account`.'),
    dict(n='306', davka='K15',
         co='`getApiErrorMessage` ukáže surový „Network Error“ z axiosu skôr než preložený záložný text.',
         preco='Malý súbor `lib/apiError.ts`; hlášky pri offline sú súčasť 319, preto idú spolu.'),
    dict(n='319', davka='K15',
         co='Upozornenia: pri vypnutom internete sa prepínač Správ prepne bez chybovej hlášky a stav ostane po pripojení.',
         preco='Najprv mapovanie (ktorý prepínač: Správy majú vrátenie späť aj chybu, ostatné sú len lokálne, nález 321); texty chýb v '
               '`useNotificationPreferences.ts` (123 riadkov) a `usePushMessagesPreference.ts` (288 riadkov) sú bez diakritiky a bez '
               'prekladu.'),
    dict(n='308', davka='K16',
         co='Upozornenia: varovanie pri uloženom „Zapnuté“ a blokovanom push po načítaní posunie obsah (28 px desktop, 68 px '
            'mobil).',
         preco='Zvyšok po 286 (K14); `usePushMessagesPreference.ts` a `PushMessagesStatus.tsx` majú do 288 riadkov; chybu odvodiť '
               'počas renderu.'),
    dict(n='309', davka='K16',
         co='Sledovanie na mobile: odznak „0 / 5“ počas načítavania a po načítaní nahradí tlačidlo hláška o limite (CLS 0,033).',
         preco='Zvyšok po 286; `OfferWatchMobileListScreen.tsx` má 151 riadkov.'),
    dict(n='310', davka='K16',
         co='Desktopové Sledovanie ukáže kostru hneď a tá problikne pred prázdnym stavom.',
         preco='Zvyšok po 286: použiť `DelayedSkeleton` z K14, rovnako ako pri mobile (309).'),
    dict(n='311', davka='K16',
         co='`useIsMobile()` začína ako „desktop“; ďalšie vetvy `ModuleRouter` môžu mať prázdny prvý snímok.',
         preco='Najprv mapovanie, ktoré moduly (hypotéza kolegu, nezmerané); `ModuleRouter.tsx` má 439 riadkov, takže nové vetvy nesmú '
               'súbor posunúť nad 500.'),
    dict(n='312', davka='K16',
         co='Blokovaní používatelia: chyba načítania nemá `role=alert`.',
         preco='PO NASADENÍ, no jeden riadok v `BlockedUsersModule.tsx` (279 riadkov), ktorý K14 práve upravovala; ide na koniec dávky '
               'za nálezy PRED NASADENÍM.'),
    dict(n='24', davka='K17', co='`setHighlightedSkillId(null)` necháva hodnotu v `sessionStorage` (priame volania setteru namiesto '
                                '`clearHighlighting()`).',
         preco='Zoznam majiteľa ho vedie ako pravdepodobne reálnu chybu; hook `useDashboardHighlighting.tsx` má 346 riadkov. Najprv overiť, '
               'ktoré volania nulujú surový setter, a doplniť test.'),
    dict(n='22', davka='K17', co='`useDashboardHighlighting` prijíma 0, −3 a 1,5 ako ID zvýraznenia; handler upozornení vyžaduje celé číslo od 1.',
         preco='Malá validácia v tom istom hooku ako 24, jeden súbor a test.'),
    dict(n='23', davka='K17', co='Nedosiahnuteľná vetva `null` v `parseRequestsTargetUrl`.',
         preco='Odstránenie mŕtveho kódu v krátkom súbore `requestsRouting.ts` (56 riadkov); správanie stráži existujúci test.'),
    dict(n='26', davka='K17', co='Nadbytočný alebo nedosiahnuteľný kód na viacerých miestach (napr. `setIsSearchOpen(false)`, zdvojené '
                                '`?? null`, zbytočné `Number.isFinite`; konkrétne miesta si kolega overí).',
         preco='Upratanie malých miest v navigačných hookoch; každé miesto vo vlastnom commite, súbory nad 500 riadkov sa nemenia '
               '(`DashboardContent.tsx` má 711).'),
    dict(n='247', davka='K18', co='Klik na položku histórie sa pri písaní ruší až po odoslaní hľadania, nie hneď.',
         preco='Dohrávka po APP-05 (K4): zrušiť rozbehnutý klik hneď pri zmene textu, test do `useRecentSearches.race.test.tsx`.'),
    dict(n='248', davka='K18', co='Zrušené textové hľadanie nezresetuje `isRevalidating` (v UI nedosiahnuteľné).',
         preco='Ten istý súbor `useSearchApi.tsx` (223 riadkov) ako 247; riešiť spolu.'),
    dict(n='250', davka='K18', co='Chýba test resetu súhrnu profilu pri otvorení profilu z vyhľadávania (`useDashboardNavigation.tsx:289`).',
         preco='Len test; `useDashboardNavigation.tsx` má 514 riadkov, takže sa súbor nemení.'),
    dict(n='256', davka='K18', co='`FeedLikersDialog.tsx` otvára profil vlastným eventom namiesto spoločného `openUserProfile()`.',
         preco='Jeden malý súbor (209 riadkov), vzor je v `feedProfileNavigation.ts`; doplniť test rovnako ako pri ostatných miestach.'),
]
