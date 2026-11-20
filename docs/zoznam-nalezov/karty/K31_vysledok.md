<!-- Výsledok dávky K31 od kolegu, prevzatý 20. 11. 2026 bez zmeny obsahu (len táto poznámka). Agent overil 20. 11. 2026 z gitu a z npm: vetva `K31` (commit `906f7c32` nad `main` `1c454330`) je nahratá, PR k nej ešte nie je a v `main` nie je (CI nebežalo); mení 2 súbory (`frontend/package.json` jeden riadok a `frontend/package-lock.json` 80 riadkov: 10 balíkov, všetky odkazy z `registry.npmjs.org`, verzia 16.4.5, kontrolný súčet sha512); bez konfliktu s `main` `f0c4b789`; vlastný `npm audit --omit=dev` nad zámkom: `main` 6 záznamov (`next` so siedmimi upozorneniami), vetva 5 záznamov bez `next` (nález 229). Zhrnutie je v nálezoch 341, 354 a 229 v `ZOZNAM.md`. -->

# Výsledok dávky K31 (upgrade Next.js, nález 341)

**PR a commity:** vetva `K31` z `main` `1c454330`, nahratá, PR nie je (otvára majiteľ); jeden commit `906f7c32` „Next.js 16.4.5: oprava siedmich bezpečnostných upozornení (341)“; 2 súbory (`frontend/package.json` a `frontend/package-lock.json`, +41 a −41 riadkov).
**Overenie:** celý Jest 615 sád a 9 352 testov prešlo (rovnako pred upgradom aj po ňom); `tsc` a `check:missing-translations` (0 a 0) čisté; ESLint: žiadny zdrojový súbor sa nemenil, preto sa lintoval celý `frontend` pred aj po, v oboch prípadoch 326 chýb a 429 varovaní s rovnakými hláseniami (existujú už na `main`, CI ESLint nespúšťa); `npm audit --omit=dev`: pre `next` sedem upozornení pred a žiadne po; `npm run build` dvakrát z čistého `.next`: pred upgradom prvý beh skončil výpisom Next.js `SecurityFatalError` (verzia Next.js, nález 341; kód 1) a druhý kódom 0, po upgrade oba behy kódom 0 a bez toho výpisu; zoznam ciest pred a po rovnaký (48 riadkov); CI a boty (CodeRabbit, Codex) sa ukážu po pushi, nevidel som ich.

## Po nálezoch

- **341 (JASNÉ, rozhodnutie v karte: najnižšia opravená verzia v rámci `^16`):**
  - **Zmena:** `next` `^16.4.3` → `^16.4.5`; zámok upravil `npm install next@16.4.5` (80 riadkov: `next`, `@next/env` a osem balíkov `@next/swc-*`, všetko 16.4.3 → 16.4.5; nič sa nepridalo ani neodstránilo). Kód aplikácie, `next.config.js`, `eslint-config-next`, `react` ani `overrides` sa nemenia. Nová hlavná verzia ani zmena kódu netreba, takže sa nebolo čoho zastavovať.
  - **Prečo 16.4.5:** karta uvádza jedno upozornenie (GHSA-mfr8-8qww-v76h), `npm audit` ich pre `next` hlási sedem a všetky majú rozsah končiaci na 16.4.4, takže 16.4.5 opravuje všetky. Verzia `latest` (16.4.6) sa neberie: karta žiada najnižšiu opravenú a 16.4.6 navyše mení správanie (kompresia odpovedí route handlerov).
  - **Riziko nízke:** 16.4.4 (zmeny Turbopacku, náhrada `jsonwebtoken` za `fast-jwt` vo vnútri Next.js, CI) a 16.4.5 (len bezpečnostné opravy); produkčný build beží cez webpack. Aplikácia nepoužíva `use cache`, `unstable_cache`, Cache Components, PPR, Edge runtime, middleware, route handlery ani `draftMode`; `next/image` má `remotePatterns` len pre lokálny backend a bez `dangerouslyAllowSVG`. Zraniteľný kód frameworku sa teda cez kód aplikácie nedosiahol, oprava ho odstráni aj s výpisom o zraniteľnej verzii pri zostavení.
  - **Produkčný beh v Chromiu (bez backendu):** `/`, `/login`, `/about`, `/faq` a `/contact` v sk aj en (10 načítaní), pred aj po rovnaké: stav 200, rovnaká cesta, `<html lang>` a texty zodpovedajú jazyku, 2 chyby v konzole na stránku (404 na `/api/auth/me/` bez backendu a zablokovaná externá požiadavka), žiadna chyba stránky; rozdiel v 10 načítaniach je 0.
  - **Odchýlky od karty:** (1) karta hovorí o jednom upozornení, ide o sedem (opravuje ich tá istá verzia); (2) veľkosti ciest sa neporovnávali, výpis buildu Next.js 16 ich neuvádza (porovnal sa zoznam ciest); (3) `eslint-config-next` ostáva 16.4.3 (nemá peer závislosť na `next`); (4) ESLint sa spustil nad celým `frontend`, lebo sa žiadny súbor nezmenil.

## Čo overiť ručne (najviac 5 bodov)

1. Log nasadenia na Railway po zlúčení: build neskončí výpisom o zraniteľnej verzii a nasadenie prejde.
2. Prihlásenie a Nástenka na počítači aj na iPhone (framework sa mení pre celú aplikáciu): otvoriť príspevok, komentáre a profil.
3. Verejné stránky `/`, `/about`, `/faq` a `/contact` v slovenčine a angličtine.
4. Nahrať fotku a skontrolovať, že sa obrázky z `/media/` zobrazujú (`next/image`).
5. Do Sentry po nasadení chodia hlásenia ako predtým (nemenil sa balík, len verzia Next.js).

## Dopad na E2E

Framework sa mení pre celú aplikáciu, DOM ani `data-testid` sa nemenia. Codex po nasadení spustí dym `@smoke` v okne dohodnutom s majiteľom; nič sa nezlučuje ani nenasadzuje počas behu Playwrightu.

## Kandidáti na nové nálezy

1. **Prázdny koreňový `package-lock.json`:** v koreni repozitára leží 83-bajtový zvyšok (`packages` bez balíkov, `package.json` v koreni nie je) a pri každom zostavení spôsobuje varovanie Next.js „inferred your workspace root“ (viac zámkov, ako koreň zvolil koreň repozitára). Dôkaz: začiatok výpisu `npm run build` pred aj po upgrade. Dopad: len hlásenie pri zostavení, nízka priorita (rieši `outputFileTracingRoot` alebo zmazanie zvyšku).

## Poznámky

- Po upgrade ostáva v `npm audit --omit=dev` 5 upozornení stupňa moderate (`glob`, `minimatch` a tri balíky Sentry); mimo karty, nemenilo sa.
- Zoznam (nález 341) uvádza, že prvý build z čistého stavu skončil výpisom `SecurityFatalError` štrnásťkrát zo štrnástich pokusov; ja som to na `main` videl pri jednom prvom builde (kód 1) a po upgrade ani pri jednom z dvoch buildov, takže 14 z 14 som neopakoval.

## Neoverené a obmedzenia

Beh s prihláseným používateľom, push a iPhone sa neoveril (dymový test robí majiteľ po nasadení); či výpis o zraniteľnej verzii zmizne aj v build logu na Railway, uvidí majiteľ v logu nasadenia; veľkosti ciest sa nemerali.
