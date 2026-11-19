<!-- Výsledok dávky K40 od kolegu, prevzatý 19. 11. 2026 bez zmeny obsahu (len táto poznámka). Agent overil 19. 11. 2026 z GitHubu a z `main` `561aaa8f`: PR #294 je zlúčené (merge `b2df1852`), mení 3 súbory (`useFeedCommentsScroll.ts` 82 → 125 riadkov, `feedCommentsLogic.ts` 178 → 223 a nový súbor testov 924 riadkov), CI (`checks`, `backend-postgres`) je zelené, vlákno CodeRabbitu je zatvorené, odtlačok HTML ani existujúce testy sa nemenili; merania v Chromiu nespúšťal. Zhrnutie je v nálezu 346 v `ZOZNAM.md`. -->

# Výsledok dávky K40 (nález 346)

**PR a commity:** `#294` zlúčené (13:47 UTC, zlúčenie `b2df1852`; +1 028 a −16 riadkov v 3 súboroch); nález 346, dva commity: `8f3f9274` „Oprava 346: nový komentár je celý viditeľný po odoslaní aj po ťuknutí“ a `f5c645ca` „Oprava 346: navrchu príspevku sa pri novom komentári nič nehýbe“ (oprava nálezu CodeRabbitu).
**Overenie:** Jest 611 sád a 9 274 testov prešlo (na `main` po K39: 610 a 9 201, teda +1 sada a +73 testov), odtlačok HTML 10 z 10 bez zmeny; `tsc`, ESLint dotknutých súborov a `check:missing-translations` (0 chýbajúcich a 0 nadbytočných) čisté; build: prvý beh po úspešnej kompilácii `SecurityFatalError` (verzia Next.js, nález 341), druhý s kódom 0; backend sa nemenil; CI (`checks`, `backend-postgres`) zelené; CodeRabbit: 1 nález (Minor, platný, opravený v `f5c645ca`), druhé kolo bez nálezov (Merge Risk: Minimal); Codex: bez nálezov na oboch commitoch.

## Po nálezoch

- **346 (JASNÉ):**
  - **Zmena:** `useFeedCommentsScroll.ts` (82 → 125 riadkov) a `feedCommentsLogic.ts` (178 → 223). S mobilnou hlavičkou nad komentármi sa po vlastnom komentári a po ťuknutí na indikátor zoznam posunie tak, aby bol prvý komentár 8 px pod horným okrajom plochy (predtým na 0, teda na vrch hlavičky); „pri vrchu“ sa meria od prvého komentára (±100 px). Bez hlavičky (počítač, panel nad fotkou, stránka príspevku) sa správanie nemení.
  - **Testy a mutácie:** 73 testov v novom súbore `useFeedCommentsScroll.firstComment.test.tsx` (pred opravou padalo 31 z prvých 55 a pri druhom commite 10 zo 73); mutácie 30 z 30 a 13 z 13 zachytených (prežívajúce z K38: S5, S7, S8, S13 až S19 a S21 sú už zachytené). Riziko nízke: správanie sa mení len pri mobilnej hlavičke.
  - **Meranie v Chromiu** (skutočný `FeedPostMobileDetail`, atrapa API, fotka 4:5, 6 komentárov, `isMobile`): pred opravou bol vlastný komentár viditeľný 63/112 px (393×659, krátky text) a 3/112 (päťriadkový), pri 390×700 104/112 a 44/112, pri 375×553 vždy 0. Po oprave je komentár celý viditeľný vo všetkých 12 prípadoch (3 rozmery × 2 dĺžky textu × vlastný komentár a ťuknutie na indikátor): 112/112 a 152/152 px, prvý komentár 8 px pod horným okrajom. Príspevok bez fotky (hlavička 122 px): vlastný komentár 112/112.
  - **Správanie po oprave pri cudzom komentári:** čitateľ do 100 px od prvého komentára (nad ním aj pod ním) ho vidí hneď plynulým posunom a indikátor nedostane; čitateľ nižšie dostane indikátor „N nových komentárov“ a po ťuknutí vidí komentár celý; kto je úplne navrchu príspevku (do 100 px od vrchu), tomu sa nič nehýbe a nič sa nehlási.
  - **Odchýlky od karty:** (1) „pri vrchu“ sa s hlavičkou meria na obe strany a úplne navrchu príspevku je ticho: karta čitateľa nad komentármi (text, fotka) nespomína a jednostranné meranie by ho pri prvom cudzom komentári vytrhlo ku komentárom; (2) hlavička sa zisťuje z DOM (zoznam nie je prvé dieťa plochy, nenulové rozmery), nie parametrom od rodiča, lebo `FeedPostComments.tsx` (573) a `FeedPostMobileDetail.tsx` (594) sa nesmú meniť; (3) príspevok bez fotky: po vlastnom komentári sa pohľad posunie o 114 px a text príspevku odíde hore (doteraz ostal na mieste), komentár je celý viditeľný; je to dôsledok R58 pre každú mobilnú hlavičku, nie osobitná vetva.
