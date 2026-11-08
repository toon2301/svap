# Zoznam nálezov

Hlavný zoznam nálezov projektu Svaply je v súbore [`ZOZNAM.md`](ZOZNAM.md). Súbor sa **generuje** z dát v tomto priečinku, preto sa
neupravuje ručne. Generátor pri každom spustení overí úplnosť (čísla nálezov a ID z registra sú práve raz, súčty sedia), takže zoznam
nemôže ticho prestať sedieť.

## Súbory

| Súbor | Obsah |
| --- | --- |
| `ZOZNAM.md` | Generovaný dokument, ktorý sa číta. |
| `povodny_zoznam.json` | Pôvodný zoznam nálezov 1–172 (texty bez úprav). |
| `polozky_povodne.py` | Roztriedenie otvorených položiek 1–172: skupina, dopad, zložitosť, balík, poznámka. |
| `polozky_nove.py` | Nové nálezy od 173 do 231. |
| `polozky_nove_dalsie.py` | Nové nálezy od 232 do 250. Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. |
| `polozky_nove_nastenka.py` | Nové nálezy od 251: zo zoznamu majiteľa „Svaply — otvorené nálezy a rozpracovaná práca“ (251 až 269) a nálezy po ňom (270 až 304: kolega pri K6 až K12, manuálne testy majiteľa zo 7. a 8. 11. 2026 a analýza Codexu). Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. |
| `polozky_nove_k14.py` | Nové nálezy od 305: kandidáti kolegu z K13 a K14 a ručné testy majiteľa po K14 (8. 11. 2026). Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. |
| `polozky_priprava.py` | Úlohy na prípravu ostrého nasadenia N1…. Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich sprístupňuje pod pôvodným názvom. |
| `register.py` | Stav ID z `docs/testing/findings-register.md` (otvorené, zatvorené, čaká živé overenie). |
| `stav.py` | Dátum a stav kódu, poradie práce, rozhodnutia, denník zmien (od 7. 11. 2026). |
| `zmeny_starsie.py` | Starší denník zmien (do 6. 11. 2026): `ZMENY_STARSIE`. Samostatný súbor kvôli limitu 500 riadkov; `stav.py` ich pripája na koniec `ZMENY`. |
| `hotove.py` | Nálezy opravené po prvom vydaní do 5. 11. 2026 (`DONE_SINCE`), tabuľka PR a popis série Upozornenia. Samostatný súbor, aby žiadny súbor nepresiahol 500 riadkov; `stav.py` ich sprístupňuje pod pôvodnými názvami. |
| `hotove_dalsie.py` | Nálezy opravené od 6. 11. 2026 (`DONE_SINCE_DALSIE`). Samostatný súbor kvôli limitu 500 riadkov; `hotove.py` ich pripája do `DONE_SINCE`. |
| `fronta.py` | Poradie prác pre kolegu (dávky K15, K16…, kľúč `davka`); smie obsahovať otvorené nálezy z ktorejkoľvek skupiny (HNEĎ, PRED aj PO NASADENÍ). Hotový nález sa odtiaľto odstráni. |
| `zatvorene_dalsie.py` | Nálezy zatvorené rozhodnutím majiteľa po prvom vydaní (`CLOSED_SINCE`); zobrazujú sa v časti 8. |
| `rozhodnutia_nastenka.py` | Rozhodnutia R13–R32: zo zoznamu majiteľa (R13–R19 a R22 rozhodnuté, R20 a R21 čakajú), R23 (čaká), R24 (výnimka z pravidla 500 riadkov pre nález 271, rozhodnuté), R25 (275 je zámer, rozhodnuté), R26 (dve výnimky pre testové súbory, rozhodnuté), R27 (pravidlo 500 riadkov a testy, čaká) a R28 (vstupné animácie modulov, čaká), R29 (animované obrázky, čaká) , R30 (starý endpoint ponúk, rozhodnuté (a)), R31 (výnimka pre osem `alert()`, čaká) a R32 (kategórie upozornení, čaká); `stav.py` ich pripája do `DECISIONS`. |
| `priloha_nastenka.py` | Príloha D: mapovanie zoznamu majiteľa na tento zoznam (jeden riadok na jeho položku). Generátor overí odkazy v nej. |
| `konstanty.py`, `model.py`, `vystup.py`, `priloha_hosting.py`, `build.py` | Generátor (len štandardná knižnica Pythonu). |

## Ako aktualizovať

Po **každom novom nálezi alebo oprave** (v tej istej vetve, v ktorej sa mení kód):

1. **Nový nález:** pridať do `NEW_ITEMS_DALSIE` v `polozky_nove_dalsie.py` (232 až 250; staršie sú v `NEW_ITEMS` v `polozky_nove.py`, od 251 v `polozky_nove_nastenka.py`; kým má súbor miesto pod 500 riadkov, nové nálezy patria do `polozky_nove_nastenka.py`) s ďalším voľným číslom (čísla sa nikdy nemenia ani nepoužívajú znova).
   Nové ID v registri treba zaradiť do `register.py`.
