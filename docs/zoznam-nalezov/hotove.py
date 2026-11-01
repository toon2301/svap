# -*- coding: utf-8 -*-
"""Nálezy opravené po prvom vydaní zoznamu: `DONE_SINCE`, tabuľka PR (`DONE_PR_TABLE`) a popis série Upozornenia.

Presunuté zo `stav.py`, aby žiadny súbor nepresiahol 500 riadkov. `stav.py` ich sprístupňuje pod pôvodnými názvami
(`stav.DONE_SINCE` atď.), takže ostatné moduly sa nemenili. Nový opravený nález sa pridáva sem.
"""

# Nálezy opravené po prvom vydaní. Pri oprave sa položka odstráni z `ORIG_OPEN` / `NEW_ITEMS` a pridá sa sem:
#   dict(n=173, text='HOTOVÉ: čo sa opravilo', vetva='140', pr='#199' alebo None, zlucene=True alebo False)
DONE_SINCE = [
    dict(n=173, vetva='140', pr='#200', zlucene=True,
         text='HOTOVÉ: E2E špecy, ktoré strážia zápisy alebo podvrhujú sieť cez `page.route`, blokujú service worker (`serviceWorkers: \'block\'`); '
              'nové špecy stráži Jest poistka `E2eServiceWorker.guard.test.ts`. Overené v Chromiu na produkčnom builde (Playwright 1.63): '
              'bez bloku strážca zápis 1,5 s po načítaní nezachytí. Vetva 151 (nález 210) poistku rozšírila aj na `context.route` a blok '
              'doplnila do `google-login-completion.spec.ts`, kde vo WebKite padalo desať testov.'),
    dict(n=188, vetva='141', pr='#201', zlucene=True,
         text='HOTOVÉ: test „rejects expired records and future timestamps“ v `searchScrollMemory.test.ts` zafixuje hodiny pred zápisom '
              'záznamu, takže už nepadá náhodne. Starý variant: 16 pádov zo 4 000 bez záťaže a približne 104 zo 4 000 pod záťažou, '
              'nový 0 z 12 000. Mutácie expirácie a odmietania budúcich časov test stále zabijú.'),
    dict(n=197, vetva='144', pr='#204', zlucene=True,
         text='HOTOVÉ (overené používateľom na iPhone 28. 10.): nahrávanie fotiek z iPhonu (iOS 27.0.1, podľa hlásení aj Safari 26.5.x) prišlo cez '
              '`/api` na server s prázdnym telom, takže správa skončila hláškou „Neplatné údaje“ a zmena avatara všeobecnou chybou. Príčina je '
              'chyba WebKitu: `File` z `<input type="file">` sa cez XHR/fetch pošle s `Content-Length: 0` (hlásia ju aj iné projekty; oprava je v '
              'WebKite zlúčená, vydanie nie je známe). Appka teraz pred odoslaním kopíruje súbory z `FormData` do pamäte (`lib/materializeUploadFiles.ts`, '
              'jeden axios interceptor v `lib/api.ts`) a pri zlyhaní čítania pošle pôvodný súbor. Backend rozpoznáva prázdny multipart zdieľanou '
              'strážou `swaply/empty_upload.py` (správy: kód `empty_message_upload`, avatar: `empty_avatar_upload`) a zapíše ho do logu s '
              'user-agentom. Priame nahrávanie na S3 (príspevky, ponuky, portfólio) sa nemenilo, z iPhonu funguje. Overené Jestom, pytestom a '
              'mutačnými kontrolami a v Chromiu so simuláciou chyby.'),
    dict(n=198, vetva='144', pr='#204', zlucene=True,
         text='HOTOVÉ: pri 400 na odoslanie správy appka ukazovala všeobecné „Neplatné údaje“, aj keď backend poslal dôvod pri fotke (príliš veľká, '
              'zlý formát, zlyhaná kontrola obsahu); `getMessagingErrorMessage` teraz ukáže dôvod z `validation_errors.image`. Fotka, ktorá na server '
              'nedorazila, má vlastné preložené hlášky (`messages.uploadEmpty`, `profile.photoUploadEmpty`) vo všetkých šiestich jazykoch a pri '
              'avatare sa namiesto doslovného textu v kóde používa existujúci preklad `profile.photoUploadError`.'),
    dict(n=199, vetva='145', pr='#204', zlucene=True,
         text='HOTOVÉ (overené používateľom na iPhone 28. 10.): mobilný prehliadač fotky na Nástenke dostával od karty zastaraný príspevok bez '
              'adries fotiek (fotky, ktoré sa po vytvorení príspevku ešte spracúvali, dosleduje polling len v stave karty), takže sa `ImageLightbox` '
              'hneď po otvorení zavrel a ťuk na hotovú fotku „nič neurobil“, kým sa feed nenačítal znova. Prehliadač teraz dostane príspevok '
              's živými fotkami karty (`feed/useViewerPost.ts`); polling sa nereštartuje a objekt sa mení len pri zmene príspevku alebo fotiek. '
              'Overené Jestom (dva regresné testy zlyhajú, keď sa zapojenie vráti) a v Chromiu s rozmermi iPhonu na produkčnom builde.'),
    dict(n=200, vetva='146', pr='#204', zlucene=True,
         text='HOTOVÉ (overené používateľom na iPhone 28. 10.): podpora HEIC (`pillow-heif`) sa registruje pri štarte aplikácie '
              '(`swaply/heif_support.py`, volané z `AccountsConfig.ready()`), takže HEIC z iPhonu prejde validáciou `ImageField` v DRF už od prvej '
              'požiadavky v každom procese; predtým len v procese, ktorý už predtým spracoval iný obrázok. Chýbajúca knižnica štart nezhodí, zapíše '
              'varovanie. Overené: test v čerstvom procese (pred opravou zlyhal s „Uploadujte prosím obrázok…“, po oprave prejde) a odoslanie HEIC '
              'správy cez HTTP v čerstvom procese (pred opravou 400 „Neplatné údaje“, po oprave 201 aj s miniatúrou). Päť lenivých registrácií v '
              'moduloch spracovania obrázkov sa nemenilo (nález 205).'),
    dict(n=201, vetva='147', pr='#204', zlucene=True,
         text='HOTOVÉ (overené používateľom na iPhone 28. 10.): výber fotky avatara cez „Zmeniť fotku“ (profil aj mobilná úprava profilu) a v '
              'desktopovom formulári úpravy profilu používal `document.createElement(\'input\')`, ktorý sa nikdy nepripojil do DOM; WebKit na iOS '
              'takýto element po zatvorení modalu môže odpratať a `change` sa nespustí, takže sa po výbere fotky nestalo nič (ani chyba). '
              'Nový pomocník `lib/pickImageFile.ts` drží skrytý vstup v `document.body` až do výberu alebo zrušenia a používa ho modal aj '
              'formulár. Overené Jestom (tri mutácie testy zabijú: odpojený vstup v modale aj vo formulári a pomocník bez pripojenia do DOM). '
              'Príčinu na iPhone som pri oprave nemohol reprodukovať (chýba WebKit); manuálny test používateľa na iPhone po nasadení prešiel.'),
    dict(n=203, vetva='148', pr='#205', zlucene=True,
         text='HOTOVÉ: v `messages/{cs,de,hu,pl}.json` mali texty o fotkách v časti Správy namiesto písmen s diakritikou znak `?` (23 hodnôt: cs 6, '
              'de 4, hu 7, pl 6; pôvodný zápis uvádzal 20, lebo dvojité `??` v „p??lohu“, „Do??cz“ a „za??cznik“ vzor písmeno–`?`–písmeno nezachytil). '
              'Zistené pri manuálnom teste na iPhone s českým rozhraním: pri fotke nad 5 MB sa ukázalo „Obr?zek je p??li? velk?“. Poškodenie je '
              'v súboroch od prvého importu repozitára, nie je to nová regresia a mimo týchto štyroch súborov sa v repozitári nenašlo. Texty sú '
              'doplnené a test `translationsDiacritics.test.ts` zakazuje `?` v slove, posledné písmeno slova nahradené `?` pred bodkou alebo čiarkou '
              '(doplnené po kontrole CodeRabbit na PR #205) a náhradný znak U+FFFD vo všetkých šiestich jazykoch. Pred opravou zlyhal na týchto 23 '
              'hodnotách, skúšobné poškodenia zabije a bežné otázky (aj „zmazať?...“) nepovažuje za chybu. Overené aj v Chromiu na produkčnom '
              'builde: toast pri fotke nad 5 MB aj pri zlom type súboru je vo všetkých šiestich jazykoch správny.'),
    dict(n=202, vetva='149', pr='#206', zlucene=True,
         text='HOTOVÉ: E2E testy po približne 15 minútach strácali prihlásenie. `global-setup.ts` sa prihlási raz, prihlásenie platí 15 minút a jeho '
              'obnova je jednorazová (rotácia refresh tokenu), takže ju spravil len prvý test a ostatné ostali so zablokovaným tokenom. Backend '
              'navyše dovolí len 10 obnovení za minútu z jednej adresy, čo pád po vypršaní ešte zhoršilo. Nový strážca prihlásenia '
              '(`e2e/support/sessionKeeper.ts`, obnova v `e2e/support/refreshStorageState.ts`, zapojenie v `global-setup.ts`) počas behu každých '
              '5 minút (voliteľne `E2E_SESSION_KEEPER_SECONDS`) obnoví prihlásenie rovnako ako appka (`POST /api/token/refresh/` s CSRF hlavičkou '
              'a pôvodom požiadavky) a atomicky prepíše súbor s prihlásením, takže každý nový test štartuje s čerstvým; ak zápis po úspešnej obnove zlyhá, nový stav '
              'ostane v pamäti a zapíše sa pri ďalšom pokuse (obnova je jednorazová, zo zastaraného súboru by už neprešla); na konci behu počká '
              'na rozbehnutú obnovu. Zmena sa týka len testov. Overené Jestom (19 testov, 14 skúšobných poškodení zabitých, testy strážcu '
              'nespoliehajú na presné načasovanie a 12 behov pri plne vyťaženom procesore prešlo; tri testy proti zástupnému '
              'serveru, ktorý kontroluje CSRF a pôvod, bežia len na Node 20 a novšom; v CI sa na Node 18 preskakovali, od vetvy 150 (nález 208) '
              'beží CI na Node 22 a bežia aj tam) a v Chromiu proti '
              'lokálnej kópii s prihlásením platným 90 s: bez strážcu padol test hneď po vypršaní '
              '(test 7 po 113 s), so strážcom prešlo všetkých 10 testov za 3 minúty (súbor s prihlásením mal pri štarte testov najviac 27 s). '
              'Celý beh na Railway a vo WebKite sa tu overiť nedal; zvyšných približne 21 pádov z iných príčin (napr. 189, 190) táto oprava '
              'nerieši.'),
    dict(n=208, vetva='150', pr='#207', zlucene=True,
         text='HOTOVÉ (overené používateľom na Railway 28. 10.): CI (`.github/workflows/deploy.yml`) beží na Node 22 LTS namiesto Node 18, ktorý skončil podporu v apríli 2025 (Node 20 ju '
              'skončil 30. 4. 2026, Node 22 ju má do 30. 4. 2027). `frontend/package.json` má `engines.node` `22.x` (zapísané aj v '
              '`package-lock.json`), takže je verzia Node zafixovaná na jednom mieste (predtým nikde). Railway ju pri builde prečíta: Nixpacks '
              'aj Railpack čítajú `engines.node`; bez nej má Nixpacks predvolene Node 18 a Railpack najnovší LTS, premenná `NIXPACKS_NODE_VERSION` '
              'alebo `RAILPACK_NODE_VERSION` v nastaveniach služby by `engines` prebila. Playwright 1.63 vyžaduje Node 20 alebo novší a `next` 16 '
              '(nález 184) Node 20.9 alebo novší. Tri testy strážcu prihlásenia proti zástupnému serveru v `E2eSessionKeeper.test.ts`, ktoré sa na Node 18 '
              'preskakovali, bežia teraz aj v CI. Overené na Node 22 podľa krokov workflow: čistá inštalácia (`npm ci`) bez varovaní o '
              'nepodporovanej verzii, celý Jest (513 sád, 7 901 testov, žiadny preskočený) a `npm run build` (prešiel aj s kontrolou typov). Po zlúčení (PR #207) používateľ overil, že Railway beží na Node 22. Akú verziu '
              'Node Railway používalo predtým, sa nedalo zistiť (v repozitári nebolo nič zafixované). Úprava workflow pre nálezy 194 a 196 sa '
              'nerobila.'),
    dict(n=190, vetva='151', pr='#208', zlucene=True,
         text='HOTOVÉ: scenár „review: a restored profile-return snapshot follows user scrolling…“ v `search-country-scroll.spec.ts` sa v mobilnom '
              'WebKite preskočí (`test.skip(isMobile, …)` s vysvetlením), lebo Playwright v ňom koliesko myši nepozná („Mouse wheel is not '
              'supported in mobile WebKit“). Skutočný ťah prstom sa v Playwrighte nedá nahradiť rovnako verne a priamy zápis `scrollTop` by '
              'scenár o skutočnom vstupe zmenil na iný. Rovnaký scenár beží ďalej v desktopových projektoch (webkit-desktop, chromium-desktop); '
              'mobilná vetva odchodu cez tlačidlo Späť, ktorá je po preskočení nedosiahnuteľná, sa odstránila. Overené v Chromiu proti lokálnej '
              'kópii: v rozmeroch iPhonu sa test preskočí, v desktope prechádza. Súčasť opravy 210.'),
    dict(n=210, vetva='151', pr='#208', zlucene=True,
         text='HOTOVÉ: oprava 27 zastaraných alebo chybných E2E testov z druhého celého behu na Railway 28. 10. (395 prešlo, 35 padlo, 302 '
              'preskočených; Docker, 2 workery, 29,4 min). Príčiny a opravy: (1) `search-diagnostics.spec.ts` (9 pádov) a '
              '`search-cache-revalidation.spec.ts` (2) čakali správanie spred OW-20 (opakované hľadanie bez HTTP, diagnostika po '
              'znovuotvorení panela), čo je register TEST-17; testy teraz zachytia skutočnú odpoveď na opakovanie a diagnostiku po '
              'znovuotvorení panela nečakajú; (2) `notifications-infinite-scroll.spec.ts` (2) hľadal tlačidlo „Zobraziť ďalšie“ v celej '
              'stránke, no na desktope ho má aj Nástenka pod panelom upozornení, lokátor sa zúžil na zoznam upozornení; (3) '
              '`google-login-completion.spec.ts` (10, len WebKit) podvrhuje odpoveď `/me` cez `context.route`, ktorý podľa Playwrightu '
              'nezaručuje zachytenie požiadaviek vybavených service workerom: spec blokuje worker a Jest poistka '
              '`E2eServiceWorker.guard.test.ts` to vyžaduje aj pri `context.route`; (4) `search-panel-return.spec.ts` (1): rozpočet obnovy '
              'pozície 1,5 s bol tesný (namerané 1 508 a 1 662 ms vo WebKite na desktope), je 3 s a stále je kratší než šesťsekundový časovač '
              'obnovy; (5) `search-country-scroll.spec.ts` (1, nález 190): scenár s kolieskom myši sa v mobilnom WebKite preskočí; (6) '
              '`search-mobile-cards.spec.ts` (2, webkit-mobile): test hľadal náhradný text „Otváracie hodiny“, no v slovenčine sa zobrazí '
              '„Otváracia doba“ (nález 211). Overené v Chromiu (rozmery počítača aj iPhonu) proti lokálnej kópii na '
              'produkčnom builde: zlyhanie sa podarilo reprodukovať pri (1), (2) a (6) a po úprave tieto testy prechádzajú; (3), (4) a (5) '
              'sa v Chromiu reprodukovať nedali (správanie WebKitu a časovanie Railway), preto je tam overené len to, že upravené testy '
              'prechádzajú alebo sa preskočia. Spolu 146 testov dotknutých špecov: 90 prešlo, 56 sa preskočilo (testy pre iný typ '
              'obrazovky, chýbajúce ponuky „Hľadám“ v lokálnej kópii, scenár z nálezu 190), žiadny nepadol; Jest poistka 21/21 a mutačná '
              'kontrola (bez bloku v `google-login-completion.spec.ts` poistka zlyhá). Účinok opráv (3) a (4) vo WebKite potvrdí až ďalší '
              'celý beh na Railway. Neopravené: sedem testov čaká na testovacie údaje na Railway (nález 209) a jeden jednorazový pád '
              '(`search-country-scroll.spec.ts:74`, tmavý variant, ponuky, webkit-mobile: odpoveď hľadania neprišla do 15 s) sa nedal '
              'vysvetliť ani reprodukovať, preto sa neopravuje; ak sa zopakuje, treba ho vyšetriť.'),
    dict(n=217, vetva='153', pr='#210', zlucene=True,
         text='HOTOVÉ (účinok vo WebKite potvrdí až ďalší celý beh na Railway): štyri jednorazové pády záverečných behov E2E 29. 10. 2026 '
              '(tri samostatné behy aj spoločný beh dali 427 prešlo, 2 padli, 303 preskočených; každý pád prešiel pri samostatnom opakovaní): '
              '(1) `search-panel-return.spec.ts:111`, ponuky, webkit-mobile: po ťuknutí na autora ostala adresa `/search` (`toHaveURL` 10 s, '
              '`support/search-panel-return.ts:103`); (2) ten istý špec, ľudia, webkit-desktop: `page.waitForResponse` na '
              '`/api/auth/search/global/` nedostal odpoveď do 15 s (`:71`); (3) `search-to-offer-watches.spec.ts:88`, tmavý variant, '
              'webkit-desktop: po kliknutí na Vyhľadávanie sa nezobrazilo vyhľadávacie pole (`:97`); (4) `search-country-scroll.spec.ts:74`, '
              'tmavý variant, všetko, Chromium: obnovená pozícia sa líšila o 14 px oproti toleranci 2 px (`support/search-country-scroll.ts:106`). '
              'Príčina (4) je nájdená a reprodukovaná: stránka `/search` posiela hľadanie pri prvom načítaní dvakrát, pred a po `/api/auth/me/` '
              '(nález 216), a druhé hľadanie na chvíľu nahradí sekciu „Ľudia“ kostrou vyššou o 14 px. Test zmeral `scrollTop` v tomto medzistave '
              'a Chromium ho po skončení načítania posunul o 14 px späť (scroll anchoring), takže uložená pozícia už nezodpovedala meraniu; '
              'aplikácia obnovuje správne. S pôvodnými pomocníkmi z `origin/main` a oneskorením `/me` a druhého hľadania zlyhalo 9 z 10 kombinácií '
              'rovnakou hláškou (rozmery počítača aj iPhonu), s novými 0 z 10. '
              'Príčina (3): panel s vyhľadávacím poľom sa pripojí až po odpovedi `/api/auth/me/`, no test klikol hneď po zobrazení nadpisu '
              '(`toHaveCount(0)` prešlo len preto, že panel ešte neexistoval). Pri `/me` do 6 s sa panel po skorom kliknutí otvoril, rovnaké '
              'zlyhanie vznikne až pri `/me` pomalšom než 10 s, takže na Railway išlo o pomalý alebo neúspešný `/me`. '
              'Príčiny (1) a (2) sa lokálne reprodukovať nedali (WebKit, Railway). '
              'Oprava (len testy, aplikácia sa nemenila): `e2e/support/search-settled.ts` (`waitForSearchSettled`: čaká na pripojený panel, koniec '
              'oboch hľadaní a nemennú výšku výsledkov) sa volá v `openScrollableResults`, `openReturnFixture` a v teste panela; '
              '`openDeepResultAuthor` navyše overí, že pozícia uložená pri odchode zodpovedá zmeranej (poistka, ktorú mal už `openLastAuthor`). '
              'Asercie a tolerancie sú nezmenené. Pozorovateľ požiadaviek `e2e/support/page-activity.ts` (a čisté pomôcky '
              '`page-activity-format.ts`) pri páde špecov `search-country-scroll`, `search-panel-return` a `search-to-offer-watches` vypíše a '
              'pripojí blok dôkazov bez osobných údajov: požiadavky s časmi a stavmi, čas načítania dokumentu, stav panela, aktívny prvok, počty '
              'chýb; cesty bez slugov, parametre bez hodnôt, žiadne telá odpovedí, texty z konzoly ani texty chýb stránky (z chyby sa vypíše len druh, napr. `TypeError`; zlyhanie siete len ako druh a aktívny prvok len z pevných zoznamov). Pád (1) alebo (2) sa tak pri ďalšom výskyte '
              'vysvetlí sám (uvidí sa, či po ťuknutí vznikla požiadavka na profil a ako dlho trvala, a ako dlho trvalo načítanie stránky). '
              'Overené: celý Jest (514 sád, 7 932 testov, z toho nový `E2ePageActivity.test.ts` s 31 testami), `tsc` a `eslint` čisté; v Chromiu proti lokálnej kópii '
              '(rozmery počítača aj iPhonu) prešlo všetkých 39 testov troch špecov (13 sa preskočilo podľa návrhu); tie isté špecy šesťkrát za sebou pri 4-násobne spomalenom procesore prehliadača: 234 prešlo, 0 padlo, 78 preskočených (20 min). '
              'Poistka súkromia: desať zámerne vnesených chýb v pomôckach (napr. výpis surového textu zlyhania alebo surovej hodnoty atribútu) testy odhalili všetkých desať; '
              'blok dôkazov sa skúšal aj v skutočnom Chromiu na stránke so slugom a e-mailom v adrese a atribútoch, tokenom v ceste a zlyhaniami siete a nič z toho sa nevypísalo. '
              'WebKit a Railway sa tu overiť nedali; to ukáže ďalší celý beh.'),
    dict(n=218, vetva='155', pr='#211', zlucene=True,
         text='HOTOVÉ (účinok na iPhone a na Railway potvrdí manuálny test): po odoslaní fotky v správach ostalo okno na mieste a fotka bola '
              'schovaná pod ním a bolo ju treba nájsť ďalším posúvaním (PC aj mobil; našiel to používateľ manuálnym testom po nasadení vetvy 152, '
              '29. 10. 2026). Príčina: po odoslaní `refresh({ scrollBehavior: \'force_latest\' })` posunie okno na spodok jedenkrát, hneď po '
              'zobrazení nového riadku (`useConversationThreadController.ts`). `<img>` v riadku (`ConversationMessageRow.tsx`) má '
              '`loading="lazy"` a nemá rozmery, takže nemá výšku, kým sa nenačíta; po načítaní obsah vyrastie o jej výšku (najviac 352 px, '
              '`max-h-[22rem]`) pod okno a nič ho už neposunie. Pri otvorení konverzácie to rieši `useInitialBottomPin` (sleduje zmenu výšky '
              'a načítanie obrázkov až 8 s), po odoslaní nič. '
              'Zreprodukované v Chromiu proti lokálnej kópii (produkčný build, odoslanie fotky 1 200 × 1 500 px s oneskorením obrázka 0, 600 '
              'a 1 500 ms, rozmery počítača aj iPhonu): bez opravy 6 z 6 pádov, okno 316 px nad spodkom a z 352 px vysokej fotky schovaných '
              '291 px (PC) a 299 px (iPhone). '
              'Oprava: nový hook `useStickToBottomOnGrowth.ts` sleduje obsah okna správ a ak bolo okno pred zväčšením na spodku (najviac 80 px '
              'nad ním), po zväčšení ho posunie znova na spodok; ak používateľ odišiel vyššie, nehýbe sa. Posúva len pri raste výšky obsahu, nie pri zmenšení '
              'ani pri zmene šírky bez zmeny výšky. Poloha sa zisťuje pri každom posune (aj programovom), nie porovnaním s výškou spred zmeny: '
              'kontrola Codexu (PR #211) upozornila, že pri načítaní starších správ aplikácia vráti čitateľa na jeho miesto a pôvodné porovnanie '
              'by ho mohlo hodiť na spodok. V Jeste sa to s pôvodnou logikou zreprodukovalo (poradie „vrátenie polohy, potom oznam o zmene '
              'rozloženia“), v Chromiu nie (8 pokusov na počítači aj na mobile; poradie závisí od časovania prehliadača), preto je oprava '
              'obranná a pokrytá testom. Zapojený je jedným volaním v '
              '`ConversationMessagesPane.tsx`; `useConversationThreadController.ts` (505 riadkov) a `ConversationDetail.tsx` (556) sa nemenia, '
              'lebo sú nad limitom 500 riadkov (TECH-01…11). Hook nerozlišuje odoslanú a prijatú fotku: platí pre každé zväčšenie obsahu, keď '
              'je okno pri spodku (napr. aj fotka od druhého používateľa alebo štítok „Videné“); to sa v prehliadači neskúšalo. '
              'Overené: 18 nových testov Jest (15 testov hooku a 3 integračné cez `ConversationDetail`: odoslanie fotky, odscrollovanie pred '
              'načítaním fotky a načítanie starších správ), šestnásť zámerne vnesených chýb v hooku a zapojení testy odhalili všetkých šestnásť '
              '(aj návrat k pôvodnej logike a posúvanie pri zmenšení obsahu); celý Jest 516 sád a 7 950 testov, `tsc` a `eslint` čisté. V Chromiu s opravou prešlo 6 z 6 '
              'pri odoslaní fotky (okno na spodku, fotka celá) a 8 z 8 pokusov pri načítaní starších správ, na počítači aj na mobile. '
              'WebKit (iPhone) a Railway sa tu overiť nedali. Playwright test '
              'sa nepridal: odoslanie fotky vytvára správu a súbor na Railway aj S3, čo je presne ten druh testu, ktorý má obsah po sebe '
              'upratať (rozhodnutie majiteľa).'),
    dict(n=220, vetva='154', pr='#214', zlucene=True,
         text='HOTOVÉ (v CI potvrdené po zlúčení PR #214): po povýšení na Django 5.2 by sa backendové testy predĺžili, lebo Django 5.2 '
              'hashuje heslá algoritmom PBKDF2 s 1 000 000 iteráciami (Django 4.2: 600 000) a sada hashuje pri každom vytvorení používateľa. '
              'Zmerané na SQLite: Django 4.2.30 13 min (29. 10.), Django 5.2.18 19 min (29. 10.), Django 5.2.18 s rýchlym hasherom 2 min 7 s '
              '(30. 10.) pri rovnakom výsledku (1 983 prešlo, 10 preskočených). `pytest.ini` používa `swaply.settings`, takže rýchly hasher MD5 '
              'zo súboru `swaply/test_settings.py` nikdy nepomáhal (súbor sa nikde nepoužíva, pozri nález 221). Oprava: nový `backend/conftest.py` '
              'nastaví na celú reláciu testov MD5 pre nové heslá a PBKDF2 nechá na overenie hashov pripravených vopred; produkčné nastavenia sa '
              'nemenia. Fixture je na úrovni relácie, aby pokryla aj používateľov vytváraných v `setUpTestData` (oproti fixture na úrovni testu '
              'je rozdiel v rámci chyby merania: 2 min 7 s a 2 min 11 s). Poistka: `tests/test_password_hasher_in_tests.py` (nové heslo je md5, '
              'PBKDF2 hash sa stále overí); tri zámerné chyby (odstránený `conftest.py`, zoznam bez PBKDF2, PBKDF2 na prvom mieste) ju vždy '
              'zhodili. Konečný strom vetvy: SQLite 1 987 prešlo a 10 preskočených za 2 min 8 s, PostgreSQL 16 '
              '1 995 prešlo a 2 preskočené za 3 min 9 s. Skutočný čas v CI (GitHub, krok „Run backend tests“ na SQLite): 11 min 30 s na '
              'Djangu 4.2.30 (beh po zlúčení PR #213, `main` `9bf1142d`) a 1 min 40 s na Djangu 5.2.18 s rýchlym hasherom (beh po zlúčení '
              'PR #214, `main` `e3ed0f42`); celý job `checks` 15 min 52 s → 5 min 19 s.'),
    dict(n=212, vetva='157', pr='#216', zlucene=True,
         text='HOTOVÉ (zlúčené v PR #216; PostgreSQL 17 v CI potvrdené): CI testovalo backend len na SQLite, no produkcia beží na PostgreSQL 17 '
              '(Railway). Osem testov so zámkami riadkov (`select_for_update`: limit ponúk 1, značky príspevkov 2, blokovanie žiadostí 1, blokovanie '
              'v správach 4) sa na SQLite preskakuje, takže v CI nebežali nikdy. Oprava: do `.github/workflows/deploy.yml` pribudol druhý job '
              '`backend-postgres` so službou `postgres:17` (celá sada `pytest --no-cov` s `DATABASE_URL`, limit 30 min); beží súbežne s jobom '
              '`checks` (ten trvá po zrýchlení 5 min 19 s), takže by sa čas CI nemal predĺžiť. SQLite beh ostáva (pokrýva záložnú cestu bez `DATABASE_URL`). Po zrýchlení testov z nálezu 220 '
              'trvá sada na PostgreSQL lokálne 3 až 4 minúty (3 min 9 s pri vetve 154, 4 min 19 s pri vetve 157, kde súbežne bežal aj celý '
              'Jest). Overené: YAML sa načíta a obsahuje oba joby; presný strom vetvy 157 prešiel lokálne na PostgreSQL 16 '
              '(CI používa 17): 1 995 prešlo a 2 preskočené za 4 min 19 s. GitHub runner a PostgreSQL 17 sa lokálne '
              'overiť nedali; overenie priniesol prvý beh na GitHube: job `backend-postgres` prešiel v PR (2 min 46 s, z toho testy 2 min 9 s) '
              'aj na `main` po zlúčení (3 min 24 s), súbežne s jobom `checks` (v PR 6 min 13 s).'),
    dict(n=222, vetva='e2e/profilove-adresy', pr='#215', zlucene=True,
         text='HOTOVÉ (zlúčené v PR #215; overené Codexom na Railway): číselná adresa vlastného profilu `/dashboard/users/<id>/language` stratila '
              'jazykovú podstránku a skončila na základnom profile bez jazykovej hlavičky (hlásenie Codexa z 30. 10. 2026, `main` `e3ed0f42`, '
              'webkit-mobile, svetlý aj tmavý režim, 6 z 6 pokusov, špec `profile-numeric-language.spec.ts`). Príčina v '
              '`useDashboardUserProfile.tsx`: (1) počiatočná pravá položka (jazyk, účet, súkromie, úprava) sa otvárala len pri zhode slugu v adrese, '
              'takže pri číselnom ID sa nikdy neotvorila; (2) kanonizácia ID → slug prepísala adresu na holý profil a podstránku zahodila (rovnako '
              '`/account`, `/privacy` a `/edit`). Oprava: nový súbor `ownProfileAddress.ts` (`isOwnProfileIdentifier` pozná vlastný profil podľa slugu '
              'aj číselného ID, `canonicalOwnProfilePath` ponechá podstránku pri výmene ID za slug, ale len pri identifikátore, ktorý patrí tomuto '
              'používateľovi); v hooku sa menia štyri miesta (súbor má 491 riadkov, pod limitom 500). Kód je na Codexovej vetve '
              '`e2e/profilove-adresy` na pokyn majiteľa (AGENTS.md inak zakazuje zápis do vetvy druhého agenta). Overené: 23 nových testov Jest '
              '(8 cez hook, 15 na pomocníka; na pôvodnom hooku z `main` 5 z 8 testov hooku padá), deväť zámerne vnesených chýb všetky zachytené, '
              f'`tsc` a `eslint` čisté, celý Jest na čistej kópii vetvy 518 sád a 7 973 testov prešlo; '
              f'v Chromiu s rozmermi iPhonu proti lokálnej kópii špec Codexa pred opravou zlyhal v oboch režimoch (rovnaký obraz ako v hlásení: '
              f'adresa na základnom profile, bez jazykovej hlavičky), po oprave prešli oba testy (2 z 2, vrátane F5). '
              'Do tej istej vetvy pribudol pred zlúčením ešte commit `de91273f`: pomocník porovnáva číselné ID ako číslo, takže prejde aj adresa '
              's úvodnými nulami (`/dashboard/users/007/language`), a testy pribudli pre vlastné ID `007` a `0007` a cudzie `099` a `00099`. '
              'Testy hooku a pomocníka (4 súbory, 65 testov) prechádzajú aj na stave `main` `bd9131e6`. '
              'Moje lokálne overenie nemalo WebKit ani Railway; Codex ich doplnil v celom behu 30. 10. na reálnom WebKite proti Railway '
              '(`main` `e2612438`): oba mobilné varianty `profile-numeric-language.spec.ts` (svetlý aj tmavý) vrátane F5 a oba varianty '
              'profilového návratu (app Back aj browser Back) prešli; varianty s úvodnými nulami, s query a fragmentom ani voliteľné '
              '`/account`, `/privacy` a `/edit` s číselným ID sa v reálnom prehliadači osobitne neskúšali. Súvisiace, nehlásené a preto nezmenené: pri starom slugu v adrese '
              '(`/dashboard/users/<starý-slug>/language`) kanonizácia podstránku stále zahodí.'),
    dict(n=184, vetva='159', pr='#218', zlucene=True,
         text='HOTOVÉ (časť 184a: vetva 142, PR #202; časť 184b: vetva 159, PR #218, zlúčené a nasadené na produkciu 1. 11. 2026): frontend je povýšený z Next 14.2.35 a Reactu '
              '18.3.1 na Next 16.4.3 a React 19.3.1 (rozhodnutie R9). Zmizla kritická zraniteľnosť `next` aj vysoká `postcss`: `npm audit '
              '--omit=dev` 7 → 5, zostáva 5 stredných v build nástroji Sentry (nález 229). Zmeny: (1) závislosti: framer-motion 12, Testing '
              'Library 16 s novou povinnou `@testing-library/dom`, ESLint 9 a `eslint-config-next` 16, `overrides` pre `@emoji-mart/react` '
              '(oficiálne React 19 nepodporuje, v skúške funguje); lockfile 964 → 990 balíkov; (2) skripty: `build` a `dev` s `--webpack` '
              '(Turbopack padá na `src/pages/_document.tsx`, nález 230), `lint` ako `eslint .` (nález 227); (3) `tsconfig.json` (tri zmeny, '
              'ktoré si Next 16 robí sám) a `images.qualities: [75, 80]` v `next.config.js` (Next 16 inak zníži kvalitu loga z 80 na 75; '
              'overené v prehliadači); (4) 12 stránok v `src/app/dashboard/**` s `await params`; (5) typové opravy v 13 súboroch (`ease: '
              '"easeOut" as const`, `RefObject<T | null>`, `useRef(undefined)`); (6) opravy testov: po samotnej zmene knižníc padalo 65 '
              'testov v 11 súboroch. Šesť súborov sa upravilo (stránky sú `async`: `dashboardRoutes` a `FeedPostDirectEntry`; React 19 volá '
              'komponenty s iným druhým argumentom: `Providers`; tri testy záviseli od poradia dobehnutia efektov: `page.cards`, '
              '`ConversationDetail.pinned` a `FeedPostOverlayFlow`), zvyšných päť sa vyriešilo v `jest.config.js`: `fakeTimers.doNotFake: '
              '[\'queueMicrotask\']`, lebo `jest.getTimerCount()` počítal aj interné mikroúlohy Reactu (`useConversationsPaging` a 3× '
              '`useGoogleLogin`), a mapovanie `react-dom/server` na Node build, lebo prehliadačový build v React 19 vyžaduje '
              '`MessageChannel`, ktorý jsdom nemá (`SearchUserProfileModule.behavior`). Dva z týchto testov majú nad 500 riadkov (948 a 1 '
              '128), preto sa podľa AGENTS.md nemenia (Codex a CodeRabbit na PR #218); CodeRabbitom navrhnutý globálny polyfill '
              '`MessageChannel` v `jest.setup.js` spôsobil v troch z troch behov varovanie „worker process has failed to exit gracefully“, '
              'mapovanie nie. Aplikačný kód sa kvôli testom nemenil. Overené z čistej inštalácie (`npm ci`): `tsc` bez chýb (po samotnej '
              'zmene knižníc 26), celý Jest 518 sád a 8 002 testov, `npm run build` prejde, mutačné kontroly všetkých opráv (upravený aj '
              'pôvodný test padá rovnako), 94 testov z Codexových špecov v Chromiu (rozmery iPhonu aj desktop) proti lokálnemu backendu: 63 '
              'prešlo, 8 padlo a 23 preskočených (pred aktualizáciou 64, 7 a 23); šesť pádov je rovnakých ako pred aktualizáciou a nesúvisí '
              's ňou (2× časový limit pri prihlásení, 2× chýbajúce testovacie dáta v kópii, 2× zámerný test nálezu 224) a dva sú časovo '
              'citlivý test fotiek, ktorý padal na kontrole pred odoslaním (okno nebolo na spodku ešte pred odoslaním; padal raz aj v behu '
              'pred aktualizáciou; v štyroch čistých kolách prešiel 12 z 12), 15 stránok bez nových chýb konzoly, hlavičky odpovedí (CSP, '
              '`Cache-Control: no-store`) rovnaké a obrázky cez `next/image` sa načítajú (optimalizáciu odteraz robí `sharp`). WebKit/iPhone '
              'a Railway sa lokálne neskúšali; ich výsledok je v behu Playwrightu po nasadení a v manuálnych testoch majiteľa nižšie. Nová minimálna podpora '
              'prehliadačov (overené v balíkoch Next): Safari 16.4 (iOS 16.4, 03/2023) a Chrome, Edge a Firefox 111; Next 14 mal Safari 12 a '
              'Chrome 64, preto iPhony s iOS 15 a starším aplikáciu prestanú správne zobrazovať (majiteľ plán odsúhlasil 31. 10. 2026). '
              'Stránka `/reset-password/…` sa vykresľuje na požiadanie (v Next 14 bola predgenerovaná; pre používateľa rovnaké, overené bez '
              'chýb). Dopad na E2E: žiadna zmena E2E súborov. Plný beh Playwrightu po nasadení (Codex, 1. 11. 2026, `main` `9e311839`, tri '
              'projekty): 411 prešlo, 21 padlo, 306 preskočených (prijatý stav 427, 2, 303; kolekcia vzrástla zo 732 na 738 testov). Z '
              '21 pádov 17 prešlo pri všetkých troch opakovaniach, jeden preskočil dátový strážca, jeden padol 2 zo 4 pokusov na '
              'nedokončenom načítaní Nástenky (nález 223) a jedna skutočná regresia po povýšení (dva kľúče, desktopový WebKit a Chromium) '
              'je opravená vo vetve 160 (nález 231). Majiteľ po nasadení otestoval manuálne kroky 1 až 6 bez nového nálezu.'),
    dict(n=231, vetva='160', pr='#220', zlucene=True,
         text='HOTOVÉ (zlúčené v PR #220, nasadené na produkciu a overené 1. 11. 2026): po povýšení na Next 16 a React 19 (nález 184b) sa profil po F5 na stránke recenzií a kroku späť '
              'šípkou otvoril od vrchu namiesto pôvodného miesta. Zachytil to Codex v celom behu po nasadení (1. 11. 2026, `main` '
              '`9e311839`): test `offer-reviews-back.spec.ts › after a reload the arrow still brings the profile back to the same place` padol '
              '8 z 8 pokusov v desktopovom WebKite aj v Chromiu (profil sa vrátil, ale `scrollTop` ostal 0); mobilný variant prešiel a pred '
              'povýšením prešiel aj tento. Príčina (lokálna reprodukcia v Chromiu na produkčných buildoch Next 14 a Next 16 proti lokálnemu '
              'backendu, so záznamom zápisov do `history` a `scrollTop`): na Next 14 sa po šípke profil postaví raz, pozícia sa zapíše a drží '
              '(369 z 369 px). Na Next 16 router po F5 (studená pamäť) vymení celú stránku profilu (`<main data-dashboard-main>`) po prvom '
              'zápise ešte dvakrát; nový `<main>` je od vrchu a jednorazová obnova sa po prvom zápise hneď zabudla, takže výsledok bol 0. '
              'Čas medzi zápisom a výmenou rastie so spomalením procesora (Chromium: 1× asi 0,1 s, 6× 1,2 s, 12× 2,4 až 2,8 s, 20× 4,0 až '
              '4,3 s), preto pevný pokojný úsek nestačí (prvá verzia opravy s úsekom 2,5 s pri 20× zlyhala). Oprava '
              '(`profile/profileScrollMemory.ts`, 216 riadkov): obnova po zápise nekončí, ale pozíciu stráži do vypršania času (6 s od '
              'štartu, ako doteraz) alebo do vstupu používateľa (pribudol `pointerdown`): nový `<main>` ju dostane znova a scroll vrátený '
              'nahor tiež; scroll, ktorý je ďalej dole než pozícia, sa nikdy nevracia (používateľ vyhráva). Záznam histórie sa maže hneď po '
              'prvom zápise (F5 na profile nesmie skočiť na starú pozíciu); pozícia ostáva v pamäti modulu s platnosťou 12 s '
              '(`PROFILE_SCROLL_CARRY_TTL_MS`), aby ju prevzala stránka, ktorú router ešte vymení, a nepreležala do neskoršej návštevy. '
              'Overené: (1) Jest na React 19 z čistej inštalácie: štyri dotknuté sady (z toho nová `profileScrollMemory.guard.test.ts`) '
              '101 testov a celý Jest 519 sád a 8 028 testov prešlo; (2) trinásť mutácií kódu (nový prvok sa nepíše znova, návrat nahor sa nepíše znova, pozícia sa '
              'neuchová v pamäti, záznam histórie sa nemaže, chýba časový limit, symetrické stráženie, nulová tolerancia, koniec nezabudne '
              'pozíciu, chýba platnosť pozície, zápis ju nepredlžuje, chýba `pointerdown`, zastavenie maže pozíciu, pozícia sa neviaže na '
              'adresu), všetky zachytené; (3) v prehliadači (Chromium, desktop aj rozmery iPhonu, produkčný build Next 16, lokálny backend): '
              '`offer-reviews-back.spec.ts` 11 prešlo a 7 preskočených (chýbajúce dáta v kópii) vrátane testu, ktorý u Codexa padal; ladiaci '
              'scenár so spomalením procesora 1×, 6×, 12× a 20×: 369 z 369 px vo všetkých; kolesko myši po návrate drží pozíciu '
              'používateľa (369 − 200 = 169) a stráženie sa s ním nevzpiera; susedné špecy (história, identita `<main>`, nastavenia, '
              'vyhľadávanie): 47 prešlo, 28 preskočených a 3 padli pre chýbajúce dáta v kópii (portfólio, vlastná ponuka na Nástenke; '
              'dva z nich padali rovnako aj pred zmenou). WebKit/iPhone a Railway sa lokálne neskúšali. Overenie po nasadení (1. 11. 2026, `main` `583b94c0`, Codex): ten istý nezmenený test '
              '`after a reload the arrow still brings the profile back to the same place` prešiel v cielenom aj v novom celom behu vo všetkých '
              'troch projektoch (6 z 6) a celý špec recenzií mal v oboch behoch 19 prešlo, 0 zlyhalo a 8 preskočených; manuálne testy majiteľa '
              'po nasadení prešli bez nového nálezu. Dopad na E2E: žiadna zmena E2E súborov.'),
    dict(n=179, vetva='161', pr=None, zlucene=False,
         text='HOTOVÉ (čaká na zlúčenie): `TestBioAnd2FAFlows::test_login_requires_totp_when_enabled` občas zlyhával, lebo prihlásenie '
              'overovalo kód 2FA len v aktuálnom 30-sekundovom okne (`totp.verify(totp_code)` bez `valid_window`). Správny kód zadaný na konci '
              'okna alebo z telefónu s meškajúcimi hodinami sa odmietol; v teste sa okno zmenilo medzi vygenerovaním a overením kódu. Overenie je '
              'teraz vo funkcii `verify_login_totp` (`accounts/auth_serializers.py`) a prijme kód z predošlého, aktuálneho aj nasledujúceho '
              'okna (`TOTP_VALID_WINDOW = 1`, ±30 s); širšie okno sa zámerne nepoužíva. Ochrana pred hádaním ostáva ako bola (`login_rate_limit` '
              'a zámok po neúspešných prihláseniach); šanca uhádnuť kód na jeden pokus stúpla z 1 na 3 zo 1 000 000. Nový súbor '
              '`accounts/test/test_login_2fa.py` (16 testov, pevný čas cez `freezegun`, pevný testovací secret): kód z aktuálneho, predošlého '
              'aj nasledujúceho okna prejde, kód o dve okná dozadu aj dopredu a kód iného účtu sa odmietne, hlášky sedia, používateľ bez 2FA '
              'nie je dotknutý; pred opravou zlyhalo šesť z 16 testov, ostatných desať pripína nezmenené správanie. Deväť zámerných pokazení '
              'kódu (okno 0 alebo 2, zlý kód sa neodmietne, chýbajúci secret, technická chyba, všeobecná hláška, únik kódu do hlášky, '
              'preskočené overenie, prázdny kód) testy zachytili všetky. Celá backendová sada na SQLite: 2 012 prešlo a 10 preskočených. Pozor: 2FA je dnes '
              'nedokončená funkcia (nález 235): cez aplikáciu sa nedá zapnúť, takže sa oprava prejaví len na účte, ktorému by sa 2FA zapol ručne v '
              'databáze; opakované použitie už '
              'videného kódu (bez ochrany pred replayom) existovalo aj predtým a platnosť kódu sa predĺžila z 30 na 90 s. Riziko je nízke '
              '(útočník musí poznať aj heslo) a je zapísané v 235. CodeRabbit (PR #221) označil rovnaký bod (opakované použitie kódu) ako Major; zatiaľ sa nerobí, '
              'lebo 2FA sa cez aplikáciu zapnúť nedá (ručne len v databáze) a ochrana patrí k dokončeniu tejto funkcie; čaká na rozhodnutie '
              'majiteľa (R12). Ak by sa ukázalo, že taký účet v produkcii existuje, robí sa to hneď.'),
    dict(n=234, vetva='161', pr=None, zlucene=False,
         text='HOTOVÉ (čaká na zlúčenie; našlo sa pri mapovaní nálezu 179): prihlásenie s 2FA ukazovalo vždy len „Chyba pri overovaní 2FA.“, '
              'aj keď kód bol jednoducho zlý alebo expirovaný („Neplatný 2FA kód.“) alebo bolo 2FA zapnuté bez secretu („2FA nie je správne '
              'nastavené.“), lebo ich spoločný `except Exception` prepísal vlastné `ValidationError`. Overenie je teraz vo funkcii '
              '`verify_login_totp`: všeobecná hláška ostáva len pre skutočné technické zlyhanie (neplatný šifrovací kľúč, poškodený secret, '
              'chýbajúca knižnica), hlášky „Vyžaduje sa 2FA kód.“ a „2FA nie je správne nastavené.“ ostali a do hlášok sa nedostane kód ani '
              'secret. Pokrýva to osem testov hlášok v `test_login_2fa.py` (spolu s nálezom 179). Technické zlyhanie overenia sa stále nezapisuje '
              'do logu (súčasť nálezu 235).'),
    dict(n=33, vetva='161', pr=None, zlucene=False,
         text='HOTOVÉ (čaká na zlúčenie): chýbal `app/global-error.tsx`, takže chyba, ktorá zhodila koreňový layout, sa nehlásila do Sentry, '
              'používateľ videl predvolenú chybu Next-u a každý `npm run build` hlásil varovanie od Sentry. Pribudlo: (1) `src/app/global-error.tsx`: '
              'chybu nahlási (`Sentry.captureException`) a vykreslí vlastné `<html>` aj `<body>` (Next ním nahrádza celý layout); '
              '(2) `src/components/GlobalErrorView.tsx`: nadpis, vysvetlenie, tlačidlo „načítať znova“ a odkaz na úvod; stránka beží bez '
              'poskytovateľov, bez `globals.css` a bez routera, preto má vlastné štýly (farby preberá z režimu prehliadača, takže je čitateľná aj '
              'v tmavom), vlastné zistenie jazyka (uložená voľba `appLocale`, inak jazyk prehliadača, inak slovenčina; nedostupné úložisko ju '
              'nezhodí) a obyčajný odkaz namiesto `next/link`; text ani zásobník chyby sa na nej neukážu; (3) kľúč `appError` v '
              '`messages/{sk,cs,en,de,pl,hu}.json`; (4) samostatný commit, ktorý sa dá vrátiť osobitne: `ErrorBoundary` v koreňovom layoute '
              'zachytí väčšinu chýb vykresľovania, takže sa nikdy nedostali ani na `global-error`, ani do Sentry (v kóde bola len poznámka); '
              'teraz ich hlási aj s vetvou komponentov a zlyhanie hlásenia chybovú stránku nerozbije. Overené: 58 nových Jest testov '
              '(`GlobalErrorView.test.tsx` 46, `global-error.test.tsx` 8, `ErrorBoundary.sentry.test.tsx` 4) a 14 zámerných pokazení kódu '
              '(11 pri stránke, 3 pri hranici), všetky zachytené; v Chromiu na produkčnom builde Next 16 s vynútenou chybou v layoute 44 '
              'kontrol prešlo (6 jazykov, jazyk prehliadača, tmavý režim, mobil bez vodorovného posunu, tlačidlo načíta stránku znova, odkaz '
              'vedie na úvod) a falošný server Sentry dostal udalosť zo všetkých 14 načítaní; varovanie od Sentry z buildu zmizlo. Stránka '
              'sa ukáže len pri páde layoutu (zriedkavé), hlavný prínos je hlásenie do Sentry. WebKit/iPhone a skutočný Sentry sa lokálne '
              'neskúšali; na novom serveri treba overiť, že udalosti prichádzajú (úloha N11). Po kontrole CodeRabbitu (PR #221) je hlásenie z `global-error` ošetrené `try/catch` rovnako ako v `ErrorBoundary`: nový test, '
              'v ktorom `captureException` vyhodí výnimku, na starom kóde padal (výnimka unikla von) a teraz prechádza.'),
    dict(n=9, vetva='161', pr=None, zlucene=False,
         text='HOTOVÉ (čaká na zlúčenie; nález sa nepotvrdil, kód sa nemenil): tvrdenie, že WebSocket bez tokenu (`missing_token`) server '
              'odmietne až po približne 31 s, sa lokálne nepotvrdilo na žiadnej vrstve. Meranie surovým spojením proti `daphne` (bez tokenu, '
              's neplatným tokenom, s cudzím originom aj bez originu): odpoveď `403` za 2 až 8 ms a spojenie sa hneď zatvorí; cez proxy '
              'Next 16 aj Next 14 (`rewrites` pre `/ws/:path*`) za 6 až 32 ms. Kód (`swaply/ws_auth.py`, `accounts/consumers.py`) odmieta '
              'spojenie kódom 4401 ešte pred `accept()`, takže sa neprihlásené spojenie nikdy neprijme ani nedrží. Pribudli tri testy '
              '`swaply/test/test_ws_unauthenticated.py` (celý produkčný reťazec s kontrolou originu; chýbajúci, neplatný aj prázdny token sa '
              'odmietne kódom 4401 do 1 s), ktoré stráž, aby to tak ostalo; tri mutácie kódu (spojenie sa najprv prijme, odmietnutie sa '
              'oneskorí o 2 s, neprihlásený sa prijme) a jedna v prihlásení (chýbajúci token sa berie ako prihlásený) test zachytil. '
              'Čo sa lokálne overiť nedá: Railway a jeho okraj môžu pridať vlastné oneskorenie. V logu backendu sa dá porovnať čas riadkov '
              '`WSCONNECTING` a `WSREJECT` (rozdiel majú byť milisekundy); časové limity proxy rieši úloha N8. Pri meraní sa našlo nové: '
              'neznáma cesta pod `/ws/` skončí chybou 500 a výpisom v logu (nález 236).'),
    dict(n=52, vetva='161', pr=None, zlucene=False,
         text='HOTOVÉ (čaká na zlúčenie): `ServiceWorker.tsx` hľadal novú verziu workera len každých 10 minút a hneď po registrácii nie, takže '
              'po nasadení mohlo zariadenie bežať so starým workerom až 10 minút (a text v konzole „will activate on next reload“ nebol '
              'pravda: `public/sw.js` volá `skipWaiting()` už pri inštalácii, takže sa nová verzia aktivuje hneď). Registrácia je teraz vo '
              'funkcii `registerServiceWorker` (komponent ju len volá): ak návštevník už workera má (stránku riadi `controller`), hneď po '
              'registrácii sa zavolá `update()`, potom ako doteraz každých 10 minút; pri prvej návšteve nie je čo aktualizovať. Zlyhanie '
              '`update()` sa ošetrí (inak by skončilo v Sentry ako neošetrené zamietnutie) a ak stránka zanikne skôr, než sa registrácia '
              'dokončí, časovač sa už nezaloží. Nový text v konzole hovorí, že nová verzia je nainštalovaná a aktívna a že otvorená stránka '
              'beží so starým kódom do obnovenia; stránka sa pri aktualizácii sama neobnovuje (ako doteraz). `public/sw.js` sa nemenil. '
              'Overené: 14 Jest testov (React 19) a 10 zámerných pokazení kódu, všetky zachytené; v Chromiu na produkčnom builde Next 16 '
              'po „nasadení“ novej verzie `sw.js` a navigácii sa nový worker prevzal za 0,6 až 0,9 s (tri behy), nič nečakalo na aktiváciu '
              'a v konzole je nový text. Čo to nie je: Chromium kontroluje `sw.js` pri každej registrácii aj bez tejto zmeny, takže tam je '
              'prínos zanedbateľný; zmena sa týka hlavne prehliadačov, ktoré to nerobia (podľa špecifikácie WebKit, teda iPhone). Tie '
              'som lokálne vyskúšať nemohol: treba ich overiť po nasadení na iPhone (nasadiť novú verziu a pozrieť, či zariadenie prevezme '
              'nový kód bez čakania).'),
]