- **CodeRabbit (1 nález, Minor, platný, `useFeedCommentsScroll.ts:84`):** pri krátkej hlavičke sa pásmo „úplne navrchu“ prekrývalo s pásmom „pri začiatku komentárov“ (hlavička 160 px a `scrollTop` 100 posunuli zoznam na 152 px, hoci text commitu tvrdil opak). Opravené v `f5c645ca` čistou funkciou `isAtPostTop` s prednosťou pred `isNearCommentsStart`; návrh CodeRabbitu je upravený o `Math.min(NEAR_TOP_PX, commentsStart)`, aby pri hlavičke pod 100 px (nereálne, najkratšia nameraná je 122 px) čitateľ za začiatkom komentárov nový komentár nestratil. Pre každú reálnu hlavičku je výsledok rovnaký ako pri jeho návrhu.

## Čo overiť ručne (iPhone po nasadení, najviac 5 bodov)

1. Príspevok s fotkou a aspoň 3 komentármi: vlastný krátky aj päťriadkový komentár je po odoslaní celý viditeľný navrchu, vrátane tlačidiel pod ním, aj s otvorenou klávesnicou.
2. Druhý účet pridá komentár, kým prvý číta nižšie: zobrazí sa „1 nový komentár“; po ťuknutí je komentár celý viditeľný navrchu a indikátor zmizne.
3. Druhý účet pridá komentár, kým prvý je na začiatku komentárov (poloha po otvorení okna): komentár sa ukáže plynulým posunom bez indikátora.
4. Čitateľ úplne navrchu príspevku (číta text alebo fotku): po cudzom komentári sa nič nehýbe a nič sa nehlási. Príspevok bez fotky: po vlastnom komentári text príspevku odíde hore a komentár je celý viditeľný (nové správanie).
5. Bez zmeny: panel komentárov nad fotkou, desktopové okno detailu a stránka príspevku (nový komentár ide navrch zoznamu ako doteraz).

## Dopad na E2E

Žiadny existujúci špec sa nemení: scenár vlastného komentára (`feed-comments.ui.ts` s `support/feed-comments-ui.ts`) po odoslaní kontroluje `toBeVisible()`, nie `toBeInViewport`, mazanie ide cez ťuk, ktorý si prvok sám doscrolluje, a žiadny špec nepoužíva `feed-comments-new-indicator`; `feed-comments-scroll` sa vyskytuje len v diagnostickej atrape `diagnostics-tests/feed-comments-page.ts`, ktorá si ten prvok vytvára sama. Codex doplní pre `webkit-mobile` (iPhone 15, 393×659) po `expect(row).toBeVisible()` kontrolu `toBeInViewport({ ratio: 1 })` s príspevkom s fotkou a aspoň tromi komentármi.

## Kandidáti na nové nálezy

Žiadni.

## Poznámky

- Komentár pri `scrollRef` v `useFeedCommentsScroll.ts` hovorí, že nový komentár ide „na koniec“, hoci zoznam je najnovšie hore (nie nález, neopravovalo sa).
- Prvý komentár v prázdnom zozname hook pred commitom nezmeria, takže pre prvý cudzí komentár do prázdneho zoznamu platí staré pravidlo „pri vrchu“ (čitateľ do 100 px od vrchu dostane posun, ostatní indikátor); po commite sa už posúva na prvý komentár.
- Nový súbor testov má 924 riadkov (838 po prvom commite); `.cursor/rules/svaply.mdc` vyníma testové súbory z limitu 500 riadkov a ide o nový súbor, nie o zmenu existujúceho.

## Neoverené a obmedzenia

Merané v Chromiu s rozmermi iPhonu a s atrapou API, nie na skutočnom iPhone so Safari a klávesnicou (cieľ posunu nezávisí od výšky viditeľnej plochy, takže klávesnica naň podľa úvahy nemá vplyv, no neskúšalo sa to). Záporný `scrollTop` z odrazu na iOS je overený len jednotkovým testom. Ručný test na iPhone po nasadení robí majiteľ a jeho výsledok nie je súčasťou tejto strany.