2. **Oprava nálezu:** odstrániť ho z `ORIG_OPEN` (`polozky_povodne.py`) alebo `NEW_ITEMS` a pridať do `DONE_SINCE_DALSIE` v `hotove_dalsie.py`
   (staršie opravy sú v `DONE_SINCE` v `hotove.py`; `n`, `text`, `vetva`, `pr` keď je známe, `zlucene=True` po zlúčení PR). Ak ho spomínala vlna v `stav.PORADIE`, upraviť ju.
   Čiastočne hotový nález ostáva otvorený: jeho text sa upraví na zvyšok a hotová časť sa v ňom uvedie s PR a commitom.
3. **Odpoveď na rozhodnutie:** vyplniť `odpoved` a `datum` v `stav.DECISIONS` (R13 až R32 sú v `rozhodnutia_nastenka.py`). Nález, ktorý sa kvôli
   rozhodnutiu neopravuje, sa odstráni z otvorených a pridá do `CLOSED_SINCE` v `zatvorene_dalsie.py`.
4. Posunúť `stav.STAV` (dátum, stav kódu) a doplniť riadok do `stav.ZMENY`.
5. Z koreňa repozitára spustiť `python docs/zoznam-nalezov/build.py` a pridať do commitu aj `ZOZNAM.md`.

**Poradie prác pre kolegu:** po dokončení nálezu záznam v `fronta.py` odstrániť a nález presunúť do `DONE_SINCE_DALSIE` (kontrola zlyhá, ak záznam
odkazuje na nález, ktorý už nie je otvorený). Polia `kto`, `stav` a `od` sa pri práci kolegu nevyplňujú: v kóde pracuje vždy len jeden
a začiatok aj koniec práce hlási majiteľ.

Kontrola, či `ZOZNAM.md` zodpovedá dátam (nič nezapíše): `python docs/zoznam-nalezov/build.py --check`.

Podrobný denník položiek OW- / TEST- ostáva v `docs/testing/findings-register.md`.

## Postup s kolegom

Dohoda s majiteľom z 5. 11. 2026, upravená 6. a 7. 11. 2026; platí, kým ju majiteľ nezmení.

- **V kóde pracuje vždy len jeden:** agent, kolega alebo Codex, nikdy dvaja naraz. Ďalšia práca sa začne, až keď majiteľ potvrdí, že
  predchádzajúca je úplne hotová.
- **Striedanie 2 : 1** (od 6. 11. 2026): dve dávky kolegu (aspoň tri nálezy, každý vo vlastnom commite v jednej vetve), potom jedna vetva
  agenta, a tak ďalej. Kolega smie robiť aj nálezy PRED NASADENÍM a HNEĎ (predtým len PO NASADENÍ). Majiteľ môže pomer dočasne zmeniť
  (napr. na 1 : 1) a dá to agentovi vedieť. Predtým platilo striedanie 1 : 1; prvá práca kolegu bola skúšobná a mala jediný nález (192).
- **Ako to išlo:** K4 a K5 išli za sebou (výnimka z 6. 11. 2026) a potom prišla vetva agenta 166 (len zoznam). K6 a K7 išli za sebou podľa
  striedania 2 : 1 a po nich bola vetva agenta 167, ktorá je na pokyn majiteľa z 7. 11. 2026 len zoznam: opravy nálezov agentom sa
  odkladajú, kým majiteľ nedá vedieť. K8 (mapovanie nálezov 274, 275 a 276) sa robila na dva razy (PR #237 a #238; druhé kolo sa volalo
  K9) a dávka drobných opráv išla ako K10 (PR #239); po nich bola vetva agenta 168 (len zoznam). K11 (PR #241) a K12 (PR #242) sú
  hotové a po nich bola vetva agenta 169 (len zoznam). K13 (PR #244) a K14 (PR #245) sú hotové a po nich je vetva agenta 170 (len
  zoznam). Ďalšie dve dávky kolegu sú K15 a K16 (poradie je v časti 2 zoznamu).
- **Vetvy:** kolega K1, K2, K3…; agent číslované (163, 164…); Codex `e2e/<názov>`. S Codexom pracuje len agent.
- **Čo dostane kolega:** opis nálezu a návrh najlepšej opravy (nálezy sú v častiach 3 až 5 zoznamu, poradie v časti 2). Nález overuje kolega pri
  práci. Agent jeho PR pred zlúčením nekontroluje. Nálezy, ktoré majiteľ určí na zmapovanie kolegovi (naposledy 274, 275, 276), agent nemapuje:
  zapíše ich presne podľa opisu a príčinu nájde kolega.
- **Výnimky z pravidla 500 riadkov:** schvaľuje len majiteľ a každá sa zapíše ako rozhodnutie (R24: jeden riadok v `useDashboardState.ts` pre
  nález 271; R26: dva testové súbory z K8 a K9). Pravidlo platí ďalej; či sa vzťahuje aj na testy, čaká na R27.
- **Po každej práci kolegu** majiteľ pošle agentovi názov PR, krátko ako sa nález opravil a prípadné nové nálezy. Agent ich zapíše do
  zoznamu alebo opraví hneď podľa závažnosti.
- **Zoznam:** agent ho aktualizuje v každej vetve a ak to nezvláda, hlási to. Hotový nález kolegu sa z `fronta.py` presunie do
  `hotove_dalsie.DONE_SINCE_DALSIE` (vetva `K1`, číslo PR, `zlucene=True` po zlúčení).
