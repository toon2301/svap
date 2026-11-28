# Postup práce na zozname nálezov (dvaja rovnocenní agenti)

> **Stav: pripravené 26. 11. 2026 (vetva 215), zatiaľ NEPLATÍ.** K62 a K63 sa dokončia podľa pôvodného systému (`README.md`, časť „Postup
> s kolegom“). Tento postup začne platiť, keď majiteľ po zápise K62 a K63 napíše, že skúšame. Skúška trvá dve kolá a potom ju majiteľ
> vyhodnotí (časť 10). Do vtedy platí všetko v `README.md` a `AGENTS.md`.

Postup vznikol z odpovede majiteľa z 26. 11. 2026 (body 1 až 5 s doplneniami). Cieľ: obaja agenti (**agent** a **kolega**) vedia sami,
čo je ďalší krok, bez toho, aby všetko išlo cez jedného z nich, a zoznam nálezov zostáva jediným miestom, kde je vidieť stav práce.

## 1. Zásady

1. **Obaja agenti sú rovnocenní.** Agent aj kolega majú rovnaké právomoci: spravujú zoznam, prideľujú čísla nálezov, mapujú, opravujú
   kód a rozhodujú o zaradení nálezu do skupiny HNEĎ, PRED alebo PO (časť 5). Čo robí jeden, môže urobiť druhý rovnako.
2. **Vždy pracuje iba jeden.** Ďalší agent začína až po tom, čo majiteľ zlúči vetvu predošlého do `main`, a vždy z čerstvého `main`.
   Rozrobenú prácu eviduje vetva `K<n>` na GitHube: kým nie je zlúčená, nikto iný nezačína; ak ju agent nedokončil, rozhodne majiteľ,
   kto pokračuje.
3. **Dávka sa neuzatvára pred ručným testom.** Ak dávka vyžaduje ručný test majiteľa, je „hotová“ až po slove „prešiel“ (časť 8).
4. **Štart je vždy rovnaký:** najprv sa zapíšu výsledky ručných testov predošlej dávky, vyhodnotia sa nové nálezy a až potom sa berie
   ďalšia dostupná dávka (časť 2).
5. **Vzájomná kontrola práce nie je povinná.** Agent nekontroluje prácu druhého, kým o to majiteľ výslovne nepožiada.
6. **Rozhoduje majiteľ**, keď ide o zmenu vzhľadu (R49), nejasné požadované správanie, výnimku z pravidla 500 riadkov, zatvorenie nálezu
   bez opravy alebo poradie, ktoré pravidlá z časti 7 nevyriešia (časť 9).
7. **Poradie fronty smú meniť obaja** podľa schválených pravidiel, závažnosti a závislostí (časť 7). Pri nejasnosti rozhoduje majiteľ.
8. **Čo ostáva ako doteraz:** PR otvára a zlučuje len majiteľ (agent vetvu nahrá a napíše, čo je v nej); platí `AGENTS.md` (500 riadkov,
   osobné údaje, testy po slovensky, nič nezmäkčovať, Playwright patrí Codexovi); v kóde pracuje len jeden; zlučuje sa len mimo behu
   Playwrightu; ďalšia dávka sa nezlučuje, kým neprešiel ručný test predošlej.
9. **Codex** ostáva v tom istom reťazci: spravuje E2E (`frontend/e2e/**`). Ak zmena aplikácie vyžaduje úpravu E2E testu, agent to uvedie
   v popise vetvy pod nadpisom „Dopad na E2E“ a majiteľ to odovzdá Codexovi. Položku, ktorá čaká na Codexa, označí `fronta caka … --kto Codex`.

## 2. Štart práce (každý agent, každá dávka)

