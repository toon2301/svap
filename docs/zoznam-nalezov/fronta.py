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
302) a K14 (PR #245) o zámku závislostí, obnove prihlásenia a prechodných stavoch Nastavení (244, 286 a časť 245). Dávky K15 až K17
navrhol agent 8. a 9. 11. 2026 podľa ručných testov majiteľa po K14 a podľa videa z 9. 11.: K15 sú viditeľné chyby (322 a 323 na
obrazovke Popis ponuky na mobile, 320 a 306), K16 začína nálezom 319 a pokračuje zvyškami
po 286 (308 až 310) a K17 dopĺňa zvyšok nálezov PRED NASADENÍM (302 s výnimkou R31, 311) a končí nálezom PO NASADENÍ 312. Nález HNEĎ 318
(push na iPhone) je zatvorený: príčinou bolo nastavenie v Railway (rollout 5 %), nie kód (R33). Nález 321 (kategórie upozornení; R32 (a): pred
štartom) a zvyšok nálezu 245 (overenie v logoch Railway, prípadný `api.ts` s výnimkou) v poradí nie sú: 321 čaká na mapovanie a plán po
etapách, 245 na majiteľa. Dávky PO-A a PO-B sú pôvodne navrhnuté dávky zo 6. 11. 2026 (24, 22, 23, 26 a 247, 248, 250, 256) z nálezov
PO NASADENÍ; v zozname sa volali K9 a K10, potom K13 a K14, K15 a K16, K17 a K18, no tie označenia sa použili na iné dávky, preto
dostanú číslo K až vtedy, keď pôjdu kolegovi (pred ne pribudnú etapy nálezu 321). Kľúč `davka` je len označenie dávky pre čitateľa. Poradie dávok
určuje majiteľ (`SCHVALENE`). V poradí idú všetky nálezy HNEĎ a PRED NASADENÍM pred nálezmi PO NASADENÍ. Výnimku schvaľuje majiteľ a
zapíše sa slovom „Výnimka“ do textu `preco` pri nálezu (naposledy 292 v K11 a 302 v K17).

Každý záznam začína v `preco` slovom JASNÉ (kolega len rýchlo overí, že nález platí, a opraví) alebo NEJASNÉ (kolega najprv mapuje a vráti
zistenie; kód nemení, kým majiteľ nepovie); model to kontroluje (postup od K15, pozri `README.md`).

Kontrola v `model.py` zlyhá, ak záznam odkazuje na nález, ktorý už nie je otvorený (je hotový, zatvorený alebo neexistuje), takže
zoznam nemôže ticho zastarať.
"""

SCHVALENE = ('Majiteľ 6. 11. 2026 schválil striedanie 2 : 1 (dve dávky kolegu, potom jedna vetva agenta; kolega smie robiť aj nálezy PRED '
             'NASADENÍM a HNEĎ; majiteľ môže pomer dočasne zmeniť, napr. na 1 : 1). K6 až K14 sú hotové; vetvy agenta 167, 168, 169, 170 a 171 '
             'sú len zoznam (majiteľ 7. 11. 2026: opravy nálezov agentom sa odkladajú, kým majiteľ nedá vedieť). Dávky K15 až K17 navrhol '
             'agent 8. a 9. 11. 2026 (najprv viditeľné chyby z ručných testov majiteľa po K14 a z videa z 9. 11.) a čakajú na schválenie; '
             'dávky PO-A a PO-B sú staršie návrhy z nálezov PO NASADENÍ a číslo K dostanú, až keď pôjdu kolegovi.')

STAV_ROZROBENE = 'rozrobené'
STAV_CAKA = 'čaká na zlúčenie'
STAVY = (STAV_ROZROBENE, STAV_CAKA)

# Záznam: dict(n='221', co='krátky popis', preco='prečo je v dávke a v tomto poradí'); voliteľne navyše davka='K13' a
# kto='kolega', stav=STAV_ROZROBENE, od='3. 11. 2026' (od 5. 11. 2026 sa nepoužíva). ID je reťazec (číslo nálezu alebo ID z
# registra, napr. 'APP-05').
FRONTA = [
    dict(n='322', davka='K15',
         co='Nová ponuka na mobile: tag pridaný okrúhlym tlačidlom sa nezobrazí (obrazovka Popis ponuky ho zmaže pri prekreslení '
            'rodiča).',
         preco='JASNÉ. Z videa majiteľa 9. 11. 2026; príčina je zmapovaná v kóde a oprava vyskúšaná dočasným testom so skutočným '
               'smerovačom: stabilné vstupy (`initialTags` podľa obsahu a obslužné funkcie so stabilnou identitou) v '
               '`SkillsDescriptionScreen.tsx` (26 riadkov). Smerovač (583 riadkov) a hook obrazovky (638 riadkov) sa nemenia. Viditeľná '
               'chyba pri vytváraní ponuky, preto prvá.'),
    dict(n='323', davka='K15',
         co='Obrazovka Popis ponuky sa neprestajne prekresľuje (slučka efektov s obslužnými funkciami rodiča; v teste 76 prekreslení '
            'po pripojení).',
         preco='JASNÉ. Rovnaká oprava ako 322, preto idú spolu (jeden spoločný commit s oboma číslami); v dev builde overiť, že zmizne '
               'varovanie „Maximum update depth exceeded“. Podobný vzor inde len nahlásiť.'),
    dict(n='320', davka='K15',
         co='Zmena hesla: na iPhone sú polia čierne na svetlej karte (`ResetPasswordClient.tsx`).',
         preco='JASNÉ. Vzhľadová vec PRED NASADENÍM, potvrdená screenshotom; jeden súbor (350 riadkov) a jedna príčina (polia bez '
               '`bg-white text-gray-900`); rovnakú kontrolu urobiť na `forgot-password`, `verify-email` a `delete-account`.'),
    dict(n='306', davka='K15',
         co='`getApiErrorMessage` ukáže surový „Network Error“ z axiosu skôr než preložený záložný text.',
         preco='JASNÉ. Malý súbor `lib/apiError.ts` (68 riadkov) s existujúcim testom; hlášky pri offline (319) idú až v K16 a na túto '
               'zmenu nadväzujú.'),
    dict(n='319', davka='K16',
         co='Upozornenia: pri vypnutom internete sa prepínač Správ prepne bez chybovej hlášky a stav ostane po pripojení.',
         preco='NEJASNÉ (najprv mapovanie). Ktorý prepínač sa testoval: Správy majú vrátenie späť aj chybu, ostatné sú len lokálne '
               '(nález 321, ktorý sa dokončí pred štartom); texty chýb v `useNotificationPreferences.ts` (123 riadkov) a '
               '`usePushMessagesPreference.ts` (288 riadkov) sú bez diakritiky a bez prekladu.'),
    dict(n='308', davka='K16',
         co='Upozornenia: varovanie pri uloženom „Zapnuté“ a blokovanom push po načítaní posunie obsah (28 px desktop, 68 px '
            'mobil).',
         preco='JASNÉ. Zvyšok po 286 (K14); `usePushMessagesPreference.ts` a `PushMessagesStatus.tsx` majú do 288 riadkov; chybu '
               'odvodiť počas renderu.'),
    dict(n='309', davka='K16',
         co='Sledovanie na mobile: odznak „0 / 5“ počas načítavania a po načítaní nahradí tlačidlo hláška o limite (CLS 0,033).',
         preco='JASNÉ. Zvyšok po 286; `OfferWatchMobileListScreen.tsx` má 151 riadkov.'),
    dict(n='310', davka='K16',
         co='Desktopové Sledovanie ukáže kostru hneď a tá problikne pred prázdnym stavom.',
         preco='JASNÉ. Zvyšok po 286: použiť `DelayedSkeleton` z K14, rovnako ako pri mobile (309).'),
    dict(n='302', davka='K17',
         co='Osem natívnych `alert()` v troch súboroch nad 500 riadkov (`SkillsModuleRouter.tsx` 4, `OfferReviewsView.tsx` 3, '
            '`useSkillsDescriptionScreenState.ts` 1) nahradiť toastom s prekladmi.',
         preco='JASNÉ. Výnimka (R31, 9. 11. 2026, udelená majiteľom s podmienkou maximálnej opatrnosti): jednorazová úprava týchto '
               'troch súborov len na výmenu osmich volaní `alert()` za `toast.error` s prekladmi v šiestich jazykoch. Opatrnosť: každé '
               'miesto vo vlastnom commite, pred výmenou test, ktorý bez zmeny padá, v diffe len pridaný import a nahradené riadky, '
               'počet riadkov súborov pred a po vo výsledku dávky a diff týchto súborov porovná agent riadok po riadku pred zlúčením. '
               'Súbory nesmú narásť okrem importu, iná zmena v nich je zakázaná. Pri každom mieste skontrolovať, či chyba letí ďalej a '
               'volajúci neukáže druhé hlásenie. Ide až po K15, lebo 322 a 323 menia vstupy obrazovky vo vedľajšom súbore.'),
    dict(n='311', davka='K17',
         co='`useIsMobile()` začína ako „desktop“; ďalšie vetvy `ModuleRouter` môžu mať prázdny prvý snímok.',
         preco='NEJASNÉ (najprv mapovanie, ktoré moduly). Hypotéza kolegu, nezmerané; `ModuleRouter.tsx` má 439 riadkov, takže nové '
               'vetvy nesmú súbor posunúť nad 500.'),
    dict(n='312', davka='K17',
         co='Blokovaní používatelia: chyba načítania nemá `role=alert`.',
         preco='JASNÉ. PO NASADENÍ, no jeden riadok v `BlockedUsersModule.tsx` (279 riadkov), ktorý K14 práve upravovala; ide na '
               'koniec dávky za nálezy PRED NASADENÍM.'),
    dict(n='24', davka='PO-A',
         co='`setHighlightedSkillId(null)` necháva hodnotu v `sessionStorage` (priame volania setteru namiesto '
            '`clearHighlighting()`).',
         preco='NEJASNÉ (najprv overiť, ktoré volania nulujú surový setter). Zoznam majiteľa ho vedie ako pravdepodobne reálnu chybu; '
               'hook `useDashboardHighlighting.tsx` má 346 riadkov. Najprv overiť, ktoré volania nulujú surový setter, a doplniť test.'),
    dict(n='22', davka='PO-A',
         co='`useDashboardHighlighting` prijíma 0, −3 a 1,5 ako ID zvýraznenia; handler upozornení vyžaduje celé číslo od 1.',
         preco='JASNÉ. Malá validácia v tom istom hooku ako 24, jeden súbor a test.'),
    dict(n='23', davka='PO-A',
         co='Nedosiahnuteľná vetva `null` v `parseRequestsTargetUrl`.',
         preco='JASNÉ. Odstránenie mŕtveho kódu v krátkom súbore `requestsRouting.ts` (56 riadkov); správanie stráži existujúci test.'),
    dict(n='26', davka='PO-A',
         co='Nadbytočný alebo nedosiahnuteľný kód na viacerých miestach (napr. `setIsSearchOpen(false)`, zdvojené `?? null`, '
            'zbytočné `Number.isFinite`; konkrétne miesta si kolega overí).',
         preco='NEJASNÉ (kolega najprv vyberie konkrétne miesta). Upratanie malých miest v navigačných hookoch; každé miesto vo '
               'vlastnom commite, súbory nad 500 riadkov sa nemenia (`DashboardContent.tsx` má 711).'),
    dict(n='247', davka='PO-B',
         co='Klik na položku histórie sa pri písaní ruší až po odoslaní hľadania, nie hneď.',
         preco='JASNÉ. Dohrávka po APP-05 (K4): zrušiť rozbehnutý klik hneď pri zmene textu, test do '
               '`useRecentSearches.race.test.tsx`.'),
    dict(n='248', davka='PO-B',
         co='Zrušené textové hľadanie nezresetuje `isRevalidating` (v UI nedosiahnuteľné).',
         preco='JASNÉ. Ten istý súbor `useSearchApi.tsx` (223 riadkov) ako 247; riešiť spolu.'),
    dict(n='250', davka='PO-B',
         co='Chýba test resetu súhrnu profilu pri otvorení profilu z vyhľadávania (`useDashboardNavigation.tsx:289`).',
         preco='JASNÉ. Len test; `useDashboardNavigation.tsx` má 514 riadkov, takže sa súbor nemení.'),
    dict(n='256', davka='PO-B',
         co='`FeedLikersDialog.tsx` otvára profil vlastným eventom namiesto spoločného `openUserProfile()`.',
         preco='JASNÉ. Jeden malý súbor (209 riadkov), vzor je v `feedProfileNavigation.ts`; doplniť test rovnako ako pri ostatných '
               'miestach.'),
]
