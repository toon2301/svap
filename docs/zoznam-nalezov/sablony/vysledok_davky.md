# Výsledok dávky K__ (šablóna pre kolegu, jedna strana)

Od K16 sa píše len pri NEJASNÝCH nálezoch (mapovanie), keď overenie nie je v textoch commitov, alebo keď má kolega kandidátov na nové nálezy.
Inak stačí číslo PR: agent číta overenie, mutácie a odchýlky od karty z commitov, CI a botov priamo z GitHubu.

**PR a commity:** `#__` (zlúčené / nezlúčené); jeden commit na nález, hash a názov.
**Overenie:** SQLite __ prešlo / __ preskočených; PostgreSQL __ prešlo; Jest __ sád a __ testov; tsc, build, ruff a black čisté; CI (`checks`, `backend-postgres`); stav CodeRabbit a Codex.

## Po nálezoch (1 až 3 vety na nález)

- **__:** čo sa zmenilo; testy (X, z toho Y padalo pred opravou); mutácie (A z B); riziko (nízke / stredné / vysoké a prečo). Ak návrh z karty nedržal, napísať prečo.
- Pri **NEJASNOM** nálezi (mapovanie): čo sa zistilo, aký je dôkaz, čo navrhuješ a čo ťa zastavilo; kód sa nemenil.

## Čo overiť ručne (najviac 5 bodov)

## Dopad na E2E

## Kandidáti na nové nálezy (najviac 5; bez čísla)

Každý: čo, kde (`súbor:riadok`), dôkaz (ako to overiť) a dopad na používateľa. Bez dôkazu alebo bez dopadu patrí do poznámok.

## Poznámky (bez čísla, jedna veta na poznámku)

## Neoverené a obmedzenia

Čo sa nedalo overiť (iPhone, merania v prehliadači, nastavenia Railway) a preto je len odhad.
