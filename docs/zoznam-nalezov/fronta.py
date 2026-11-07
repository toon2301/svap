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

Dávky K1 až K10 sú hotové a zlúčené (K6 až K10 sú v `hotove_dalsie.py`): K8 (mapovanie nálezov 275, 274 a 276) sa robila na dva razy,
PR #237 a #238 (druhé kolo sa volalo K9), a dávka drobných opráv (193, 279, 277, 281) išla ako K10 (PR #239). Dávky K11 a K12 navrhol agent
7. 11. 2026: podľa poradia v časti 2 idú najprv nálezy PRED NASADENÍM (K11 fotky na frontende, K12 súkromie a CI). Dávky K13 a K14 sú
pôvodne navrhnuté dávky zo 6. 11. 2026 (24, 22, 23, 26 a 247, 248, 250, 256) z nálezov PO NASADENÍ; v zozname sa volali K9 a K10, no tie
označenia sa použili na iné dávky, preto ich kolega navrhol premenovať. Kľúč `davka` je len označenie dávky pre čitateľa. Poradie dávok
určuje majiteľ (`SCHVALENE`). V poradí idú všetky nálezy HNEĎ a PRED NASADENÍM pred nálezmi PO NASADENÍ: aj malý nález PO NASADENÍ z
rovnakej oblasti ako nález PRED NASADENÍM (napr. 292 pri fotkách) ide až po nich.

