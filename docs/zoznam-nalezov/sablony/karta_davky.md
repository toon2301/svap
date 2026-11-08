# Karta dávky K__ (šablóna)

Vyplní agent, schváli majiteľ; kolega ju číta zo zoznamu v `main` alebo z odovzdaného textu. Jedna strana, najviac 4 nálezy.

**Druh rizika:** vzhľad / backend logika / závislosti, prihlásenie a infra (tretí druh ide vždy samostatne)
**Vetva:** `K__` z čerstvého `main`
**Pravidlá:** každý nález vo vlastnom commite; súbory nad 500 riadkov sa nemenia, len sa nahlásia; nové texty vo všetkých šiestich jazykoch; krátky docstring/JSDoc k novému kódu; nové nálezy len ako kandidáti (bez čísla).

## Nález __: krátky názov  [JASNÉ | NEJASNÉ]

- **Čo a kde:** `súbor:riadok`, čo sa deje a ako sa to prejavilo (ručný test majiteľa, test, log).
- **Najlepšia oprava:** návrh. Je to návrh agenta z čítania kódu, nie dôkaz; kolega ho overí a ak nedrží, napíše prečo.
- **Test:** čo musí pred opravou padať a po oprave prejsť.
- **Súbory a veľkosť:** zoznam súborov s počtom riadkov (limit 500).
- **Nerobiť:** čo je mimo dávky.
- **Čaká na:** logy, rozhodnutie alebo dôkazy (od koho).
- **Ručne po nasadení:** najviac 3 body.
- **Dopad na E2E:** ktoré špecy to môže zasiahnuť.

**Značky:** JASNÉ = kolega len rýchlo overí, že nález platí, a opraví. NEJASNÉ = kolega najprv mapuje a vráti zistenie, kód nemení, kým majiteľ (alebo agent) nepovie.