# Tabuľka „PR → vetva → položky“ pre položky, ktoré boli hotové už pri prvom vydaní.
DONE_PR_TABLE = [
    ('#177', '126', '128, 137, 141 (prvá polovica), 155'),
    ('#176', '125', '116, 147 (+ odstránený ladiaci pás 126)'),
    ('#180', '127', '159'),
    ('#181', '128', '160, 161'),
    ('#182', '129', '167, 168, 169, 170 (+ opravy po CodeRabbit)'),
    ('#187 #188 #189 #190 #192 #194', '130–135', 'séria Upozornenia (nálezy sa v zozname nečíslovali, viď nižšie)'),
    ('#196', '136', '162, 163, 164'),
    ('#197', '137', '171, 172'),
    ('#198', '138', '154, 165, 166 (+ „a ďalší (N)“ a hlášky pri Obľúbených)'),
]

# Popis série Upozornenia (nečíslované nálezy), zobrazí sa pod tabuľkou PR.
SERIA_UPOZORNENIA = (
    'Séria Upozornenia (nečíslované nálezy): #187 riadky upozornení na mobile majú 72 px ako riadky konverzácií, '
    '#188 dlhé slová sa zalamujú a obnovenie drží načítané dávky, #189 chyba „Zobraziť ďalšie“ sa ukáže pri tlačidle, '
    '#190 scroll desktopového panela neodpojí aplikáciu od okna, #192 realtime resync pri návrate / pripojení / online + '
    'polling 30 s (nad 90 načítaných vypnutý), #194 nekonečný scroll s kostrami a opakovaním s odstupom. '
    'PR #191 (vetva `134-diag`) je len diagnostika a nesmie sa zlúčiť (nález 182).'
)