1. `git fetch`, vetva z čerstvého `origin/main`. Na GitHube skontroluj otvorené PR a vetvy: ak predošlá vetva nie je zlúčená, **nezačínaj**.
2. Spusti `python docs/zoznam-nalezov/zapis.py stav`. Výpis ukáže hlavičku, počty, ďalšie voľné čísla (nález, rozhodnutie, dávka),
   **čo treba vybaviť ako prvé** a frontu s prvou voľnou položkou. Skontroluj, že `main` sa zhoduje s hlavičkou zoznamu.
3. **Najprv vybav, čo čaká** (v tomto poradí), a zapíš to ako prvý commit vetvy (len zoznam):
   - zlúčenie predošlej vetvy: `zapis.py zlucene --vetva K<n-1> --pr '#…' --merge <hash> --cas '…'`;
   - výsledok ručného testu z majiteľovej správy: `zapis.py rucny-test --vetva K<n-1> --vysledok prešiel|neprešiel --datum '…'`;
   - nové nálezy z ručného testu a z kontroly: `zapis.py novy --json …` (filter v časti 6); pri `neprešiel` ide oprava ako prvá;
   - odpovede majiteľa na rozhodnutia: `zapis.py rozhodnutie --json` s poľom `id` existujúceho rozhodnutia (vzor
     `sablony/zapis/rozhodnutie-odpoved.json`): doplní `odpoved` a `datum` k `R<n>`, nové číslo nevznikne; potom prípadne `zatvor`.
4. **Potom si vezmi ďalšiu dostupnú dávku:** prvú **voľnú** položku fronty (nie slepo prvú): položka s „čaká na majiteľa“, „čaká na Codexa“
   alebo „čaká na dokončenie“ sa preskakuje. Dávku tvoria voľné položky s rovnakým označením `davka`.
5. Ak nie je voľná žiadna položka, nezačínaj prácu: napíš majiteľovi, na čo všetko fronta čaká.

## 3. Cyklus jednej dávky: mapovanie, oprava, test, zápis, PR

1. **Vetva `K<n>`** (n je ďalšie voľné číslo dávky zo `stav`) z čerstvého `main`; názov dávky je rovnaký pre oboch agentov.
2. **Mapovanie.** JASNÉ položka: pred opravou over čítaním kódu, že nález ešte platí (nie z textu zoznamu). NEJASNÉ položka: najprv len
   zmapuj a vráť zistenie majiteľovi, kód nemeň, kým majiteľ nepovie. Nález, ktorý už neplatí, sa nezatvára sám: odporúčanie ide
   majiteľovi (`rozhodnutie`), až po odpovedi `zatvor`.
3. **Oprava.** Malé logické commity (prvý riadok najviac 72 znakov, po slovensky), jeden nález = jeden commit. Nový test v novom súbore
   s názvami po slovensky; `tsc`, ESLint a celý Jest; zámerné zásahy do kódu (mutácie) dokazujú, že testy chybu zachytia. Súbory nad
   500 riadkov sa nemenia (len sa nahlásia). Čo je mimo úlohy, len nahlás.
4. **Zápis do zoznamu** (časť 4): každý hotový nález `hotove`, nové nálezy `novy`, poradie `fronta …`, hlavička a denník `zmena`.
   Ak dávka vyžaduje ručný test, doplň jeho kroky do `sablony/dymovy_test.md` (podmienený krok „Len po dávke K<n>“, samostatný
   posledný commit). Zápis je súčasťou vetvy dávky (posledné commity); samostatná vetva „len zoznam“ vzniká, len keď sa kód nemenil.
5. **Overenie a push.** `python docs/zoznam-nalezov/build.py --check` musí prejsť; `git push -u origin K<n>` bez force.
6. **Správa majiteľovi** (po slovensky, krátko): čo je vo vetve, výsledky kontrol, **Dopad na E2E** (žiadny, alebo špec a čo upraviť),
   po každom kole CodeRabbitu riadok **Ďalšia kontrola: netreba / odporúčam / treba** s dôvodom (R81), kroky ručného testu (ak sú
   požadované) a čo čaká na rozhodnutie. Pripomienky botov rieši vlastník vetvy: overí ich voči kódu a opraví oprávnené.

