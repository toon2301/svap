# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 305: kandidáti kolegu z K13 a K14, ručné testy majiteľa po K14 (8. 11. 2026) a diagnostika a video majiteľa
z 9. 11. 2026 (322 až 324) a ručné testy majiteľa po K17 s mapovaním agenta z 11. 11. 2026 (325 až 327; 325, 326 a 327 sú hotové v K18 a K21) a report Codexa po K19 (328) a ručné testy majiteľa po K20 s mapovaním agenta z 13. 11. 2026 (330 a 331; hotové 329, 330, 331 a 332 sú v `hotove_k20.py`), pravidlo majiteľa pri R2 (332), rozhodnutie R23 (333) a ručné testy majiteľa po K21 s kandidátmi kolegu (334 a 335; obe hotové v K22) a kandidát kolegu z K15 a K22 (336); hotové 328, 334 a 335 sú v `hotove_k20.py`.

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k40.DONE_SINCE_K40`; čísla sa nikdy nepoužívajú znova. Kandidát B kolegu (osem
`alert()` v súboroch nad 500 riadkov) je v nálezu 302, kandidát L (`require()` v `csrf.test.ts`) v nálezu 206 a kandidát N (kategórie
upozornení nie sú napojené na server) je spolu s nálezom majiteľa v 321.
Nález 333 (delenie veľkých súborov Nástenky) je od dávky K55 hotový; jeho text je v `hotove_k40.py`.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K14 = [
    dict(n=305, bucket=A, imp=N, eff=ES, pkg='Mazanie ponuky',
         kratko='hromadné mazanie mimo `anonymize_user` (administrácia, `delete_all_users`, kaskáda `User.delete()`) obchádza zámky z '
                '246, 232 a 296',
         what='Kolega pri K13 (8. 11. 2026): zámky z nálezov 246, 232 a 296 platia pre `delete()` modelov a pre `anonymize_user`, no '
               'hromadné `QuerySet.delete()` ich obchádza aj inde: akcia „Delete selected“ v Django administrácii (vstavaná akcia maže '
               'cez `queryset.delete()`), príkaz `delete_all_users` (`accounts/management/commands/delete_all_users.py`) a kaskáda pri '
               '`User.delete()`. Ak sa počas takého mazania potvrdí zdieľanie obsahu mazaného používateľa, vzniká ten istý súbeh ako v '
               '246 (HTTP 500 pri COMMIT). Agent overil, že príkaz `delete_all_users` existuje; správanie administrácie vyplýva z '
               'Djanga a neskúšalo sa.',
         note='Návrh kolegu: v administrácii mazať po jednom cez `delete_queryset` (a obdobne v príkaze). Ide o zriedkavé, ručné '
               'operácie majiteľa, preto skupina po nasadení. Odhad kolegu: nízky · S.',
         dec=None, src='K13 (kolega)'),
    dict(n=307, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='doslovné testovacie heslo `StrongPass123` v 94 súboroch (206 výskytov)',
         what='Kolega pri K14 (8. 11. 2026): doslovné testovacie heslo `StrongPass123` je v starých testoch backendu aj frontendu v '
               '206 výskytoch v 94 súboroch (agent 8. 11. 2026 spočítal rovnako). Je to testovací údaj, no `AGENTS.md` hovorí o '
               'heslách v kóde a nástroje na hľadanie tajomstiev ho môžu hlásiť.',
         note='Návrh kolegu: nahradiť heslom generovaným v teste alebo spoločnou konštantou. Veľký mechanický zásah bez zmeny '
               'správania, preto po nasadení. Odhad kolegu: nízky · M.',
         dec=None, src='K14 (kolega)'),
    dict(n=313, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra',
         kratko='`.animate-fade-in` je v `globals.css` definovaná dvakrát',
         what='Kolega pri K14 (8. 11. 2026): trieda `.animate-fade-in` je v `frontend/src/app/globals.css` definovaná dvakrát (riadky '
               '111 a 381; posledná posúva obsah o 20 px a trvá 0,6 s) a ďalší výskyt je v bloku `prefers-reduced-motion`. K14 preto '
               'zaviedla vlastnú animáciu `content-in`. Agent výskyty overil.',
         note='Návrh: zjednotiť definície (platí tá, ktorá je v súbore neskôr) a po zmene skontrolovať miesta, kde sa trieda používa. '
               'Odhad kolegu: nízky · S.',
         dec=None, src='K14 (kolega)'),
    dict(n=314, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='Jest hlási „A worker process has failed to exit gracefully“, aj na čistom `main`',
         what='Kolega pri K14 (8. 11. 2026): celý Jest vypíše „A worker process has failed to exit gracefully“ aj na čistom `main`; '
               'niektorý test po sebe nechá otvorený časovač alebo spojenie. Agent to nereprodukoval.',
         note='Návrh kolegu: nájsť test cez `--detectOpenHandles`. Odhad kolegu: nízky · M.',
         dec=None, src='K14 (kolega)'),
    dict(n=315, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra',
         kratko='mŕtve alebo zavádzajúce konfigurácie: `railway.json`, `backend/nixpacks.toml`, `Procfile`, `backend/Procfile`, '
                '`Dockerfile.backup`',
         what='Kolega pri K14 (8. 11. 2026): Railway podľa neho nečíta `railway.json` (pole `services` nie je schéma Railway) a '
               'backend stavia z `backend/Dockerfile`; `backend/nixpacks.toml`, `Procfile` v koreni, `backend/Procfile` a '
               '`Dockerfile.backup` v koreni sú podľa neho mŕtve alebo zavádzajú. Agent overil, že súbory existujú a že `railway.json` '
               'má len kľúče `$schema` a `services`; či ich Railway číta, z repozitára nevidno. Príloha C (hosting) pritom uvádza '
               '`railway.json` ako súčasť skutočného predpisu nasadenia a `Dockerfile.backup` je už v zozname cudzích súborov (nález '
               '32).',
         note='Treba potvrdenie majiteľa v nastaveniach Railway: majú backend-http, backend-ws, worker a beat Root Directory '
               '`backend` a builder Dockerfile? Až potom súbory odstrániť a opraviť prílohu C. Odhad kolegu: nízky · S.',
         dec=None, src='K14 (kolega)'),
    dict(n=316, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         kratko='`next dev` generuje nesledovaný `frontend/AGENTS.md`; hrozí náhodný commit',
         what='Kolega pri K14 (8. 11. 2026): `next dev` (Next 16) vygeneruje nesledovaný `frontend/AGENTS.md` (nastavenie '
               '`agentRules`). Hrozí jeho náhodný commit a zásah do pravidiel agentov, lebo agenti čítajú `AGENTS.md` aj v '
               'podpriečinkoch. Agent v čistom klone súbor nenašiel (vzniká až za behu) a nastavenie `agentRules` v Next neoveril.',
         note='Návrh kolegu: `agentRules: false` v `next.config.js` alebo záznam v `.gitignore`. Odhad kolegu: nízky · S.',
         dec=None, src='K14 (kolega)'),
    dict(n=317, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='zámok závislostí backendu je bez hashov',
         what='Kolega pri K14 (8. 11. 2026): `backend/constraints.txt` pripína verzie, no bez hashov súborov, takže neochráni pred '
               'podvrhnutým balíkom s rovnakou verziou.',
         note='Návrh kolegu: `pip-compile --generate-hashes` a `--require-hashes` ako dodatočné spevnenie; vyžaduje zmenu postupu '
               'obnovy a všetkých inštalácií. Odhad kolegu: nízky · M.',
         dec=None, src='K14 (kolega)'),
    dict(n=319, bucket=P, imp=N, eff=EM, pkg='Upozornenia a push',
         kratko='Upozornenia: pri vypnutom internete sa prepínač Správ prepne bez chybovej hlášky a stav ostane po pripojení (príčina '
                'nejasná); oprava je v kóde (K20), čaká na ručný test na iPhone)',
         what='Ručný test majiteľa po K14 (8. 11. 2026, iPhone, Nastavenia → Upozornenia): pri vypnutej Wi-Fi aj mobilných dátach (aj '
               'v režime lietadlo) sa dá meniť nastavenie upozornení na správy a prepínač reaguje bez chybovej hlášky; po opätovnom '
               'pripojení a obnovení stránky ostane zmenený stav. Očakávané: pri nemožnosti uložiť sa ukáže chyba „Nepodarilo sa '
               'uložiť nastavenia upozornení.“ Nie je potvrdené, či sa zmena naozaj uložila na server, alebo ide o problém zobrazenia.',
         note='Mapovanie agenta (8. 11. 2026, len čítanie): voľba Správy (push) je napojená na server. '
               '`useNotificationPreferences.ts` pri uložení najprv zmení hodnotu v rozhraní, pošle `PATCH` a pri zlyhaní hodnotu vráti '
               'a chybu ukáže `PushMessagesStatus` (`role=alert`); service worker posiela `/api/` priamo do siete bez náhradnej '
               'odpovede, takže pri skutočnom offline by sa chyba mala ukázať. Pozorovanie sa preto z kódu nedá vysvetliť. Možnosti: '
               '(1) otestovaný bol jeden z piatich ostatných prepínačov alebo hlavný vypínač, ktoré sú len lokálny stav bez volania '
               'servera (nález 321) a po „obnovení“ ostali v otvorenej aplikácii; (2) požiadavka na iPhone nezlyhala hneď, ale čakala '
               'na obnovenie spojenia a potom prešla (hypotéza). Pri overení treba vedieť, ktorý prepínač a či sa hodnota zmenila aj '
               'po úplnom zatvorení a novom otvorení PWA. Ďalšie zistenie: texty chýb v `useNotificationPreferences.ts` a '
               '`usePushMessagesPreference.ts` sú napevno v kóde bez diakritiky a bez prekladu („Nepodarilo sa ulozit nastavenia '
               'upozorneni.“ a ďalšie), takže aj správne zobrazená chyba by mala iné znenie, než majiteľ očakáva, a nepreložila by sa. '
               'Návrh: texty cez `t()` s diakritikou v šiestich jazykoch; pri `navigator.onLine` rovnom `false` prepínač neprepínať a '
               'hneď ukázať chybu; súvisí s nálezom 306. Odhad: nízky · M. Otázka, ktorý prepínač sa testoval, ostáva, '
               'kým 321 neprepojí aj ostatné kategórie. STAV 12. 11. 2026: server je pripravený (K19) a oprava ide v K20 spolu s etapou 3 '
               'nálezu 321, lebo oba menia tie isté súbory; po K20 majú všetkých sedem volieb rovnaké ukladanie, vrátenie hodnoty a '
               'chybu, takže otázka, ktorý prepínač sa testoval, stratí význam. Mapovanie z K16 od kolegu nedošlo, K20 ho urobí ako '
               'krok 0. Ak sa prejav (zmena offline bez chyby) ukáže aj po K20, ide o nový nález. '
               'STAV 13. 11. 2026: KÓD JE HOTOVÝ V K20 (PR #258, zlúčené 12. 11. 2026, commit `8525ce0e`): pre všetkých sedem volieb '
               'vrátane Správ platí, že pri `navigator.onLine === false` sa nič neodošle, hodnota sa nezmení a hneď sa ukáže preložený '
               'toast s chybou; pri zlyhaní `PATCH` sa vráti len zmenená hodnota a ukáže sa preložená chyba; texty sú cez `t()` s '
               'diakritikou vo všetkých šiestich jazykoch (`preferencesLoadFailed`, `preferencesSaveFailed`, `preferencesOffline` a '
               'osem kľúčov `push*`); zapnutie Správ bez internetu sa zastaví hneď, ešte pred vyžiadaním povolenia a registráciou '
               'odberu. Časový limit pre visiacu požiadavku sa nezaviedol (karta ho zakazovala, `lib/api.ts` sa nemenil), takže pri '
               '`navigator.onLine === true` môže požiadavka visieť do globálnych 30 s a zmena sa vtedy ukáže až po jej skončení. '
               'Strana k mapovaniu (krok 0) sa k agentovi nedostala, preto príčina pôvodného pozorovania ostáva nezdokumentovaná. '
               'Overenie podľa kolegu: 37 testov hooku (pred zmenou padalo 23 z vtedajších 35) a 3 testy offline pre Správy; mutácia '
               '„odstrániť kontrolu `navigator.onLine`“ je zachytená. ZOSTÁVA: ručný test (c) z karty K20 (režim lietadlo na iPhone: '
               'prepínač sa neprepne a ukáže sa preložená chyba, po pripojení a obnovení ostane pôvodná hodnota), ktorý majiteľ zatiaľ '
               'nepotvrdil; nález sa zatvorí po jeho potvrdení. Dopad na E2E: žiadny.',
         dec=None, src='ručný test majiteľa po K14 a mapovanie agenta (8. 11. 2026)'),
    dict(n=343, bucket=P, imp=N, eff=ES, pkg='Vzhľad Nástenky',
         kratko='úchytka panela komentárov nad fotkou na mobile je kvôli globálnemu `button { min-height: 36px }` sivý ovál 40×36 px '
                'namiesto tenkej úchytky; oprava podľa R55',
         what='Majiteľ pri návrhu vzhľadu komentárov (17. 11. 2026, snímka z mobilného zobrazenia): sivý kruh hore v paneli komentárov nad '
               'fotkou nie je kurzor z nástrojov prehliadača, ale úchytka panela (potiahnutie nadol alebo ťuk panel zatvorí; '
               '`feed/FeedPhotoCommentsSheet.tsx`, 126 riadkov). Agent overil čítaním kódu: úchytka je `button` s triedami '
               '`mx-auto block h-1.5 w-10 rounded-full`, teda 6 px vysoké tlačidlo, no globálne pravidlo `button { min-height: 36px }` '
               'v `frontend/src/app/globals.css` (riadok 263) ho natiahne na 36 px, takže vznikne sivý ovál 40×36 px, ktorý odtláča '
               'nadpis „Komentáre“ nižšie. Platí na všetkých zariadeniach (pravidlo nemá podmienku). Jednoduché hľadanie podobný '
               'prípad (tenké tlačidlo s pevnou výškou pod 36 px) inde nenašlo; ostatné úchytky v aplikácii sú `div`.',
         note='ROZHODNUTÉ (R55, majiteľ 17. 11. 2026, podľa odporúčania agenta): tenká úchytka 40×6 px (možnosť A, obrázok '
               '`navrhy/mobil-uchytka.png`), nie šípka ani bez úchytky; ťuk aj potiahnutie nadol fungujú ďalej a neviditeľná plocha na '
               'ťuk má aspoň 44 px. Návrh (neoverený): tlačidlo s priehľadnou plochou a vnútornou tenkou čiarou, globálne pravidlo '
               '`button` sa nemení. JASNÉ: jeden malý súbor pod 500 riadkov a test; nesúvisí s delením `FeedPostComments.tsx`, takže môže '
               'ísť aj pred ním. Po nasadení krátky ručný test majiteľa na mobile. Odhad: nízky · S.',
         dec='ROZHODNUTIE R55', src='majiteľ (17. 11. 2026) a kontrola agenta čítaním kódu'),
    dict(n=344, bucket=P, imp=N, eff=EM, pkg='Vzhľad Nástenky',
         kratko='okno detailu príspevku na počítači: zdieľaná ponuka a portfólio v dvoch stĺpcoch ako príspevok s '
                'fotkou a užšie okno príspevku len s textom (R53)',
         what='Prianie majiteľa (17. 11. 2026, po snímkach okien detailu): (a) okno zdieľanej ponuky a zdieľaného '
              'portfólia má mať rovnaké rozloženie a logiku ako okno príspevku s fotkou: vľavo hlavička, text, karta '
              'ponuky (portfólia) a riadok s lajkom, vpravo stĺpec „Komentáre“ s poľom na komentár dole; pevná výška '
              'okna, karta vyplní zvyšok ľavého stĺpca, riadok akcií stále dole, text so „Viac“; klik na kartu '
              'ostáva (otvorí ponuku alebo portfólio). (b) Okno príspevku len s textom bude užšie (asi 580 px '
              'namiesto 864 px; hore príspevok, pod ním komentáre, pole na komentár pri spodku); dva stĺpce pre text '
              'majiteľ zamietol. STAV V KÓDE (čítanie agenta): `FeedPostDetailOverlay.tsx` (385 riadkov) volí '
              '`splitLayout = hasPhoto && !isMobile`, kde `hasPhoto` je vlastná viditeľná fotka alebo repost foto '
              'príspevku (`sharedFeedPostPhoto`); zdieľaná ponuka a portfólio sú jednostĺpcové (`sharedFillsColumn`, '
              'karta s vlastným posunom, v okne sa orezáva); `FeedPostDetailSplitLayout.tsx` (144 riadkov) kreslí '
              'vľavo 56 % `FeedPostCard variant="detail" fillHeight` a vpravo 44 % nadpis a `FeedPostComments`; '
              'šírka okna je `max-w-[54rem]` (864 px), pri dvoch stĺpcoch pevná výška `95vh`.',
         note='Odhad dotyku (neoverený): rozšírenie podmienky `hasPhoto`, šírka okna pri texte a prípadne vzhľad '
              'karty v ľavom stĺpci; `FeedPostCard.tsx` má 1 033 riadkov (nad 500), takže zmena ide buď bez zásahu '
              'do nej, alebo až po jej delení (`FeedPostComments.tsx` je po delení 401 riadkov); kolega najprv '
              'mapuje (NEJASNÉ): mapovanie je časť 2 karty K45 (`karty/K45.md`, pripravená 19. 11. 2026) a o poradí '
              'voči redizajnu komentárov a deleniu `FeedPostCard.tsx` rozhodne majiteľ po mapovaní. Dopad na E2E: '
              'špecy okna detailu (`feed-post-detail.spec.ts`) a nový scenár komentárov (257) používajú okno len s '
              'textom, treba ich pozrieť. Vzhľad schválil majiteľ (R49, R53; obrázky `navrhy/pc-okno-ponuka.png` a '
              '`navrhy/pc-okno-text.png`). Odhad: nízky · M. MAPOVANIE HOTOVÉ (K45, PR #302, 20. 11. 2026, kolega; '
              '`karty/K45_vysledok.md`; agent overil kľúčové tvrdenia čítaním kódu na `main` `f0c4b789`: riadky, '
              'súbory, štyri testy a E2E odkazy sedia). KDE SA ROZHODUJE: `FeedPostDetailOverlay.tsx:220-222` '
              '(`hasPhoto`, `splitLayout = hasPhoto && !isMobile`, hranica 1 024 px z `useIsMobile`), rám okna '
              '`:267-269` (`max-w-[54rem]` vždy; `h-[95vh]` pri dvoch stĺpcoch, inak strop `max-h-[95vh]`), '
              'dvojstĺpcová vetva `:306-319`, jednostĺpcová `:320-379`; telo dvoch stĺpcov '
              '`FeedPostDetailSplitLayout.tsx:99-142`. (A) PONUKA A PORTFÓLIO V DVOCH STĹPCOCH BEZ ZÁSAHU DO '
              '`FeedPostCard.tsx`: predikát „zdieľa ponuku alebo portfólio“ vedľa `hasVisibleFeedPhoto` v '
              '`FeedPostDetailSplitLayout.tsx`, jeho pridanie do `:222` a oprava komentárov v oboch súboroch; karta '
              'v režime `fillHeight` drží hlavičku, riadok „… ponúka výmenu ďalej“ a riadok akcií pevne '
              '(`FeedPostCard.tsx:329`, `:580-585`, `:600-604`, `:862-864`), zdieľaný blok je pružný a posúva sa '
              'vnútri (`:781-799`), „Viac“ má strop `max-h-[40vh]` (`FeedPostCaption.tsx:68-69`) a fotka karty '
              'ostane 256 px (`SharedContentPreviewCard.tsx:33`, `h-64`), ako je v návrhu („obsah karty sa nemení“). '
              '(B) UŽŠIE OKNO LEN S TEXTOM, TIEŽ BEZ `FeedPostCard.tsx`: len podmienená šírka rámu `splitLayout ? '
              'h-[95vh] max-w-[54rem] : max-h-[95vh] max-w-xl` (576 px, návrh hovorí asi 580). DÔKAZ: prototyp v '
              'kópii mimo repozitára (+9 a −3 riadky v dvoch súboroch): zo 365 testov v 11 súvisiacich sadách padajú '
              'práve 4, všetky vo `FeedPostDetailOverlay.test.tsx` (797 riadkov): dva o šírke textového okna '
              '(`:621`, `:631`) a dva o ponuke v jednostĺpcovom okne (`:273`, `:281`); ostatných 361 prechádza. '
              'KOMENTÁRE A K40: oprava 346 platí len v mobilnom detaile (`useFeedCommentsScroll.ts:37-45`), v okne '
              'na počítači majú komentáre vlastný obal; 344 sa dotýka len `FeedPostDetailOverlay.tsx` (385 → okolo '
              '395 riadkov) a `FeedPostDetailSplitLayout.tsx` (144 → okolo 165), redizajn komentárov (K44) súborov '
              'komentárov, takže nekolidujú; odporúčané poradie: 344 pred K44. E2E: žiadny existujúci špec nepadne '
              '(`feed-post-detail.spec.ts:85-123`, `notification-click.spec.ts:150-170`, scenár komentárov '
              '`support/feed-comments-ui.ts:26-29` hľadá `feed-post-overlay`, `feed-post-overlay-comments` a '
              '`feed-post-comments`, ktoré existujú v oboch rozloženiach; čísla riadkov E2E súborov sú zo `main` '
              '`1c454330`, pred PR #301, ktorý ich posunul; nové scenáre 345 a 346 z PR #301 mapovanie nezahŕňalo, '
              'preto ich treba pri K57 skontrolovať tiež: podľa názvov a `data-testid` sa nezdá, že by ich zmena '
              'okna rozbila); Codex po nasadení doplní kontrolu rozloženia na čítanie (príspevok s fotkou, ponuka, '
              'portfólio a textový: `feed-post-overlay-split` je alebo nie je, šírka okolo 864 resp. 576 px, výška '
              '95 % pri dvoch stĺpcoch, pole „Napíš komentár...“ a riadok akcií celé v okne). ROZSAH A RIZIKO: jedna '
              'dávka (K57), dva commity (najprv ponuka a portfólio, potom úzke okno), nové testy v novom súbore '
              '(okolo 200 riadkov), v `FeedPostDetailOverlay.test.tsx` sa menia len tie štyri testy (R27); riziko '
              'nízke pre dáta, stredné pre vzhľad (výška, šírka a posun sa dajú overiť len v prehliadači); delenie '
              '`FeedPostCard.tsx` (K46) nie je podmienkou. Pri tejto dávke sa opraví aj zastaraný komentár '
              '`FeedPostDetailOverlay.tsx:361-362` (hovorí o `max-h-[90vh]`, kód má `95vh`). KARTA K57 NAPÍSANÁ 23. 11. 2026 '
              '(agent, po odpovediach majiteľa: R63 zodpovedané, nové R68): `karty/K57.md` a podklady `karty/K57_podklady.md`; '
              'štyri kódové kroky (ponuka a portfólio v dvoch stĺpcoch, pružná plocha fotky karty, užšie okno len s textom '
              '576 px a oprava komentárov v jednostĺpcovom okne, nález 363 podľa R69) a manuál ručných testov; kód píše kolega '
              '(R67, zmena R64). DOPLNOK 20. 11. 2026 '
              '(agent, čítanie kódu po správe majiteľa): majiteľ upresnil, že ponuka a portfólio majú v okne na '
              'počítači fungovať „tak ako príspevok s foto“, teda fotka karty vyplní zvyšok ľavého stĺpca (pri fotke '
              'príspevku je to pružný blok `feed-post-media-fill`, `FeedPostCard.tsx:742-760`, so spodnou hranicou 8 '
              'rem). Tvrdenie z mapovania, že natiahnutie karty ide bez zásahu do `FeedPostCard.tsx`, sa '
              'nepotvrdilo: `SharedContentPreviewCard` v okne vykresľuje len `FeedPostCard.tsx:803-815` a bez výšky '
              '(nemá vlastnosť výšky a fotka má pevné `h-64`), obal `:781-799` je blok s `space-y-3`, nie flex '
              'stĺpec, takže treba drobné zmeny aj v `FeedPostCard.tsx` (podať karte výšku a prepnúť obal na flex '
              'stĺpec) a novú vlastnosť v `SharedContentPreviewCard.tsx`. Dva stĺpce a úzke okno len s textom '
              'ostávajú bez zásahu do `FeedPostCard.tsx` (tá časť mapovania platí). `FeedPostCard.tsx` má 1 033 '
              'riadkov, takže zmena je možná len po vyčlenení zdieľaného bloku (čistý presun podľa R23, v odhade K46 '
              'krok `:781-860`) alebo s jednorazovou výnimkou majiteľa; preto bod 3 v R63. DOPLNOK 21. 11. 2026 '
              '(agent): majiteľ potvrdil, že krokom kolegu pred redizajnom je K31 (zlúčená, PR #304), a schválil R65 '
              '(a): poriadne delenie `FeedPostCard.tsx` pred redizajnom; natiahnutie fotky karty teda ide až po '
              'delení karty (K46) a z bodu 3 v R63 ostáva možnosť (c). DOPLNOK 23. 11. 2026 (agent): majiteľ schválil '
              'odporúčania (R63 a R68); prototyp v kópii mimo repozitára overil postup (4 produkčné súbory a nový '
              '`FeedDetailSplitContext.tsx`, 66 nových testov, 31 zásahov zachytených, štyri existujúce testy sa menia, '
              'celý Jest, `tsc` a ESLint čisté, scény, ktoré sa nemajú zmeniť, v Chromiu pixel po pixeli rovnaké); '
              'natiahnutie fotky karty ide bez zásahu do `FeedPostCard.tsx` (kontext namiesto vlastnosti karty, lebo '
              'karta má 498 riadkov). Po nasadení kontrola Codexu a ručný test majiteľa.',
         dec='ROZHODNUTIE R63 a R68', src='majiteľ (17. a 23. 11. 2026)'),
    dict(n=347, bucket=P, imp=N, eff=ES, pkg='Súkromie a krajina',
         kratko='ponuky účtov `is_staff` a `is_superuser` sú cez priame id dostupné a dajú sa lajkovať, hoci ich vyhľadávanie ani '
                'vytvorenie žiadosti nepustí; treba rozhodnúť, či je to zámer',
         what='Kolega pri K30 (18. 11. 2026, sonda mimo repozitára: vlastník staff aj superuser, cudzí prihlásený divák): detail ponuky '
              'vráti 200, lajk 201 a riadok `OfferedSkillLike` sa uloží, kým vo vyhľadávaní ponuka nie je. Agent overil čítaním kódu '
              '(18. 11. 2026): `offer_hidden_from_user` (`accounts/services/offer_visibility.py`) nemá pravidlo pre staff ani '
              'superuser, kým `searchable_user_q` (`accounts/search_visibility.py`) vyžaduje `is_staff=False` a `is_superuser=False` '
              'a vytvorenie žiadosti o ponuku (`accounts/views/skill_requests.py` a `accounts/skill_request_serializers.py`) takéto '
              'účty odmieta. Rovnaký vzor ako 339 s iným dôvodom. Dopad: obsah administrátorských účtov je cez priame id dostupný a '
              'dá sa naň dávať lajky. Sondu agent nespúšťal.',
         note='NEJASNÉ: pred opravou treba rozhodnúť, či sa majú ponuky účtov staff a superuser skrývať aj pri priamom prístupe '
              '(konzistentne s vyhľadávaním), alebo je to zámer (napríklad ponuky vlastného administrátorského účtu majiteľa). Agent '
              'pripraví otázku s odporúčaním, keď nález príde na rad. Ak sa rozhodne skrývať: jedna podmienka v '
              '`offer_hidden_from_user` v tom istom tvare ako pri 339, testy a kontrola ostatných volajúcich pomocníka. Skupina a '
              'dôležitosť sú predbežný návrh agenta (súkromie ako 339, nízka dôležitosť, lebo ide o administrátorské účty). Odhad: '
              'nízky · S.',
         dec=None, src='K30 (kolega, 18. 11. 2026) a kontrola agenta čítaním kódu'),
    dict(n=348, bucket=P, imp=N, eff=ES, pkg='Súkromie a krajina',
         kratko='osirotená recenzia (ponuka zmazaná) neaktívneho hodnoteného používateľa je cez priame id viditeľná a dá sa lajkovať',
         what='Kolega pri K30 (18. 11. 2026, sonda mimo repozitára: ponuka zmazaná, hodnotený vlastník neaktívny, cudzí prihlásený '
              'divák): `review_hidden_from_user` vráti False, detail recenzie 200, lajk recenzie 201 a riadok `ReviewLike` sa uloží. '
              'Agent overil čítaním kódu (18. 11. 2026): vetva pre `offer=None` v `review_hidden_from_user` '
              '(`accounts/services/offer_visibility.py`) kontroluje súkromný profil a blok hodnoteného používateľa, ale nie '
              '`is_active`; pri existujúcej ponuke pomocník deleguje na `offer_hidden_from_user`, ktorý od K30 neaktívneho vlastníka '
              'skrýva. Dopad: text recenzie deaktivovaného účtu ostáva cez priame id dostupný a dá sa naň dávať lajky; prípad je '
              'zriedkavý (ponuka musí byť zmazaná). Sondu agent nespúšťal.',
         note='Návrh (neoverený): doplniť do vetvy `offer=None` kontrolu `is_active` hodnoteného používateľa (rovnaký tvar ako pri 339) '
              'a testy; malá backendová oprava, môže ísť spolu s 347. Skupina a dôležitosť sú predbežný návrh agenta (súkromie ako '
              '339, nízka dôležitosť pre zriedkavý prípad). Odhad: nízky · S.',
         dec=None, src='K30 (kolega, 18. 11. 2026) a kontrola agenta čítaním kódu'),
    dict(n=349, bucket=P, imp=S_, eff=EM, pkg='Bezpečnosť a produkčná odolnosť',
         kratko='deaktivovaný účet ostáva autentifikovaný, kým platí cache autentifikácie (predvolene 24 hodín), ak sa deaktivuje bez '
                '`save()` alebo v súbehu s vlastnou požiadavkou toho účtu',
         what='Kolega pri K30 (18. 11. 2026, druhý commit `2f5ba6ef`, sonda mimo repozitára, len stavové kódy): po prihlásení, teplej '
              'cache autentifikácie a `QuerySet.update(is_active=False)` bez `post_save` vráti detail vlastnej ponuky 200, hoci '
              'databáza má `is_active=False`; to isté cez `save()` dá 401. Agent overil čítaním kódu (18. 11. 2026): '
              '`SwaplyJWTAuthentication.get_user` (`accounts/authentication.py`) pri zásahu cache verí uloženému `is_active` a po '
              'čítaní z databázy ho zapíše na `AUTH_USER_REDIS_CACHE_TTL_SECONDS`, predvolene 86 400 s '
              '(`accounts/authentication_helpers.py`, riadok 53); cache sa zneplatňuje pri `save()` používateľa '
              '(`accounts/signals.py`, `invalidate_auth_cache_after_user_save`) a výslovnými volaniami. Súbeh (čítanie z databázy '
              'pred deaktiváciou, zápis do cache až po zneplatnení) vedie k tomu istému stavu; netestoval sa, vyplýva z poradia '
              'riadkov. Dopad: deaktivovaný účet môže až do vypršania cache používať koncové body, ktoré sa spoliehajú na autentifikáciu '
              '(pri zásahu cache sa používateľ stavia z uloženého stavu, takže aj kontrola `request.user.is_active` vidí uloženú '
              'hodnotu; koncové body, ktoré čítajú stav žiadateľa priamo z databázy, by ho mohli odmietnuť; agent ich nehľadal a '
              'kolega sondou overil jeden: detail vlastnej ponuky 200); v kóde aplikácie sa účty deaktivujú cez `save()` '
              '(administrácia, `anonymize_user`), takže ide o okrajové cesty (hromadný `update()`, SQL, zásah do databázy) a '
              'súbeh. Neoverené: účinné hodnoty `AUTH_LAZY_USER_ENABLED` (predvolene zapnuté) a '
              '`AUTH_USER_REDIS_CACHE_TTL_SECONDS` v Railway. Sondu agent nespúšťal.',
         note='NEJASNÉ: najprv rozhodnúť dôležitosť a postup; agent pripraví otázku s odporúčaním. Možnosti (neoverené): zneplatniť '
              'cache pri každej ceste deaktivácie (hromadné operácie volajú výslovnú invalidáciu), skrátiť TTL alebo overovať '
              '`is_active` pri každom zásahu cache (spomalí požiadavky); oprava súbehu pri zápise do cache je samostatná zmena. '
              'Dôležitosť je predbežná (agent: stredná, lebo ide o okrajové cesty a súbeh); ak majiteľ plánuje hromadné deaktivácie '
              'v administrácii (akcie s `update()`), zvýšiť. Súvisí s 339 (docstring v `offer_hidden_from_user` o výnimke pre '
              'vlastníka). Odhad: stredný · M.',
         dec=None, src='K30 (kolega, druhý commit `2f5ba6ef`, 18. 11. 2026) a kontrola agenta čítaním kódu'),
    dict(n=353, bucket=P, imp=N, eff=ES, pkg='Vzhľad Nástenky',
         kratko='komentáre: chybová hláška pri donačítaní odpovedí (`feed.repliesLoadError`) sa ukáže aj pre dopyt, '
                'ktorý zneplatnila mutácia alebo zmena príspevku (zastaraný pokus), na rozdiel od donačítania '
                'komentárov; jedna zbytočná hláška po pridaní komentára počas donačítavania odpovedí',
         what='Kolega pri K43 (19. 11. 2026): v `useFeedCommentsLoader.ts`, `loadMoreReplies` (vetva `catch`) sa '
              '`toast.error` s `feed.repliesLoadError` ukáže aj pre dopyt, ktorý zneplatnila mutácia alebo zmena '
              'príspevku, kým `loadMore` pri komentároch v takom prípade nehlási (kontrola `seq === '
              'loadSeqRef.current`). Dôkaz (Jest sonda, `FeedPostComments.repliesPauseStale.test.tsx`, druhý test): '
              'po pridaní komentára počas dopytu na odpovede a jeho zlyhaní sa ukázali 2 hlášky (zastaraná a '
              'následný aktuálny pokus) namiesto 1. Dopad: jedna zbytočná hláška po pridaní komentára počas '
              'donačítavania odpovedí; slučku nespôsobuje. Existovalo pred K43. Agent overil čítaním kódu na `main` '
              '`bc4391dc`: `loadMore` podmieňuje kontrolou `seq === loadSeqRef.current` aj hlášku, aj pozastavenie, '
              'kým `loadMoreReplies` len pozastavenie (hláška je len pod `!options?.silent`); sondu agent nespúšťal.',
         note='Návrh (neoverený): rovnaká kontrola aktuálnosti ako pri `loadMore` aj pri hláške v `loadMoreReplies`; '
              'malá oprava v `useFeedCommentsLoader.ts` (447 riadkov) a test v novom súbore (R27); existujúce sady '
              '`repliesPaging`, `scoped` a `repliesPauseStale` musia prejsť bezo zmeny. Skupina (PRED NASADENÍM ako '
              '342 a 351 v tom istom kóde) a dôležitosť sú predbežný návrh agenta (nízka, jedna hláška). Zaradenie: '
              'do malej dávky drobných opráv spolu s 352, nie pred redizajnom komentárov; hlavný súbor komentárov a '
              'hook sa pri redizajne tiež budú meniť, takže oprava môže ísť aj spolu s ním, ak o tom rozhodne '
              'majiteľ. Odhad: nízky · S.',
         dec=None, src='K43 (kolega, 19. 11. 2026)'),
    dict(n=354, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra',
         kratko='v koreni repozitára leží prázdny `package-lock.json` (83 bajtov), pre ktorý Next.js pri každom '
                'zostavení hlási „inferred your workspace root“',
         what='Kolega pri K31 (20. 11. 2026): v koreni repozitára je zvyšok `package-lock.json` (83 bajtov, '
              '`packages` bez balíkov) a v koreni nie je `package.json`; pri každom `npm run build` vo `frontend` '
              'Next.js hlási varovanie „inferred your workspace root“ (viac zámkov, ako koreň zvolil koreň '
              'repozitára). Dôkaz kolegu: začiatok výpisu `npm run build` pred aj po upgrade (K31). Agent overil '
              'existenciu a obsah súboru (83 bajtov, `lockfileVersion` 3, `packages` prázdne, v koreni nie je '
              '`package.json`; v gite je od zlúčenia PR #211, 30. 10. 2026); varovanie pri zostavení agent nemeral. '
              'Dopad: len hlásenie pri zostavení, nič sa nerozbíja.',
         note='Návrh kolegu: zmazať zvyšok, alebo nastaviť `outputFileTracingRoot`; zmazanie je jednoduchšie, no '
              'pred ním treba overiť, že súbor nepoužíva žiaden skript, workflow ani nasadenie (Railway, Nixpacks, '
              'CI); agent to nekontroloval. Skupina a dôležitosť sú predbežný návrh agenta (po nasadení, nízka). '
              'Odhad: nízky · S.',
         dec=None, src='K31 (kolega, 20. 11. 2026)'),
]
