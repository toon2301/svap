<!-- Porovnanie dvoch nezávislých mapovaní K46 (kolega: `K46_vysledok.md`, agent: `K46_agent.md` s podkladmi v `K46_podklady.md`), 21. 11. 2026, `main` `8c49c5b7`. Dvojité mapovanie podľa rozhodnutia majiteľa (R65). Agent overil kľúčové tvrdenia kolegu vlastnými skúškami v kópii `frontend` mimo repozitára; kód v repozitári sa nemenil. -->

# Porovnanie mapovaní K46 a dohodnutý postup delenia

## 1. Hlavný záver

Dve nezávislé mapovania (iné prototypy, iné sondy, iné zoznamy skúšobných pokazení kódu) dospeli k tomu istému:

1. **Kartu aj mobilný detail sa dá deliť čistými presunmi kódu**, bez zmeny správania a vzhľadu (kolega: karta 1 033 → 440 riadkov, mobilný detail 594 → 352; agent: 1 033 → 481 a 594 → 368).
2. **Najväčšie riziko nie je presun, ale medzery v testoch**: existujúce testy nezachytili zhruba 40 až 50 % skúšobných pokazení karty (kolega 49 zo 121, agent 84 zo 166) a v mobilnom detaile je to ešte horšie (zmazanie z neho nemá žiadny test). Preto prvé dávky sú **ochrana** (nové testy, dočasný odtlačok HTML, sonda poradia efektov) a až potom presuny.
3. **Obe mapovania našli tú istú chybu** (355) a kolega ešte jednu (356), ktorú agent reprodukoval. Nepatria do čistých presunov, ide o samostatnú opravu.
4. Odhad: kolega 5 až 7 dní práce (7 až 9 kalendárnych dní s ručnými testami, 8 dávok), agent 4 až 5 dní (5 dávok, bez ochrany mobilného detailu). **Platí odhad kolegu**, lebo počíta aj ochranu mobilného detailu a samostatné dávky pre rizikové kroky.

Dvojité mapovanie sa oplatilo: každé našlo niečo, čo druhé nie. Kolega chybu 356, medzery mobilného detailu (55 mutácií) a zoznam asi 35 testov s názvami; agent sondu poradia efektov, meranie celého Jestu a buildu na prototype (620 sád a 9 386 testov, rovnako ako `main`), paritu 82 z 82 mutácií po delení a doslovnosť presunu (952 z 988 riadkov pôvodnej karty je v nových súboroch).

## 2. Kde sa mapovania zhodujú

| Téma | Kolega | Agent | Záver |
| --- | --- | --- | --- |
| Uskutočniteľnosť delenia karty | 7 krokov (0, a až g), 10 nových súborov (37 až 191 riadkov), karta 440 | 10 krokov, 12 nových súborov (45 až 191 riadkov), karta 481 | zhoda: čisté presuny, každý súbor pod 500 riadkov |
| Mobilný detail | 2 presuny (hlavička s menu, obsah nad komentármi), 352 riadkov, po karte | 2 presuny (obsah, hlavička), 368 riadkov, po karte | zhoda; stačí aj jeden presun (obsah 464, hlavička 491) |
| Medzery v testoch karty | 49 zo 121 prežilo (41 skutočných, 2 kryje odtlačok, 6 nepozorovateľných) | 84 zo 166 prežilo proti 22 sádam; z 16 prežívajúcich zopakovaných proti 80 súborom 14 prežilo | zhoda v oblastiach: menu a fokus, zmazanie a odstránenie označenia, preberanie z feedu, zatváranie vrstiev, polling, preklik na profil z hlavičky, ikona komentárov a fotky, odovzdanie z vrstiev, vložené komentáre |
| Odtlačok HTML | 27 stavov, zachytil 8 z 8 zmien tried pružného stĺpca | 37 stavov, zachytil 11 z 11 zmien tried (testy 1 z 11) | zhoda: odtlačok je nutný a stačí na pružný stĺpec |
| Dôležitosť pružného stĺpca | riziko stredné pri krokoch c, d, e | stredné pri hlavičke, zdieľanom bloku, fotkách | zhoda: koreň komponentu je priamy potomok `article`, `fixedBlock` ide ako vlastnosť |
| Nepozorovateľné zásahy | T1, D1 (dvojitý klik), P3, P4, P5, Y20 | podobné povahy (ochrany proti dvojitému kliku D1 a D8, R4 a R5 cez udalosť počtov); agent ich neposudzoval po jednom | zhoda |
| Verejné rozhranie | 5 importérov, `export default`, vlastnosti | rovnako | zhoda; nový je len typ `FeedPostCardProps` |
| Súvislosti | 344 do `FeedPostSharedBlock.tsx` a `SharedContentPreviewCard.tsx`; 261/8 označenia do zdieľaného bloku; 262/B do akcií | rovnako | zhoda |
| Počty hookov | karta 17 `useState`, 7 `useEffect`, 3 `useCallback`, 1 `useRef`; detail 12, 2, 2, 2 | rovnako (agent pôvodne uviedol 15 `useState`, opravené) | zhoda |