## 4. Pomocný skript `zapis.py`

Zápis ručným upravovaním desiatich súborov nahrádza `python docs/zoznam-nalezov/zapis.py <príkaz>` (z koreňa repozitára). Skript zmení
presne tie miesta, ktoré treba, hneď spustí `build.py`, prepíše `ZOZNAM.md` a pri akejkoľvek chybe všetko vráti. Dlhé texty sa dávajú
v súbore JSON (`--json subor.json`, alebo `-` zo štandardného vstupu); vzory sú v `sablony/zapis/` (polia začínajúce `_` sa ignorujú,
`null` je ako vynechané pole). **Dátové súbory zoznamu ručne neupravuj**, kým to skript vie.

| Príkaz | Čo robí |
| --- | --- |
| `stav` | Len čítanie: prehľad na štart (časť 2). |
| `novy --json` | Nový nález s ďalším voľným číslom; voliteľne rovno do fronty (`fronta`) a s rozhodnutím (`rozhodnutie`). Skupina, dopad, zložitosť a balík sa overia; pri zlom balíku skript vypíše povolené. |
| `hotove --json` | Presunie otvorený nález do hotových, odstráni ho aj z fronty a z vĺn; `zlucene`, `pr`, `rucny_test` (`caka`, ak je ručný test požadovaný) a voliteľne `cast_pr`. |
| `zlucene --vetva K<n> [--pr … --merge … --cas …]` | Označí hotové položky vetvy ako zlúčené a pripíše údaje o zlúčení. |
| `rucny-test --vetva K<n> --vysledok prešiel\|neprešiel --datum …` | Zapíše výsledok ručného testu; pri `neprešiel` ostáva dávka neuzavretá. |
| `zatvor --json` | Zatvorí nález rozhodnutím majiteľa (rozhodnutie musí mať odpoveď). |
| `rozhodnutie --json` | Bez `id`: nové rozhodnutie `R<n>`, s odpoveďou alebo ako otázka majiteľovi. S `id`: odpoveď na už zapísané rozhodnutie (doplní `odpoved` a `datum`, číslo sa nemení, zapísanú odpoveď neprepíše). |
| `fronta pridaj\|odstran\|presun\|caka\|volne\|po` | Úprava poradia: pridanie, odstránenie, presun (`--na`), čakanie na majiteľa alebo Codexa (`--kto`, `--text`), voľné, závislosti (`--po`). |
| `zmena --json` | Dátum a stav kódu v hlavičke a nový záznam v denníku zmien (najnovší hore). |

`--na-sucho` (pred príkazom) vyskúša zmenu v dočasnej kópii a nič nezapíše. Návratový kód: **0** v poriadku (aj „Bez zmeny“), **1** model
po zápise neprešiel kontrolou (všetko je vrátené, výpis ukáže prečo), **2** neplatný vstup alebo stav (nič sa nezapísalo), **3** neočakávaná
chyba (nič sa nezapísalo; nahlás ju majiteľovi) alebo sa zmeny nepodarilo vrátiť (výpis povie, ktoré súbory a kde je záloha; obnov ich z gitu). Ak skript niečo nevie (napr. zatvorenie ID z registra `OW-…`, ktoré sa robí ručne podľa
`README.md`, časť „Ako aktualizovať“), upraví sa ručne a `build.py` skontroluje výsledok.

Testy skriptu: `python -m pytest docs/zoznam-nalezov/testy -q` (potrebujú `pytest`, trvajú asi 2 minúty, bežia na kópii skutočných dát a nie sú v CI). Spusti ich pri
každej úprave `zapis*.py`, `model.py`, `fronta_pravidla.py` alebo `vystup.py`.

## 5. Zaradenie nálezu: HNEĎ, PRED, PO

Kritériá sú v časti 0 zoznamu a platia pre oboch rovnako:

