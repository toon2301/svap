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
| `hotove_k20.py` | Nálezy opravené od 13. 11. 2026 (`DONE_SINCE_K20`). Samostatný súbor, lebo `hotove_dalsie.py` má 496 riadkov; `hotove.py` ich pripája do `DONE_SINCE`. |
| `fronta.py` | Poradie prác pre kolegu (dávky K15, K16…, kľúč `davka`); smie obsahovať otvorené nálezy z ktorejkoľvek skupiny (HNEĎ, PRED aj PO NASADENÍ). Hotový nález sa odtiaľto odstráni. |
| `zatvorene_dalsie.py` | Nálezy zatvorené rozhodnutím majiteľa po prvom vydaní (`CLOSED_SINCE`); zobrazujú sa v časti 8. |
| `rozhodnutia_nastenka.py` | Rozhodnutia R13–R33: zo zoznamu majiteľa (R13–R19 a R22 rozhodnuté, R20 a R21 čakajú), R23 (čaká), R24 (výnimka z pravidla 500 riadkov pre nález 271, rozhodnuté), R25 (275 je zámer, rozhodnuté), R26 (dve výnimky pre testové súbory, rozhodnuté), R27 (pravidlo 500 riadkov a testy, čaká) a R28 (vstupné animácie modulov, čaká), R29 (animované obrázky, čaká) , R30 (starý endpoint ponúk, rozhodnuté (a)), R31 (výnimka pre osem `alert()`, rozhodnuté 9. 11. s podmienkou maximálnej opatrnosti), R32 (kategórie upozornení, rozhodnuté (a) 9. 11.: dokončiť pred štartom) a R33 (postupné zapínanie push na správy, rozhodnuté (a) 9. 11.); `stav.py` ich pripája do `DECISIONS`. |
| `priloha_nastenka.py` | Príloha D: mapovanie zoznamu majiteľa na tento zoznam (jeden riadok na jeho položku). Generátor overí odkazy v nej. |
| `konstanty.py`, `model.py`, `vystup.py`, `priloha_hosting.py`, `build.py` | Generátor (len štandardná knižnica Pythonu). |

## Ako aktualizovať

Po **každom novom nálezi alebo oprave** (v tej istej vetve, v ktorej sa mení kód):

1. **Nový nález:** pridať do `NEW_ITEMS_DALSIE` v `polozky_nove_dalsie.py` (232 až 250; staršie sú v `NEW_ITEMS` v `polozky_nove.py`, od 251 v `polozky_nove_nastenka.py`; kým má súbor miesto pod 500 riadkov, nové nálezy patria do `polozky_nove_nastenka.py`) s ďalším voľným číslom (čísla sa nikdy nemenia ani nepoužívajú znova).
   Nové ID v registri treba zaradiť do `register.py`.
2. **Oprava nálezu:** odstrániť ho z `ORIG_OPEN` (`polozky_povodne.py`) alebo `NEW_ITEMS` a pridať do `DONE_SINCE_K20` v `hotove_k20.py` (od 13. 11. 2026; staršie opravy sú v `hotove_dalsie.py`)
   (staršie opravy sú v `DONE_SINCE` v `hotove.py`; `n`, `text`, `vetva`, `pr` keď je známe, `zlucene=True` po zlúčení PR). Ak ho spomínala vlna v `stav.PORADIE`, upraviť ju.
   Čiastočne hotový nález ostáva otvorený: jeho text sa upraví na zvyšok a hotová časť sa v ňom uvedie s PR a commitom.