## 3. Overenie tvrdení kolegu agentom

Skúšky bežali v kópii `frontend` z `main` `8c49c5b7` (`npm ci`); čísla sú z konkrétnych behov.

| Tvrdenie kolegu | Overenie agenta | Výsledok |
| --- | --- | --- |
| Chyba 1: okno zdieľania po úprave ukáže starý text (`FeedPostCard.tsx:1028` dáva `post`, mobilný detail `currentPost`, `FeedPostMobileDetail.tsx:562`) | agent ju našiel nezávisle a rovnako (tie isté riadky), test v kópii: karta ukáže „Novy text“, náhľad v dialógu „Povodny text“; mutácia `post={currentPost}` prežila všetky testy | **potvrdené** (nález 355) |
| Chyba 2: obnova feedu počas prebiehajúceho lajku nechá v `currentPost` starý lajk (efekty `:407-409` a `:420-426`), detail a prehliadač fotky sa otvoria s nesprávnym lajkom | test v kópii na pôvodnej karte: ťuk na lajk, obnova feedu so starým snapshotom, dokončenie lajku, otvorenie mobilného detailu: karta ukazuje lajk a počet 4, detail `aria-pressed="false"` a počet 3 | **potvrdené** (nález 356) |
| Zmazanie z mobilného detailu nemá žiadny test (8 z 8 zásahov prežilo) | 8 zásahov do zmazania, 2 do menu a 1 do zdieľania proti 80 súborom testov: všetkých 11 prežilo; tlačidlo „X“ a úprava z menu sú zachytené | **potvrdené**, medzera je aj v menu a zdieľaní |
| Medzery karty (121 zásahov, 49 prežilo) | agent: 166 zásahov, 84 prežilo; oblasti a miesta v kóde sa zhodujú podľa popisu kolegu (menu a fokus ≈ zásahy agenta H1, H4 až H8, H22; odstránenie označenia a zmazanie ≈ D1 až D14; preberanie z feedu ≈ E1 až E5; zatváranie vrstiev ≈ E6 a E7; polling ≈ R1 až R7; nadpis portfólia ≈ S4; preklik a vypnutie avatara ≈ H13 až H17b) | **potvrdené**; rozdiel v počte je z výberu zásahov |
| Fokus po Escape: ak bol na položke menu, nevráti sa na spúšťač (M1) | test v kópii: s fokusom na položke menu a Escape ostane fokus na spúšťači; zásah H1 (bez `menuTriggerRef.current?.focus()`) ho zhodí, test prechádza na dnešnom kóde aj na prototype | **potvrdené**; test funguje |
| Pokazenie poradia efektov (S10) testy nezachytia, sonda poradia chýba | agent má sondu poradia efektov: zásah do efektov (E4, E5, E6a) zachytila vo všetkých 37 stavoch; na prototype je poradie rovnaké (rozdiel len premenovanie `post.id` → `postId`) | **potvrdené**; sondu agent dodáva (`K46_podklady.md`) |
| Pasce: hook po `useState` (TS2448), výraz `{… ? … : null}` na začiatku `return`, sedem efektov v pôvodnom poradí, 5 varovaní `exhaustive-deps`, nepoužité importy, `t` nie je závislosť | agent zažil tie isté pasce (výraz v `return`, nepoužité importy, poradie efektov); varovaniam `exhaustive-deps` sa vyhol tým, že stav vlastní hook (nastavovače sa neodovzdávajú ako parametre) | **potvrdené**; bod 4 má dve cesty (časť 4) |
| Odtlačok HTML zachytí zmeny tried pružného stĺpca | agent: 11 z 11 skúšaných zmien tried zachytil odtlačok, testy 1 z 11 | **potvrdené** |
| Mobilný detail: 594 → 352 dvoma presunmi, čisté (kotva komentárov a rozhodnutie o posune ako vlastnosti) | agent: 594 → 368 (obsah 206, hlavička 155 riadkov), štyri stavy odtlačku bez zmeny | **potvrdené** |
| Verejné rozhranie: 5 importérov, `FeedPostMobileDetail` importuje len karta | agent: rovnaké importéri, rovnaký záver | **potvrdené** |