| Skupina | Kritérium |
| --- | --- |
| **HNEĎ** | Bezpečnosť, strata alebo poškodenie dát, rozbitý základný tok; vec, ktorá bráni bezpečnému testovaniu; alebo vec lacná teraz a drahá neskôr. Zastav radu a hlás majiteľovi hneď. |
| **PRED NASADENÍM** | Viditeľné chyby, chyby na iPhone, preklady pre jazyky štartu, spoľahlivosť CI a monitoringu. |
| **PO NASADENÍ** | Kozmetika, upratovanie, mikrovýkon, architektonický dlh, väčšie nové funkcie, okrajové správanie. |

Dopad je vysoký (bezpečnosť, dáta, základný tok), stredný (viditeľná chyba, iPhone, jazyk) alebo nízky; zložitosť S (do pol dňa), M (1 až 2
dni), L (viac). Zaradenie zapíš do nálezu spolu s dôvodom v poznámke. Ak je nález na hrane a jeho zaradenie mení, čo sa stihne pred štartom,
**nerozhoduj sám**: odporúčanie ide majiteľovi (`rozhodnutie`).

## 6. Čísla a nové nálezy

- Číslo nálezu pridelí skript ako ďalšie voľné; čísla sa nikdy nemenia ani nepoužívajú znova. Číslo rozhodnutia `R<n>` pridelí skript
  rovnako. Čísla dávok `K<n>` berie agent zo `stav` (najvyššie použité plus jedna). ID z registra (`OW-…`) a úlohy `N…` sa nezakladajú skriptom.
- **Filter na nové nálezy** (README): číslo dostane len nález, ktorý má (a) dôkaz (reprodukciu, test, meranie alebo `súbor:riadok`) a
  (b) dopad na používateľa alebo riziko pre údaje a produkciu. Najviac 5 nových nálezov na dávku (viac len pri HNEĎ). Ostatné (štýl,
  hypotéza bez dôkazu, nitpick bota) ide do `poznamky.md` bez čísla alebo sa opraví v tej istej vetve.

## 7. Poradie fronty

Obaja agenti smú poradie meniť podľa týchto pravidiel (v tomto poradí dôležitosti):

1. **Rozhodnutia majiteľa** o poradí majú prednosť (napr. R84: oprava B, potom A, potom E2E).
2. **Skupina:** HNEĎ pred PRED pred PO.
3. **Závažnosť:** v rámci skupiny vyšší dopad pred nižším; pri rovnakom dopade menšia zložitosť a nižšie riziko pred väčšími.
4. **Závislosti:** položka, ktorá závisí od inej, ide až za ňu (`fronta po`); skript nedovolí poradie, ktoré to poruší.
5. **Čakanie:** položku, ktorá potrebuje vzhľad, odpoveď alebo overenie od majiteľa (alebo E2E od Codexa), označ `fronta caka --kto majiteľ|Codex
   --text '…'`; berie sa prvá voľná položka, takže čakajúca nikoho nezdržiava. Keď čakanie skončí, `fronta volne`.

Každá zmena poradia sa zapíše do denníka (`zmena`) s dôvodom. Ak pravidlá nedajú jednoznačnú odpoveď, položku neraď sám a opýtaj sa majiteľa.

## 8. Kedy je dávka uzavretá

Dávka je uzavretá, keď platí všetko z tohto: kód a testy sú hotové, zápis je vo vetve, majiteľ vetvu **zlúčil** (`zlucene`) a, ak dávka vyžaduje
ručný test, majiteľ ho urobil a **prešiel** (`rucny-test --vysledok prešiel`).

- **Ručný test je požadovaný**, keď dávka mení to, čo používateľ vidí alebo robí (vzhľad, správanie, texty, push). Netreba ho pri čistom
  zozname, E2E alebo refaktore chránenom testami. Vyžadovaný test označ pri `hotove` poľom `rucny_test: "caka"`; kým je `caka` alebo
  `neprešiel`, položka je v zozname označená a v počtoch vedená osobitne („čaká na ručný test“).