Kontrola v `model.py` zlyhá, ak záznam odkazuje na nález, ktorý už nie je otvorený (je hotový, zatvorený alebo neexistuje), takže
zoznam nemôže ticho zastarať.
"""

SCHVALENE = ('Majiteľ 6. 11. 2026 schválil striedanie 2 : 1 (dve dávky kolegu, potom jedna vetva agenta; kolega smie robiť aj nálezy PRED '
             'NASADENÍM a HNEĎ; majiteľ môže pomer dočasne zmeniť, napr. na 1 : 1). K6 až K10 sú hotové; vetvy agenta 167 a 168 sú len '
             'zoznam (majiteľ 7. 11. 2026: opravy nálezov agentom sa odkladajú, kým majiteľ nedá vedieť). Dávky K11 a K12 navrhol agent '
             '7. 11. 2026 (najprv nálezy PRED NASADENÍM) a čakajú na schválenie; dávky K13 a K14 sú staršie návrhy z nálezov PO NASADENÍ.')

STAV_ROZROBENE = 'rozrobené'
STAV_CAKA = 'čaká na zlúčenie'
STAVY = (STAV_ROZROBENE, STAV_CAKA)

# Záznam: dict(n='221', co='krátky popis', preco='prečo je v dávke a v tomto poradí'); voliteľne navyše davka='K11' a
# kto='kolega', stav=STAV_ROZROBENE, od='3. 11. 2026' (od 5. 11. 2026 sa nepoužíva). ID je reťazec (číslo nálezu alebo ID z
# registra, napr. 'APP-05').
FRONTA = [
    dict(n='279', davka='K11', co='Zlyhaná fotka v karuseli príspevku (a v dlaždici galérie portfólia) je prázdny obdĺžnik; v tmavom režime '
                                'vyzerá ako veľká čierna plocha bez ikony a textu.',
         preco='Ručný test majiteľa 7. 11. 2026 po K10 neprešiel. Malá oprava v `shared/ImageLoadFailed.tsx`: viditeľná náhrada s ikonou '
               'a krátkym textom v šiestich jazykoch + test; rozloženie a počítadlo fotiek ostávajú.'),
    dict(n='293', davka='K11', co='Chyba nahrávania fotky ponuky ukáže natívne `alert()` (`DashboardModals.tsx:113`) a potom ešte toast '
                                '„Ponuku sa nepodarilo uložiť“, hoci ponuka je uložená; v rade nahrávania portfólia chýba toast pri '
                                'neplatnom type súboru.',
         preco='Majiteľ 7. 11. 2026: má sa ukázať toast. `DashboardModals.tsx` má 481 riadkov, takže len náhrada volaní bez nových '
               'blokov; správanie ako v `useSkillSaveHandler.ts` (toast pri chybe fotky, ponuka sa dokončí).'),
    dict(n='291', davka='K11', co='Lightboxy (`ImageLightbox.tsx`, `OfferImageGalleryLightbox.tsx`) nemajú `onError`: zlyhaná fotka na celú '
                                'obrazovku ukáže pokazený obrázok.',
         preco='Dokončenie 279 pre fotku na celú obrazovku; oba súbory majú okolo 340 riadkov; rovnaká viditeľná náhrada ako v 279.'),
    dict(n='282', davka='K12', co='Starý multipart endpoint ponúk (`POST /api/auth/skills/<id>/images/`) ukladá originál aj s polohou GPS.',
         preco='Súkromie: ten istý problém, ktorý 193 uzavrel pri správach. `accounts/views/skills.py` má 450 riadkov; návrh: prejsť cez '
               '`strip_image_metadata` ako avatary a správy.'),
    dict(n='246', davka='K12', co='Súbeh zdieľania a zmazania ponuky alebo položky portfólia končí HTTP 500.',
         preco='Rovnaký mechanizmus ako pri 232 (hotové v PR #230), vzor testu je v `accounts/test/test_feed_share_delete_race.py`. '
               '`portfolio/views.py` má 507 riadkov, preto zámok pri zmazaní patrí do `delete()` modelov, nie do views.'),
    dict(n='194', davka='K12', co='CI nekontroluje zraniteľné závislosti.',
         preco='Nový plánovaný workflow (týždenne) s `pip-audit` a `npm audit --omit=dev` a zoznamom známych výnimiek; nový súbor, žiadny kód '
               'aplikácie.'),
    dict(n='204', davka='K12', co='Zvyšok 204, časť CI: skript `check:used-translation-keys` nie je v CI (po K6 je čistý).',
         preco='Jeden krok v jobe `checks` v `deploy.yml`, aby sa chýbajúce kľúče nevracali; zvyšok nálezu (`ProfileModule.tsx:468`, 563 '
               'riadkov) sa nerieši.'),
    dict(n='292', davka='K13', co='Zápis do `ref.current` počas renderu v `BlurredContainImage.tsx:39`.',
         preco='Malá oprava v 70-riadkovom súbore: zápis presunúť do efektu, rovnako ako v karuseli ponúk (PR #239). Patrí k rodine 279 a 291, '
               'no je PO NASADENÍ, preto ide až po nálezoch PRED NASADENÍM (K11 a K12).'),
    dict(n='24', davka='K13', co='`setHighlightedSkillId(null)` necháva hodnotu v `sessionStorage` (priame volania setteru namiesto '
                                '`clearHighlighting()`).',
         preco='Zoznam majiteľa ho vedie ako pravdepodobne reálnu chybu; hook `useDashboardHighlighting.tsx` má 346 riadkov. Najprv overiť, '
               'ktoré volania nulujú surový setter, a doplniť test.'),
    dict(n='22', davka='K13', co='`useDashboardHighlighting` prijíma 0, −3 a 1,5 ako ID zvýraznenia; handler upozornení vyžaduje celé číslo od 1.',
         preco='Malá validácia v tom istom hooku ako 24, jeden súbor a test.'),
    dict(n='23', davka='K13', co='Nedosiahnuteľná vetva `null` v `parseRequestsTargetUrl`.',
         preco='Odstránenie mŕtveho kódu v krátkom súbore `requestsRouting.ts` (56 riadkov); správanie stráži existujúci test.'),
    dict(n='26', davka='K13', co='Nadbytočný alebo nedosiahnuteľný kód na viacerých miestach (napr. `setIsSearchOpen(false)`, zdvojené '
                                '`?? null`, zbytočné `Number.isFinite`; konkrétne miesta si kolega overí).',
         preco='Upratanie malých miest v navigačných hookoch; každé miesto vo vlastnom commite, súbory nad 500 riadkov sa nemenia '
               '(`DashboardContent.tsx` má 711).'),
    dict(n='247', davka='K14', co='Klik na položku histórie sa pri písaní ruší až po odoslaní hľadania, nie hneď.',
         preco='Dohrávka po APP-05 (K4): zrušiť rozbehnutý klik hneď pri zmene textu, test do `useRecentSearches.race.test.tsx`.'),
    dict(n='248', davka='K14', co='Zrušené textové hľadanie nezresetuje `isRevalidating` (v UI nedosiahnuteľné).',
         preco='Ten istý súbor `useSearchApi.tsx` (223 riadkov) ako 247; riešiť spolu.'),
    dict(n='250', davka='K14', co='Chýba test resetu súhrnu profilu pri otvorení profilu z vyhľadávania (`useDashboardNavigation.tsx:289`).',
         preco='Len test; `useDashboardNavigation.tsx` má 514 riadkov, takže sa súbor nemení.'),
    dict(n='256', davka='K14', co='`FeedLikersDialog.tsx` otvára profil vlastným eventom namiesto spoločného `openUserProfile()`.',
         preco='Jeden malý súbor (209 riadkov), vzor je v `feedProfileNavigation.ts`; doplniť test rovnako ako pri ostatných miestach.'),
]