## 4. Rozdiely v spôsobe delenia a rozhodnutie

| # | Oblasť | Kolega | Agent | Rozhodnutie |
| --- | --- | --- | --- | --- |
| 1 | Počet krokov | 7 krokov (a až g), karta 440 | 10 krokov, karta 481 | **postup kolegu** (menej súborov), každý krok vlastný commit |
| 2 | Vrstvy a dialógy | jeden komponent a hook `useFeedPostCardLayers` s 12 vlajkami (krok c); 11 vlastností | dva komponenty (12 a 23 vlastností), stav ostáva v karte do hookov | **cesta kolegu** (menej vlastností); ak by sa počas kroku ukázal presun vlajok ako rizikový, najprv JSX a hook v ďalšom commite (cesta agenta) |
| 3 | Menu | stav menu sa presunie do hlavičky (krok e) | stav menu ostáva v karte (19 vlastností) | **cesta kolegu**; podmienka: test fokusu z dávky K48 (po Escape a pri fokuse na položke) prejde pred aj po kroku |
| 4 | Efekty a hooky (krok f) | všetkých 7 efektov v jednom hooku `useFeedPostCardSync` (13 parametrov, 5 varovaní `exhaustive-deps`), `useFeedPostCounts`, `useFeedPostCardActions` | E3 s označeniami a E6, E7 s vrstvami vo vlastných hookoch (stav v hooku), E1, E2, E4, E5 ostávajú v karte; bez varovaní | **rozhodne kolega pri kroku f**; spoločné pravidlá: poradie efektov nezmenené (sonda), hook sa volá na mieste pôvodného efektu, žiadne nové varovanie ESLint bez zdôvodnenia v commite; krok f sa robí ako tri samostatné commity |
| 5 | Text a fotky | ostávajú v karte | `FeedPostMedia.tsx` | **ostávajú v karte** (440 riadkov stačí) |
| 6 | Poradie | d (zdieľaný blok) pred c | JSX bez stavu, potom okno, potom hooky | **d pred c**, potom c, e, f |
| 7 | Typ vlastností | krok g (posledný) | spolu s `ActionButton` (krok 1) | **g spolu s a** (nulové riziko) |
| 8 | Ochrana | dávka 0 (karta) a 0m (mobilný detail, 25 testov), odtlačok, asi 35 testov | odtlačok, sonda efektov, testy podľa tých istých oblastí | **oboje spolu**: K48 a K49 (časť 5), sonda efektov je doplnok agenta |
| 9 | Opravy chýb | samostatne po kroku 0 | samostatne, po delení | rozhodol majiteľ (R66 (a), 21. 11. 2026): samostatná dávka K56 po poslednom presune |

## 5. Dohodnutý postup: dávky

Každá dávka je jeden PR, jeden ručný test majiteľa, zlúčenie mimo behu Playwrightu. Čísla dávok sú návrh, veľkosti karty sú odhad z prototypov kolegu (po presune typu vlastností do prvej dávky); karty K48 a K49 sú hotové, ďalšie pripraví agent po zlúčení predchádzajúcej.

| Dávka | Čo | Karta po dávke | Riziko | Poznámka |
| --- | --- | --- | --- | --- |
| **K48** | ochrana karty: asi 35 charakterizačných testov v 9 súboroch, dočasný odtlačok HTML (stavy kolegu a agenta), dočasná sonda poradia efektov | 1 033 | žiadne | len testy |
| **K49** | ochrana mobilného detailu: asi 25 testov, dočasný odtlačok 4 až 5 stavov | 1 033 | žiadne | len testy; ide po zlúčení K48 (kolegovi vždy len jedna dávka naraz) |
| K50 | kroky a a g (`FeedPostActionButton.tsx`, `FeedPostCard.types.ts`) a b (riadok akcií) | asi 860 | nulové až nízke | prvý presun, odtlačok a sonda |
| K51 | krok d (zdieľaný blok s označeniami) | asi 785 | stredné | samostatne: pružný stĺpec okna; ručný test okna na počítači |
| K52 | krok c (vrstvy a dialógy, hook vlajok) | asi 700 | stredné | dvanásť stavov do hooku |
| K53 | krok e (hlavička s menu, stav menu do hlavičky) | asi 570 | stredné | fokus, portál, Escape |
| K54 | krok f (tri hooky: obsluhy, počty a polling, synchronizácia stavu), tri commity | asi 440 | **vysoké** | efekty; najrizikovejšia dávka |
| K55 | mobilný detail (2 presuny) a **zmazanie dočasných odtlačkov a sond** | detail asi 350 | nízke | iPhone |
| K56 | opravy 355 a 356 (podľa R66 (a)) | – | nízke | nie je presun, vlastné testy |