- **`neprešiel`:** dávka ostáva neuzavretá. Čo test odhalil, sa zapíše ako nové nálezy (`novy`; číslo uveď v poznámke k výsledku) a ide ako
  prvé na rad (`fronta … --na 1`); po oprave sa test zopakuje (opravnú dávku zlučuje majiteľ podľa výnimky nižšie).
- Ďalší agent smie začať po **zlúčení** predošlej vetvy (časť 2), no majiteľ zlúči jeho PR až po úspešnom ručnom teste predošlej dávky.
  **Výnimka: opravná dávka.** PR, ktorý opravuje nálezy z neprešlého ručného testu, sa zlučuje aj pred opakovaním testu: test sa dá
  zopakovať až po nasadení opravy, takže inak by sa postup zablokoval. Po nasadení opravy majiteľ test zopakuje a až potom sa zapíše
  `prešiel` pre pôvodnú aj pre opravnú dávku (`rucny-test --vetva … --vysledok prešiel` pre každú). Ak test neprejde znova, platí to isté
  znova. Pre dávky, ktoré s neprešlým testom nesúvisia, zákaz zlúčenia pred úspešným testom platí.

## 9. Kedy sa zastav a pýtaj majiteľa

Zastav, napíš majiteľovi jednu správu s odporúčaním (najviac 3 otvorené rozhodnutia naraz; `rozhodnutie` bez odpovede) a nepokračuj v tom,
čo od odpovede závisí, keď:

- ide o **zmenu vzhľadu** (R49) alebo požadované správanie nie je jasné;
- treba výnimku z pravidla 500 riadkov, alebo sa má nález zatvoriť bez opravy;
- pravidlá poradia (časť 7) alebo zaradenia (časť 5) nedajú jednoznačnú odpoveď;
- ide o **HNEĎ** (bezpečnosť, dáta, základný tok): zastav radu a hlás;
- test padá z neznámej príčiny, alebo skript skončil kódom 1 či 3 a príčina nie je jasná;
- stav na GitHube nesedí so zoznamom (neznáma vetva, otvorený PR, `main` iný ako v hlavičke);
- úloha zasahuje do oblasti druhého agenta (napr. Playwright patrí Codexovi) alebo mimo zadania: len nahlás, neopravuj potichu.

## 10. Skúška a vyhodnotenie

Skúška začne potvrdením majiteľa po zápise K62 a K63 a trvá **dve kolá** (kolo = jedna dávka jedného agenta od štartu po zlúčenie a zápis
ručného testu; agenti sa striedajú). Po každom kole agent do denníka zmien (`zmena`) krátko uvedie: čo sa podarilo cez skript, čo sa
muselo robiť ručne, koľkokrát skript skončil kódom 1 až 3 mimo chybných vstupov, či agent našiel všetko potrebné v `stav` bez doplňujúcej
otázky a či sa čísla neopakovali. Po dvoch kolách majiteľ rozhodne, či postup ostáva, upraví sa, alebo sa vrátime k pôvodnému systému.

## 11. Čo skript nerobí a čo sa už neaktualizuje

- **Ručne ostáva:** ID z registra (`OW-…`, `register.py`, `docs/testing/findings-register.md`), úlohy `N…`, karty (`karty/`), neočíslované
  poznámky (`poznamky.md`), manuál ručných testov (`sablony/dymovy_test.md`), jednotlivé návrhy vzhľadu (`navrhy/`).
- **Zamrznuté (už sa neaktualizuje):** príbeh „Ako to išlo“ a „Postup s kolegom“ v `README.md`, text schválenia vo `fronta.SCHVALENE`
  a popisy vĺn `stav.PORADIE[*].co`. Skript z vĺn odstraňuje len čísla hotových nálezov, aby kontrola vĺn nehlásila zastarané položky;
  história ostáva v denníku zmien, v `hotove*.py` a v PR.
