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

Dávky K1 až K12 sú hotové a zlúčené (K6 až K12 sú v `hotove_dalsie.py`): K8 (mapovanie nálezov 275, 274 a 276) sa robila na dva razy,
PR #237 a #238 (druhé kolo sa volalo K9), dávka drobných opráv (193, 279, 277, 281) išla ako K10 (PR #239), K11 (PR #241) bola o fotkách
na frontende (279, 293, 291 a 292, ktorý je PO NASADENÍ a majiteľ ho do dávky zaradil 7. 11. 2026) a K12 (PR #242) o súkromí a CI (282, 246,
194 a časť 204). Dávky K13 a K14 navrhol agent 8. 11. 2026: podľa poradia v časti 2 idú najprv nálezy PRED NASADENÍM (K13 zvyšky po K11 a
K12, K14 odolnosť aplikácie a prechody Nastavení). Dávky K15 a K16 sú pôvodne navrhnuté dávky zo 6. 11. 2026 (24, 22, 23, 26 a 247, 248,
250, 256) z nálezov PO NASADENÍ; v zozname sa volali K9 a K10 a potom K13 a K14, no tie označenia sa použili na iné dávky. Kľúč `davka` je
len označenie dávky pre čitateľa. Poradie dávok určuje majiteľ (`SCHVALENE`). V poradí idú všetky nálezy HNEĎ a PRED NASADENÍM pred
nálezmi PO NASADENÍ. Výnimku schvaľuje majiteľ a zapíše sa slovom „Výnimka“ do textu `preco` pri nálezu (naposledy 292 v K11).