Redizajn (344 a 261) začne agent podľa R64, R65 a R66 (a) až po K56, teda po poslednom presune aj po opravách; kedy presne, určí majiteľ (zatiaľ sa nič nemapuje ani nepripravuje).

## 6. Pravidlá pre všetky kroky delenia (spoločné pasce a poistky)

1. **Čistý presun:** JSX a obsluhy sa prenášajú doslova; mení sa len odsadenie a mená (napríklad `post.id` → `postId` v hooku); správanie a vzhľad sa nemenia; opravy chýb sa s presunom nemiešajú.
2. **Ochrana pred každým krokom:** nové testy z K48 a K49 a dočasný odtlačok HTML prechádzajú **bez úpravy** (nikdy `-u`); sonda poradia efektov dáva rovnaké poradie (premenovanie `post.id` → `postId` sa uvedie v texte commitu); existujúce testy sa nemenia.
3. **Hook sa volá až po `useState`, ktorého nastavovač dostane** (inak `tsc` hlási TS2448; kolega zažil pád 32 sád).
4. **Podmienený blok na začiatku `return`:** `{podmienka ? … : null}` v novom súbore je syntaktická chyba; použiť skorý `return null` alebo `return podmienka ? … : null`; koreň zdieľaného bloku musí vrátiť `null`, keď nie je čo ukázať.
5. **Pružný stĺpec okna (`fillHeight`):** nový komponent vracia ten istý koreň (`header`, `footer`, blok) bez obalu; `fixedBlock` ide ako vlastnosť; pružný blok si drží `flex-1` a `min-h-0`; pri krokoch d, c, e sa po nasadení robí ručný test okna na počítači (výška, posun, „Viac“, riadok akcií stále dole v nízkom okne).
6. **Efekty:** zostávajú v pôvodnom poradí (E1, E2, E3, E4, E5, E6, E7, polling); pri presune sa hook volá na mieste pôvodného efektu; E4 beží pred E5.
7. **ESLint:** žiadne nové chyby; nové varovanie `react-hooks/exhaustive-deps` sa neprijíma bez zdôvodnenia v commite; po každom presune sa v tom istom commite upratajú nepoužité importy a názvy.
8. **Kontroly po každom kroku:** súvisiace sady (kolega ich mal 43), `tsc`; na konci dávky celý Jest, ESLint dotknutých súborov, `npm run check:missing-translations` a build.
9. **Paritné mutácie:** po každej dávke zopakovať zoznam skúšobných pokazení (kolegov aj agentov, `K46_podklady.md`) nad novými súbormi: čo sa zachytilo pred delením, musí sa zachytiť aj po ňom (agent: 82 z 82 na prototype); výsledok do textu commitov.
10. **Nové testy:** v nových súboroch (R27), popisy po slovensky (R62), nad správaním a `data-testid`, bez mockov súborov, ktoré sa budú presúvať.
11. **Duplicity** karty a mobilného detailu (obsluha zmazania, tri položky menu, päť dialógov, ikony) sa zjednocujú až po delení, nie v ňom.

## 7. Nálezy z mapovania

- **355: okno zdieľania po úprave vlastného príspevku ukáže starý text** (obe mapovania nezávisle, dôkaz agenta aj kolegu). `FeedPostCard.tsx:1028` dáva `FeedPostShareModal` prop `post`, kým po úprave drží novú verziu `currentPost`. Dopad nízky. Oprava `post={currentPost}` a test.
- **356: obnova feedu počas prebiehajúceho lajku nechá v `currentPost` starý lajk** (kolega, agent reprodukoval). Efekt `:407-409` pri novom `post` vráti `currentPost` na staré hodnoty a efekt `:420-426` beží len pri zmene lajku, takže stav sa nepremietne; hook lajku medzitým sync preskočí. Mobilný detail a prehliadač fotky sa otvoria so starým lajkom, kým sa lajk alebo počet znova nezmení. Dopad nízky (úzke okno medzi lajkom a odpoveďou feedu). Oprava je v efektoch, preto samostatná dávka s testom.

## 8. Čo ostáva

Majiteľ rozhodol R66 (a) (21. 11. 2026), zlúči vetvu so zoznamom a pošle kolegovi kartu K48; K49 ide po zlúčení K48 a ďalšie karty po jednej, vždy na pokyn majiteľa (agent bez pokynu nič nemapuje ani nepripravuje). Po K56 príde podľa R64 rekapitulácia s vizuálnym návrhom.
