# AGENTS.md – pravidlá pre agentov (Claude a Codex)

Tento súbor platí pre každého agenta, ktorý v repozitári pracuje. Kód, komentáre, commity a komunikácia s majiteľom sú po slovensky.

## Pravidlá, ktoré platia vždy

- Dodrž `.cursor/rules/svaply.mdc` (trvalé pravidlá projektu: malé zmeny, veľkosť súborov, testovanie, pravidlá pre Playwright) a `AGENT_SECURITY_RULES.md`.
- Rob malé, logicky oddelené zmeny. Čo je mimo zadanej úlohy, len nahlás, neopravuj to potichu.
- Súbory `.ts` a `.tsx` nad 500 riadkov sa nemenia, len sa nahlásia (zoznam je v `docs/zoznam-nalezov`, položka TECH-01…11). Novú logiku daj do nového súboru.
- Do kódu, logov, výpisov a príloh nikdy nedávaj osobné údaje, tokeny ani heslá. Súbor `frontend/.env.e2e` ostáva len na počítači majiteľa.
- Nič nevypisuj z odpovedí servera ani z textov stránky. Z výpisov chýb môžu ísť len cesty bez ID a slugov, názvy parametrov, počty a časy.
- PR otvára a zlučuje len majiteľ. Agent vetvu nahrá (push) a napíše, čo je v nej. Odpovede a uzatváranie vlákien na GitHube robí tiež majiteľ.
- Nikdy nezmäkčuj test, aby prešiel: nezvyšuj timeouty ani tolerancie, nepreskakuj ani nevypínaj testy a nepridávaj automatické opakovania bez dôkazu o príčine.

## Dvaja agenti, dve oblasti

| Oblasť | Vlastník |
| --- | --- |
| Playwright: `frontend/e2e/**`, `frontend/playwright.config.ts`, `docs/playwright-odovzdanie.md`, spúšťanie celých behov a rozbor pádov | Codex |
| Aplikácia: `frontend/src/**`, `backend/**`, Jest testy, závislosti, nasadenie | Claude |
| Zoznam nálezov: `docs/zoznam-nalezov/**` (čísla nálezov prideľuje len Claude, aby sa neopakovali) | Claude |

- Do oblasti toho druhého nezasahuj. Ak niečo treba zmeniť tam, napíš to majiteľovi vo vlastnej správe a majiteľ to odovzdá druhému agentovi.
- Ak zmena aplikácie vyžaduje úpravu E2E testu, Claude to uvedie v popise vetvy pod nadpisom „Dopad na E2E“ a test upraví Codex.

## Vetvy a zlučovanie

- Každá úloha má vlastnú vetvu z čerstvého `main`. Claude používa čísla (`155`, `156`…), Codex používa `e2e/<krátky-názov>`.
- Nikdy nepíš do vetvy druhého agenta. Pred každou úlohou si stiahni aktuálny `main` (po každom zlúčení sa mení).
- Počas celého behu Playwrightu sa nič nezlučuje do `main` ani nenasadzuje na Railway: Railway po zlúčení nasadí novú verziu a rozbehnutý beh by padal.

## Playwright

- Podrobnosti sú v `docs/playwright-odovzdanie.md`: ako sa beh spúšťa, posledný stav, známe pády, pravidlo porovnania behov a bloky `[E2E-EVIDENCE]`.
- Testy bežia proti Railway, WebKit (desktop aj mobil) je povinný a test, ktorý niečo vytvára, musí použiť existujúci testovací obsah alebo po sebe upratať.

## Hlásenie chyby aplikácie

Ak pád testu ukazuje chybu aplikácie, Codex ju nehlási ako nález s číslom, ale napíše majiteľovi krátky popis pre Claude:
názov, spec a projekt (napr. `webkit-mobile`), kroky, čo sa čakalo a čo sa stalo, koľkokrát z koľkých pokusov sa to zopakovalo, blok `[E2E-EVIDENCE]` a podozrivé miesto v kóde. Claude chybu zmapuje, opraví na vlastnej vetve a zapíše do zoznamu nálezov.