Kontrola v `model.py` zlyhá, ak záznam odkazuje na nález, ktorý už nie je otvorený (je hotový, zatvorený alebo neexistuje), takže
zoznam nemôže ticho zastarať.
"""

SCHVALENE = ('Majiteľ 6. 11. 2026 schválil striedanie 2 : 1 (dve dávky kolegu, potom jedna vetva agenta; kolega smie robiť aj nálezy PRED '
             'NASADENÍM a HNEĎ; majiteľ môže pomer dočasne zmeniť, napr. na 1 : 1). K6 až K12 sú hotové; vetvy agenta 167, 168 a 169 sú len '
             'zoznam (majiteľ 7. 11. 2026: opravy nálezov agentom sa odkladajú, kým majiteľ nedá vedieť). Dávky K13 a K14 navrhol agent '
             '8. 11. 2026 (najprv nálezy PRED NASADENÍM) a čakajú na schválenie; dávky K15 a K16 sú staršie návrhy z nálezov PO NASADENÍ.')

STAV_ROZROBENE = 'rozrobené'
STAV_CAKA = 'čaká na zlúčenie'
STAVY = (STAV_ROZROBENE, STAV_CAKA)

# Záznam: dict(n='221', co='krátky popis', preco='prečo je v dávke a v tomto poradí'); voliteľne navyše davka='K13' a
# kto='kolega', stav=STAV_ROZROBENE, od='3. 11. 2026' (od 5. 11. 2026 sa nepoužíva). ID je reťazec (číslo nálezu alebo ID z
# registra, napr. 'APP-05').
FRONTA = [
    dict(n='301', davka='K13', co='Fotka nahraná starým endpointom ponúk (`POST /api/auth/skills/<id>/images/`) je na produkcii neprístupná '
                                '(S3 `AccessDenied`) a v ponuke sa nezobrazí, hoci server vráti 201 a stav `approved`.',
         preco='Ručný test majiteľa po K12. Pravdepodobne nejde o regresiu: endpoint ukladá do `offers/`, kým verejné sú len schválené fotky '
               'z `media/`; UI ho na produkcii nevolá. Návrh podľa R30: v produkcii ho vypnúť, keď je S3 nakonfigurované.'),
    dict(n='296', davka='K13', co='Hromadné `QuerySet.delete()` pri zmazaní účtu (`accounts/account_deletion.py:89–90`) obchádza zámky z 246.',
         preco='Dokončenie 246 v oblasti, ktorú kolega práve robil; `account_deletion.py` má 328 riadkov; zámok riadkov v tej istej '
               'transakcii a test súbehu na PostgreSQL.'),
    dict(n='297', davka='K13', co='`check:missing-translations` nie je v CI.',
         preco='Jeden krok v jobe `checks` vedľa `check:used-translation-keys` (K12); skript je dnes čistý.'),
    dict(n='302', davka='K13', co='Natívne `alert()` ostáva na 14 miestach v 6 súboroch.',
         preco='Šesť volaní v súboroch do 500 riadkov (`useSkillsModals.ts` 3, `DashboardModals.tsx` 2, `TagsSection.tsx` 1) ide na toast '
               's prekladmi; `DashboardModals.tsx` má 485 riadkov, takže ho zmena nesmie posunúť nad 500. Osem volaní v troch súboroch '
               'nad 500 riadkov (`SkillsModuleRouter.tsx`, `OfferReviewsView.tsx`, `useSkillsDescriptionScreenState.ts`) ostáva do '
               'rozhodnutia o výnimke.'),
    dict(n='244', davka='K14', co='Nepripnuté závislosti backendu: build na Railway sa môže zmeniť bez zmeny kódu.',
         preco='Incident z 5. 11. (nález 240) vznikol rovnako. Návrh: zámok závislostí (`constraints.txt` z overeného prostredia), ktorý '
               'používa Railway (`railway.json`), `backend/Dockerfile` aj CI; `requirements.txt` má 31 riadkov a kód aplikácie sa nemení.'),
    dict(n='245', davka='K14', co='Obnova prihlásenia (`POST /api/token/refresh/`) skončí pri chýbajúcom CSRF cookie kódom 403, bez časového '
                                'limitu a bez opakovania.',
         preco='Týka sa hlavne iPhonu (WebKit). Najprv mapovanie; oprava `utils/csrf.ts` (43 riadkov) je možná samostatne a testovateľná '
               'Jestom; `lib/api.ts` má 912 riadkov, takže jeho zmena vyžaduje rozhodnutie majiteľa (výnimka).'),
    dict(n='286', davka='K14', co='Sekcie Nastavení ukážu pri vstupe prechodný stav (kostra, prázdny stav, „Načítavam…“).',
         preco='Vzhľadová vec PRED NASADENÍM; súbory sekcií majú do 343 riadkov; po jednej sekcii v samostatných commitoch (Blokované, '
               'Sledovanie, Súkromie, Upozornenia).'),
    dict(n='24', davka='K15', co='`setHighlightedSkillId(null)` necháva hodnotu v `sessionStorage` (priame volania setteru namiesto '
                                '`clearHighlighting()`).',
         preco='Zoznam majiteľa ho vedie ako pravdepodobne reálnu chybu; hook `useDashboardHighlighting.tsx` má 346 riadkov. Najprv overiť, '
               'ktoré volania nulujú surový setter, a doplniť test.'),
    dict(n='22', davka='K15', co='`useDashboardHighlighting` prijíma 0, −3 a 1,5 ako ID zvýraznenia; handler upozornení vyžaduje celé číslo od 1.',
         preco='Malá validácia v tom istom hooku ako 24, jeden súbor a test.'),
    dict(n='23', davka='K15', co='Nedosiahnuteľná vetva `null` v `parseRequestsTargetUrl`.',
         preco='Odstránenie mŕtveho kódu v krátkom súbore `requestsRouting.ts` (56 riadkov); správanie stráži existujúci test.'),
    dict(n='26', davka='K15', co='Nadbytočný alebo nedosiahnuteľný kód na viacerých miestach (napr. `setIsSearchOpen(false)`, zdvojené '
                                '`?? null`, zbytočné `Number.isFinite`; konkrétne miesta si kolega overí).',
         preco='Upratanie malých miest v navigačných hookoch; každé miesto vo vlastnom commite, súbory nad 500 riadkov sa nemenia '
               '(`DashboardContent.tsx` má 711).'),
    dict(n='247', davka='K16', co='Klik na položku histórie sa pri písaní ruší až po odoslaní hľadania, nie hneď.',
         preco='Dohrávka po APP-05 (K4): zrušiť rozbehnutý klik hneď pri zmene textu, test do `useRecentSearches.race.test.tsx`.'),
    dict(n='248', davka='K16', co='Zrušené textové hľadanie nezresetuje `isRevalidating` (v UI nedosiahnuteľné).',
         preco='Ten istý súbor `useSearchApi.tsx` (223 riadkov) ako 247; riešiť spolu.'),
    dict(n='250', davka='K16', co='Chýba test resetu súhrnu profilu pri otvorení profilu z vyhľadávania (`useDashboardNavigation.tsx:289`).',
         preco='Len test; `useDashboardNavigation.tsx` má 514 riadkov, takže sa súbor nemení.'),
    dict(n='256', davka='K16', co='`FeedLikersDialog.tsx` otvára profil vlastným eventom namiesto spoločného `openUserProfile()`.',
         preco='Jeden malý súbor (209 riadkov), vzor je v `feedProfileNavigation.ts`; doplniť test rovnako ako pri ostatných miestach.'),
]