3. **Odpoveď na rozhodnutie:** vyplniť `odpoved` a `datum` v `stav.DECISIONS` (R13 až R38 sú v `rozhodnutia_nastenka.py`). Nález, ktorý sa kvôli
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
  hotové a po nich bola vetva agenta 169 (len zoznam). K13 (PR #244) a K14 (PR #245) sú hotové a po nich boli vetvy agenta 170 a 171
  (len zoznam). K15 (PR #250), K16 (PR #253, okrem mapovania 319), K17 (PR #254; nález 311 uzavrel majiteľ, R38) a K18 (PR #255, okrem toastu pri 325) sú hotové a po nich sú vetvy agenta 172 a 173 (len zoznam). K19 (PR #257, etapy 1 a 2 nálezu 321) a K20 (PR #258, etapa 3a nálezu 321 spolu s kódom opravy 319) sú hotové; po nich je vetva agenta 174 (len zoznam) a jednorazová oprava vyhľadávania vo vetve 175 (výnimka majiteľa, PR #259). Ďalšie dávky kolegu sú K21 (331, 325 a po rozhodnutí R39 aj 330) a K22 (výzva na push, etapa 3b nálezu 321) (poradie je v časti 2 zoznamu; dávky PO-A a PO-B sú staršie návrhy z nálezov PO NASADENÍ a číslo K dostanú, až keď pôjdu kolegovi).
- **Vetvy:** kolega K1, K2, K3…; agent číslované (163, 164…); Codex `e2e/<názov>`. S Codexom pracuje len agent.
- **Čo dostane kolega:** opis nálezu a návrh najlepšej opravy (nálezy sú v častiach 3 až 5 zoznamu, poradie v časti 2). Nález overuje kolega pri
  práci. Od K15 agent pred zlúčením porovná výsledok kolegu s PR, CI a kódom (pozri „Postup od K15“). Nálezy, ktoré majiteľ určí na zmapovanie kolegovi (naposledy 274, 275, 276), agent nemapuje:
  zapíše ich presne podľa opisu a príčinu nájde kolega.
- **Výnimky z pravidla 500 riadkov:** schvaľuje len majiteľ a každá sa zapíše ako rozhodnutie (R24: jeden riadok v `useDashboardState.ts` pre
  nález 271; R26: dva testové súbory z K8 a K9; R31: osem výmen `alert()` v troch súboroch pre nález 302 v K17, 9. 11. 2026, s podmienkou maximálnej opatrnosti). Pravidlo platí ďalej; či sa vzťahuje aj na testy, čaká na R27.
- **Po každej práci kolegu** majiteľ pošle agentovi číslo PR a krátky verdikt (testy po nasadení prešli alebo neprešli, nové nálezy). Výsledok
  dávky agent číta z GitHubu: texty commitov nesú overenie, testy, mutácie a odchýlky od karty, CI a boty sú v PR. Samostatnú stranu podľa
  `sablony/vysledok_davky.md` kolega píše len pri NEJASNÝCH nálezoch (mapovanie), keď v commitoch overenie chýba, alebo keď má kandidátov na
  nové nálezy. Agent zapíše hotové, nové nálezy podľa filtra a rozhodnutia.
- **Zoznam:** agent ho aktualizuje v každej vetve a ak to nezvláda, hlási to. Hotový nález kolegu sa z `fronta.py` presunie do
  `hotove_k20.DONE_SINCE_K20` (od 13. 11. 2026; staršie sú v `hotove_dalsie.DONE_SINCE_DALSIE`; vetva `K1`, číslo PR, `zlucene=True` po zlúčení).

## Postup od K15 (skúška)

Skúška, ktorú majiteľ odsúhlasil 8. 11. 2026; platí od dávky K15. Po K15 a K16 sa vyhodnotí (čas majiteľa na dávku, počet nových nálezov na
dávku, chyby zachytené dymovým testom, počet kôl správ; údaje z K15: samostatný výsledok dávky netreba, nové nálezy 0, chyby zachytené dymovým testom 0; údaje z K16: samostatná strana len pri 319, nové číslované nálezy 0 a dve poznámky bez čísla, chyby zachytené dymovým testom 0, ručný test prešiel) a pravidlá buď ostanú, alebo sa upravia. Vyhodnotenie po K16 (10. 11. 2026): majiteľ potvrdil, že postup ostáva; údaje z K17: samostatná strana len pri 311, nové číslované nálezy 0 (slovenské texty v `cs.json` patria do 176, štyri nedosiahnuteľné vetvy limitu kariet sú poznámka); údaje z K18: samostatná strana nebola potrebná, nové číslované nálezy z dávky 0 (325 až 327 vznikli z ručných testov po K17) a dve poznámky bez čísla, chyby zachytené dymovým testom 0, ručný test prešiel; údaje z K19: samostatná strana nebola potrebná, nové číslované nálezy z dávky 0 (328 vznikol z reportu Codexa, nie z K19) a dve poznámky bez čísla, dymový test sa samostatne nespustil (Codex spustil rovno celý beh), ručný test prešiel; údaje z K20: samostatná strana prišla len pri 319 (krok 0 mapovania) a k agentovi sa nedostala, nové číslované nálezy z dávky 0 (330 a 331 vznikli z ručných testov po K20 a 329 pri oprave vyhľadávania) a dve poznámky bez čísla, dymový test sa samostatne nespustil, ručné testy našli dve chyby (330 a 331) a ešte prebiehajú. Nemení sa: v kóde pracuje len jeden, striedanie
2 : 1, výnimky z pravidla 500 riadkov schvaľuje len majiteľ a čísla nálezov prideľuje len agent.

**Kto čo robí**

| | Robí | Nerobí |
| --- | --- | --- |
| Majiteľ | schvaľuje poradie a výnimky, otvára a zlučuje PR, po nasadení robí dymový test na iPhone, posiela logy a odpovedá na rozhodnutia | neprepisuje dlhé reporty |
| Agent | drží zoznam, triedi nálezy a robí prvé mapovanie z kódu (návrh, nie dôkaz), pripraví kartu dávky, pred zlúčením porovná výsledok kolegu s PR, CI a kódom | neopravuje kód (kým majiteľ nepovie), neotvára PR (kým majiteľ nepovolí), nezlučuje |
| Kolega | pred opravou overí, že nález platí a že návrh drží; opraví s testami a mutáciami; pri NEJASNÝCH nálezoch najprv mapuje; overenie, mutácie a odchýlky od karty píše do textu commitov (samostatnú stranu len pri NEJASNÝCH nálezoch a kandidátoch na nové nálezy) | nemení súbory nad 500 riadkov, nálezom nedáva čísla |
| Codex | E2E: dymová sada `@smoke` po každom nasadení (zavedená v PR #251), plný beh v oznámenom okne | nemení aplikáciu |

**Jedna dávka**

1. **Karta dávky** (`sablony/karta_davky.md`): jedna strana, 3 až 4 nálezy jedného druhu rizika (vzhľad, backend logika, alebo závislosti, prihlásenie
   a infra; tretí druh vždy samostatne). Pri každom nálezi najlepšia oprava, test, ručná kontrola a značka **JASNÉ** (kolega len rýchlo overí a
   opraví) alebo **NEJASNÉ** (kolega najprv mapuje a vráti zistenie, kód nemení, kým majiteľ nepovie). Značka je aj na začiatku `preco` v `fronta.py`
   a model ju kontroluje. Hotové karty sú v `karty/` (prvá je `karty/K15.md`).
2. **Práca kolegu:** vlastná vetva z čerstvého `main`, commit na nález, testy a mutácie; overenie, mutácie a odchýlky od karty do textu
   commitu (výsledok dávky agent číta z PR). Samostatná strana podľa `sablony/vysledok_davky.md` len pri NEJASNÝCH nálezoch, keď overenie v
   commitoch chýba, alebo keď má kolega kandidátov na nové nálezy.
3. **Kontrola pred zlúčením:** majiteľ pošle agentovi číslo PR, agent porovná commity, CI, boty a kód s kartou (asi 10 minút) a nesúlady napíše
   skôr, než sa PR zlúči. Toto mení pôvodné „agent jeho PR pred zlúčením nekontroluje“.
4. **PR a boty:** CI (`checks` aj `backend-postgres`) musí byť zelené. CodeRabbit sa spúšťa na poslednom commite (limit je jedna kontrola za hodinu),
   Codex review sa spustí pri otvorení PR.
5. **Zlúčenie** len mimo behu Playwrightu. Závislosti, prihlásenie/CSRF a infra sa nasadzujú samostatne, nikdy v jednej dávke s inou zmenou.
6. **Dymový test po nasadení** (`sablony/dymovy_test.md`, majiteľ, asi 5 minút). Výsledok agentovi jedným riadkom: „prešlo“ alebo „neprešlo + krok“.
   Kým neprejde, ďalšia dávka sa nezlučuje.
7. **Zápis:** agent zapíše hotové, nové nálezy podľa filtra a rozhodnutia (vetva len so zoznamom).

**Keď niečo zlyhá (nález HNEĎ):** rad sa zastaví a ďalšia dávka sa nezlučuje. Majiteľ pošle logy v štandardnej podobe (pri push počty z riadku
`message_push_delivery_summary`, bez ID). Najprv sa overuje nastavenie, až potom kód: pri 318 (push na iPhone po K14) ukázal log
`skipped_reason=rollout_5`, teda postupné zapínanie na 5 % v Railway, nie chybu kódu. Agent podľa vstupov namapuje príčinu, kolega opraví v samostatnej vetve s jedným nálezom mimo striedania a po
oprave sa zopakuje dymový test. Ak je rozbitý základný tok a oprava nie je do pár hodín, majiteľ vráti predchádzajúce nasadenie v Railway; postup sa
overí vopred, nie v zhone.

**Nové nálezy (filter):** číslo dostane nález, ktorý má (a) dôkaz (reprodukciu, test, meranie alebo `súbor:riadok`) a (b) dopad na používateľa alebo
riziko pre údaje a produkciu. Najviac 5 nových očíslovaných nálezov na dávku; viac len pri HNEĎ. Ostatné (štýl, hypotéza bez dôkazu, pripomienka bota
typu nitpick) ide do `poznamky.md` bez čísla, alebo sa opraví v tej istej vetve. Kolega dáva len kandidátov (bez čísla), číslo prideľuje agent.

**Rozhodnutia:** najviac 3 otvorené naraz; agent ich pýta jednou správou s odporúčaním.

**Týždenne:** plný E2E beh v oznámenom okne bez zlučovania (Codex) a čistenie zoznamu: nálezy, ktoré sa nedajú reprodukovať, sa zatvoria rozhodnutím.
Týždenný audit závislostí beží sám (pondelok).

**Dymová sada v Playwrighte** (5 až 8 špecov, asi 5 minút, proti Railway) je v oblasti Codexa. Codex ju zaviedol v PR #251 (zlúčené 10. 11. 2026): sedem existujúcich špecov (`smoke`, `auth-session`, `messages-peer-profile`, `mobile-settings-navigation`, `dashboard-history-navigation`, `html-cache-control`, `sharing-from-feed`; 51 variantov) so značkou `@smoke` na krátkych scenároch a bez zmeny asercií, tolerancií, timeoutov a retry. Jedno meranie celého procesu: 2 min 36 s, 40 prešlo, 1 padlo a 10 projektových SKIP; nový pád `auth-session` po F5 pri vyčistených cookies vo WebKite mobile (3 opakovania prešli, príčina neurčená). Druhé meranie po K16 (10. 11. 2026): 2 min 44 s, 40 prešlo, 1 padlo (`messages-peer-profile` vo webkit-mobile pri priamom otvorení konverzácie; v celom behu aj v troch opakovaniach prešiel) a 10 projektových SKIP, `auth-session` 9 z 9. Spúšťa sa z priečinka `frontend`: `npm run test:e2e:docker -- --grep '@smoke' --workers=1 --retries=0`, až po nasadení a v okne bez zlučovania. Kým sa neosvedčí (niekoľko behov bez nového pádu), nie je podmienkou zlúčenia dávky. Ôsmy špec s fotkou patrí do 295. Okrem dymu platí ručný dymový test. Odosielanie správ sa do dymu nedáva (zmazaná správa ostáva v databáze ako prázdny záznam) a push sa v Playwrighte otestovať nedá, takže ostávajú na ručnom teste.
