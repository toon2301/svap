# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 173 a úlohy na prípravu ostrého nasadenia (N1…).

`NEW_ITEMS` sú otvorené nálezy (po oprave sa odstránia a zapíšu do `stav.DONE_SINCE`). Nové nálezy dostanú vždy ďalšie
voľné číslo, čísla sa nikdy nepoužívajú znova. `NTASKS` nie sú nálezy, preto majú vlastné číslovanie N1…; úloha bez
kľúča `pkg` patrí do balíka „Príprava ostrého nasadenia“. Voliteľný kľúč `kratko` je krátky názov do časti „V skratke“.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS = [
    dict(n=174, bucket=P, imp=N, eff=ES, pkg='Navigácia a Späť',
         what='`OfferReviewsView.tsx:189`: pri upozornení na recenziu zmazanej ponuky, keď sa profil nedá otvoriť (blokovanie, súkromný '
              'profil, recenzia neexistuje), sa na Nástenku ide cez `router.push` namiesto `replace`. Pasca na tlačidle Späť: každé Späť '
              'vráti na recenzie a tie vložia `/dashboard` znova.',
         note='Vzácny okrajový prípad; nezasekáva sa (modul sa tu odmountuje), je to len pasca na Späť. Súbor má 692 riadkov '
              '(chránený), takže ide o jednoriadkovú zmenu `push` → `replace` + test; rieši sa spolu s balíkom 13 / 14.',
         dec=None, src='vetva 137'),
    dict(n=175, bucket=P, imp=S_, eff=ES, pkg='Preklady a hlášky',
         what='Surový `error.message` z knižnice axios (napr. „Network Error“) sa ukazuje aj v Obľúbených '
              '(`FavoritesModule.tsx:35`) a v Spoluprácach (`RequestsDesktop.tsx:636`, `RequestsMobile.tsx:698`).',
         note='Použiť pomocníka z `foreignProfileHelpers.ts` (`profileActionErrorMessage`) alebo ho presunúť do spoločného '
              'modulu. Neoverené: či backend niekde posiela anglické `detail` texty (DRF).',
         dec=None, src='vetva 138'),
    dict(n=176, bucket=P, imp=S_, eff=EL, pkg='Preklady a hlášky',
         what='Zvyšné slovenské kópie v češtine a poľštine (a jedna v nemčine). V profile a vyhľadávaní je to asi 30 hodnôt v češtine a 14 v '
              'poľštine (karty ponúk „Správa“, „Cena do“, „Skrytá“, vyhľadávanie „PONÚKAM/HĽADÁM“, „Posledné vyhľadávania“, portfólio); v nemčine '
              'ostáva „Vyčistiť vyhľadávanie“. V celej aplikácii mimo katalógu zručností je to hrubo cs ~210 a pl ~90 (časť sú legitímne rovnaké slová). '
              'Poľské texty bez diakritiky: heuristika našla 27 kľúčov (najmä `messages.*` a `requests.*`, napr. „Nie udalo sie wyslac wiadomosci.“).',
         note='Zahŕňa APP-02 a APP-03 z registra. Ak štart nepokryje češtinu a poľštinu, môže počkať (rozhodnutie R2). '
              'Odporúčanie: jeden preklad naraz, najprv profil, vyhľadávanie a karty ponúk.',
         dec='ROZHODNUTIE R2', src='vetva 138'),
    dict(n=177, bucket=P, imp=N, eff=ES, pkg='Preklady a hlášky',
         what='Pruh o stave pripojenia je natvrdo po slovensky (`OfflineIndicator.tsx:54–55`: „Offline režim - niektoré funkcie môžu '
              'byť obmedzené.“ a „Pripojenie obnovené! Aplikácia je online.“); pri výpadku ho vidno v každom jazyku.',
         note='Pridať dva kľúče do všetkých šiestich jazykov.', dec=None, src='vetva 138'),
    dict(n=178, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         what='ESLint hlási 10 chýb a 1 varovanie v nezmenenom súbore `search/hooks/useRecentSearches.tsx` (už na `main`).',
         note='CI lint nespúšťa (TOOL-01), preto si to nikto nevšimol. V tom istom súbore je aj APP-05 (závod pri '
              'overení histórie); riešiť spolu.', dec=None, src='vetva 138'),
    dict(n=179, bucket=P, imp=S_, eff=ES, pkg='Produkčná odolnosť aplikácie',
         what='`TestBioAnd2FAFlows::test_login_requires_totp_when_enabled` občas zlyháva. Príčina: `totp.verify(totp_code)` '
              '(`auth_serializers.py:220`) bez `valid_window`.',
         note='Nie je to len test: používateľ s 2FA, ktorého hodiny meškajú o pár sekúnd alebo ktorý zadá kód na '
              'konci 30 s okna, môže mať správny kód odmietnutý. Oprava `valid_window=1` + test.',
         dec=None, src='CI PR #194'),
    dict(n=180, bucket=P, imp=S_, eff=EM, pkg='iPhone a WebSocket',
         what='Upozornenia: na iPhone sa občas preruší WebSocket (kód 1006); na diagnostiku treba logy servera.',
         note='V predvolenej konfigurácii (`NEXT_PUBLIC_API_URL=/api`) ide WebSocket na doménu frontendu a Next ho preposiela na backend '
              '(`rewrites` pre `/ws/*`), takže v ceste je ďalší článok. V kóde sa nenašiel pravidelný ping a nečinné spojenie môže proxy zatvoriť. '
              'Diagnostiku možno robiť už teraz na Railway (PR #191, vetva `134-diag`); riešenie na novom serveri: smerovať `/ws/` priamo na daphne (N8).',
         dec=None, src='séria Upozornenia'),
    dict(n=181, bucket=A, imp=N, eff=ES, pkg='iPhone a WebSocket',
         what='Upozornenia: WebKit scroll anchoring v zozname (vedľajší nález zo série Upozornenia).',
         note='Overiť na iPhone po ďalšom nasadení.', dec=None, src='séria Upozornenia'),
    dict(n=182, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         what='PR #191 / vetva `134-diag`: len diagnostika, nikdy nezlúčiť; po vyriešení 180 uzavrieť a vetvu zmazať.',
         note='Vetva sa maže len na pokyn používateľa.', dec=None, src='séria Upozornenia'),
    dict(n=183, bucket=H, imp=V, eff=EL, pkg='Bezpečnosť závislostí', kratko='zraniteľné knižnice (backend): zostáva Django 5.2',
         what='Backend: `pip-audit` celého prostredia (aj tranzitívne balíky) hlásil 191 záznamov v 14 balíkoch (prvý sken 26. 10. bral len '
              'pripnuté balíky: 180 záznamov). Časť 183a (vetva 143, 27. 10.) je hotová: Pillow 13.0.0, pillow-heif 1.x, DRF 3.17.2, simplejwt 5.5.1, '
              'gunicorn 23.0.0, daphne 4.2.3, requests 2.33.0, python-dotenv 1.2.2, bleach 6.4.0, Django 4.2.30 a odstránený nepoužívaný '
              '`django-allauth`; CI beží na Pythone 3.11 (191 → 22 záznamov v 5 balíkoch). Zostáva: Django 4.2.30 (9 záznamov), Twisted 26.4.0 (6), '
              'DRF 3.17.2 (3), protobuf 4.25.9 (2) a pytest 8.3.2 (2, len vývoj).',
         note='Django 4.2 LTS už nemá podporu (skončila 04/2026), preto 9 zvyšných záznamov nikto pre 4.2 nevyhodnotil (popisy sa týkajú Djanga 5.2 '
              'a 6.0: cache middleware, signed cookies, GeoDjango/GDAL, `DomainNameValidator`; aplikácia nič z toho v kóde nepoužíva). '
              'Čisté riešenie je 183b (pred ostrým štartom): samostatný balík Django 4.2 → 5.2 LTS spolu s DRF 3.18.2 alebo novším (3.18.0 a 3.18.1 '
              'ešte neopravujú nič; všetky 3 záznamy DRF majú opravu až v 3.18.2). Dva z nich sú DoS bez prihlásenia na verejných endpointoch '
              '(hlavička `Accept` a netextový `charset` v `Content-Type`), tretí sa týka DRF tokenov, ktoré aplikácia nepoužíva, prihlasuje len JWT. '
              'Pred ním treba nastavenia `STATICFILES_STORAGE` (`static_media.py:6`, `settings_production.py:210`) a `DEFAULT_FILE_STORAGE` '
              '(`settings_production.py:228`, číta ho aj `messaging/storage.py`) presunúť do `STORAGES`, Django 5.1+ ich nepozná. '
              '183c: `google-cloud-vision` 3.4.5 → 3.16.0 kvôli protobuf (treba overiť skutočné volania SafeSearch). '
              'Twisted: päť zo šiestich hlásení je v moduloch, ktoré aplikácia nepoužíva (IMAP, telnet, IRC, XMPP); šieste sa týka HTTP servera v daphne '
              '(holý CR/LF v hlavičke, request smuggling za proxy). Opravy sú zatiaľ len v 26.10.0rc1 (IMAP regex nemá opravu vôbec): počkať na finálne '
              'vydanie. pytest 8 → 9 je vývojový balík (spolu s pytest-django a pytest-cov). Pillow 13 vyžaduje Python 3.11: CI sa prepol z 3.10, '
              '`backend/Dockerfile` je na 3.11 od začiatku a lokálne prostredie treba mať tiež na 3.11. Presne na 3.11: `psycopg2-binary==2.9.7` '
              'má hotové balíky najviac pre Python 3.11, takže na 3.12 a vyššom by sa musel najprv povýšiť aj on. Python 3.11 má podporu do '
              '10/2027 (Google knižnice na to už upozorňujú), prechod na 3.12+ spolu s povýšením `psycopg2-binary` preto patrí do plánu. Overené na vetve 143: celá backend sada '
              '(1955 testov, aj v CI na PR #203), porovnanie skutočných obrazových funkcií so starým Pillow (146 prípadov, rovnaké výsledky aj pixely), migrácie '
              '(nové sú len `token_blacklist.0013` a `authtoken.0004`, obe bez zmeny schémy), tokeny platia v oboch smeroch (nasadenie aj rollback). '
              'Spustené 26. 10. 2026, časť 183a 27. 10. 2026; počty sú záznamy nástroja, nie doslovný zoznam zneužiteľných chýb.',
         dec='ROZHODNUTIE R8', src='kontrola 26. 10. 2026'),
    dict(n=184, bucket=H, imp=V, eff=EL, pkg='Bezpečnosť závislostí', kratko='zraniteľný `next` (frontend)',
         what='Frontend: `npm audit --omit=dev` hlásil 19 balíkov (2 kritické, 10 vysokých). Časť 184a (vetva 142, PR #202, 27. 10.) je zlúčená: '
              'odstránený nepoužívaný `next-intl`, `npm audit fix` opravil `axios`, `@sentry/nextjs`, `js-cookie`, `follow-redirects` a ďalšie '
              'tranzitívne balíky (19 → 2). Zostáva `next` 14.2.35 (kritický, 24 hlásení) a vnorený `postcss`, ktorý má `next` 14 pripnutý.',
         note='Zvyšok sa dá opraviť len skokom `next` 14 → 16 (nástroj navrhuje 16.4.3; veľký balík, pravdepodobne aj React 19, súvisí s 153); '
              'rovnaký skok potrebuje aj `eslint-config-next` (dev). Dopad pre túto aplikáciu (odhad agenta, nie overené zneužitím): nepoužíva '
              'Server Actions (`\'use server\'` sa nenašlo), `middleware.ts` len nastavuje `Cache-Control`, `images.remotePatterns` pustí len '
              'localhost, Sentry `tunnelRoute` nie je nastavený. Relevantné zostávajú hlásenia o DoS pri Server Components, o request smuggling '
              'v `rewrites` (`/api/*` ide cez rewrites na backend) a o Image Optimizeri. Robiť skôr ako neskôr (viď 183). '
              'Súvisí s hostingom (vlastný hosting vs Vercel): R9. Spustené 26. 10. 2026, časť 184a 27. 10. 2026.',
         dec='ROZHODNUTIE R9', src='kontrola 26. 10. 2026'),
    dict(n=185, bucket=P, imp=S_, eff=EM, pkg='Bezpečnosť a produkčná odolnosť',
         what='`SECURITY_AUDIT_REPORT.md` v koreni repozitára je z roku 2024 (názov Swaply) a vedie R1–R7 ako „neriešené“, '
              'hoci kód už väčšinou obsahuje riešenia (95× `transaction.atomic`, 75× `select_for_update`, SameSite, rate limity '
              'pri resete hesla).',
         note='Prejsť R1–R10 z tej správy voči dnešnému kódu a správu aktualizovať alebo archivovať. Zavádzajúca zastaraná správa '
              'zhoršuje rozhodovanie aj verejný repozitár (ak je verejný).',
         dec='ROZHODNUTIE R11', src='kontrola 26. 10. 2026'),
    dict(n=186, bucket=P, imp=S_, eff=EM, pkg='Súkromie a krajina',
         what='Zistenie krajiny volá z prehliadača `https://ipapi.co/json/` (`LanguageContext.tsx`): tretia strana dostane IP '
              'každého používateľa; závislosť od cudzej služby a jej limitov.',
         note='Pre ostrý štart v EÚ treba buď súhlas a zápis do zásad ochrany údajov, alebo zistiť krajinu na vlastnej '
              'strane (hlavička `CF-IPCountry` pri Cloudflare, GeoIP na backende). Súvisí s OW-18 (krajina vo vyhľadávaní).',
         dec='ROZHODNUTIE R7', src='kontrola 26. 10. 2026'),
    dict(n=187, bucket=A, imp=N, eff=EM, pkg='Service worker a PWA',
         what='`public/sw.js`: vetvy `respondWith(fetch(request))` pre `/api/*`, dokumenty a `/_next/` len znovu vydajú tú istú požiadavku '
              '(bez cache a bez offline náhrady). Sú zbytočné a robia `page.route` v Playwrighte slepým (príčina nálezu 173).',
         note='Overené v Chromiu na produkčnom builde: keď worker tieto požiadavky nevybavuje, `page.route` funguje aj s aktívnym workerom. '
              'Lokálne meranie nepreukázalo rozdiel v latencii (medián 5,8 ms s workerom, 4,6 ms bez). Zmena `sw.js` je produkčná (PWA, iPhone), '
              'preto samostatne a s overením na iPhone; rieši sa spolu s 52. Po nej by `serviceWorkers: \'block\'` v špecoch nebolo nutné '
              '(poistka `E2eServiceWorker.guard.test.ts` by sa upravila). Vetva 144: rovnaký vzorec je podľa hlásení iných projektov spúšťačom chyby '
              'WebKitu pri nahrávaní z iPhonu (nález 197); appka ju obchádza kopírovaním súborov do pamäte, takže zmena `sw.js` už nie je naliehavá, '
              'no vynechanie `respondWith` pri POST a PATCH by bolo ďalšou poistkou.',
         dec=None, src='vetva 140'),
    dict(n=189, bucket=P, imp=N, eff=ES, pkg='Spoľahlivosť CI a testov', kratko='E2E: jazyk z profilu pri slugu s bodkami',
         what='`e2e/mobile-language-header.spec.ts`: pomocník `ownProfilePath` (riadok 36) pustí len slug zo znakov `A-Za-z0-9_-` (riadok 42), '
              'no backend generuje slugy s bodkami (medzery sa menia na bodky, napr. `svaplynko.malicky.mlady`). Pre taký účet vezme pomocník '
              'číselné ID, aplikácia číselnú adresu prepíše na slug a stratí pod-cestu `/language`. Vo webkit-mobile preto padá 12 scenárov '
              '`profile-section` a 2 scenáre „app Back and browser Back“ (beh 26. 10.).',
         note='Reprodukované lokálne v Chromiu s iPhone emuláciou na produkčnom builde: so slugom s bodkami rovnaké chyby ako na Railway '
              '(s workerom aj bez neho), so slugom bez bodiek „app Back“ prejde. Oprava: povoliť bodku v regulárnom výraze. Pozor: aplikácia '
              'pridáva k adrese profilu sama `?tab=offers` (`profileTabQuery.ts`), takže `profile-section` môže po oprave padnúť ešte na '
              'poslednej kontrole adresy (riadok 136); tú treba porovnávať bez query. Overiť behom na Railway.',
         dec=None, src='vetva 141'),
    dict(n=190, bucket=P, imp=N, eff=ES, pkg='Spoľahlivosť CI a testov', kratko='E2E: mouse.wheel v mobilnom WebKite',
         what='`e2e/search-country-scroll.spec.ts`, test „review: a restored profile-return snapshot follows user scrolling…“: volá '
              '`page.mouse.wheel(0, -700)` (riadok 125) aj v mobilnom projekte, no Playwright v mobilnom WebKite kolieskom nehýbe '
              '(„Mouse wheel is not supported in mobile WebKit“). V projekte webkit-mobile preto padá vždy, od pridania 17. 10. '
              '(commit `66c15acc`).',
         note='Overené v zdroji Playwrightu 1.63 (`RawMouseImpl.wheel`). Rovnaké obmedzenie už raz zachytil TEST-11 v inom špecu. Na výber: '
              'v mobile použiť iný skutočný vstup (ťah prstom), alebo tento jeden scenár v mobilnom WebKite preskočiť s vysvetlením.',
         dec=None, src='vetva 141'),
    dict(n=191, bucket=A, imp=N, eff=ES, pkg='Navigácia – drobnosti',
         what='Číselná adresa profilu s pod-cestou, napr. `/dashboard/users/<id>/language`, sa po načítaní prepíše na '
              '`/dashboard/users/<slug>?tab=offers` a pod-cesta sa stratí (`useDashboardUserProfile.tsx`: prepis číselného ID na slug '
              'zachová len `/edit`).',
         note='Zmerané 26. 10. v Chromiu na produkčnom builde. Dotýka sa len starých odkazov s číselným ID (route ich podporuje kvôli '
              'spätnej kompatibilite). Nízka priorita; vyplynulo z nálezu 189.',
         dec=None, src='vetva 141'),
    dict(n=192, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra',
         what='V repozitári sú sledované dva zbytočné súbory: `frontend/backend/.coverage` (53 KB, databáza pokrytia Pythonu v priečinku '
              'frontendu) a `frontend/profilecard-test.txt` (15 KB, výstup PowerShellu z behu `jest --testPathPattern=ProfileCard`).',
         note='Oba pridal merge PR #127 (24. 9.). Koreňový `.gitignore` ignoruje len `backend/.coverage`, nie `frontend/backend/.coverage`. '
              'Odporúčanie: `git rm` oboch súborov a do `.gitignore` doplniť `**/.coverage`. Mazanie len so súhlasom používateľa. '
              'Na vetve 144 sa zistili aj tri nepoužité komponenty so starou kópiou nahrávania avatara (nikde sa neimportujú, v meraní pokrytia '
              'sú vynechané): `ProfileEditForm.tsx`, `ProfileAvatar.tsx` a `profile-edit/shared/AvatarActionsModal.tsx` (aj s testami).',
         dec=None, src='vetva 142'),
    dict(n=193, bucket=P, imp=S_, eff=ES, pkg='Bezpečnosť a produkčná odolnosť', kratko='obrázky sa dekódujú bez `formats=`',
         what='Obrázky sa dekódujú cez `Image.open(...)` bez parametra `formats=` na piatich miestach produkčného kódu '
              '(`staged_image_moderation.py:96`, `tasks/offer_images.py:88`, `image_metadata.py:82`, `portfolio/image_processing.py:81`, '
              '`messaging/services/image_thumbnails.py:50`), takže Pillow skúsi ľubovoľný formát, ktorý pozná (TIFF, BMP, EPS, PSD, JPEG 2000 …), '
              'nielen JPEG, PNG, WebP, GIF a HEIC, ktoré aplikácia prijíma. Cesta cez staged S3 (`moderate_staged_s3_image`; volá ju portfólio, '
              'ponuky aj príspevky) dekóduje bajty priamo zo S3 bez predchádzajúcej kontroly podpisu súboru (`sniff_image_format` sa volá len v '
              'validátore `ImageField` a pri avatare).',
         note='Zistené pri mapovaní 183a: Pillow 12.3.0 mal 37 známych chýb, časť z nich v dekóderoch formátov, ktoré aplikácia neprijíma '
              '(TIFF, BMP, MIC, SPIDER, MSP, XBM, EPS); Pillow 13.0.0 ich nemá žiadnu, no obmedzenie formátov je lacná poistka proti budúcim. '
              'Overené 27. 10. na kópii: `_decode_to_webp`, `build_message_thumbnail` aj varianty portfólia dekódujú súbor TIFF aj BMP bez odmietnutia. '
              'Návrh: spoločná konštanta povolených formátov a `formats=` na všetkých piatich miestach + test, že TIFF/BMP súbor sa odmietne. '
              'Pozor na HEIC: pillow-heif sa v Pillow hlási ako `HEIF`; overiť na skutočných fotkách z iPhonu (aj kvôli `MPO` pri JPEG z fotoaparátu).',
         dec=None, src='vetva 143'),
    dict(n=194, bucket=P, imp=S_, eff=ES, pkg='Bezpečnosť a produkčná odolnosť', kratko='CI nekontroluje zraniteľné závislosti',
         what='Ani CI (`.github/workflows/deploy.yml`), ani iný plánovaný workflow nekontroluje zraniteľné závislosti: nebeží `pip-audit` ani '
              '`npm audit` a v repozitári nie je Dependabot. Zoznam zraniteľných balíkov (191 záznamov backendu, 19 balíkov frontendu) preto narástol '
              'nepozorovane a odhalila ho až jednorazová kontrola 26. 10.',
         note='Návrh: plánovaný týždenný workflow (`schedule` + `workflow_dispatch`) s `pip-audit -r backend/requirements.txt` a '
              '`npm audit --omit=dev`, ktorý len hlási (nezastavuje PR), alebo Dependabot pre `pip` a `npm`. Pozor: kým nie sú hotové 183b, 183c '
              'a zvyšok 184 (`next` 14 → 16), audit hlási známe zraniteľnosti (backend 22 záznamov: Django, Twisted, DRF, protobuf, pytest; frontend `next`) pri každom '
              'behu, takže opakované hlásenie samo o sebe neznamená novú zraniteľnosť. Workflow preto musí porovnávať výsledok so zoznamom známych '
              'výnimiek: ID záznamov vedené v repozitári (pri `pip-audit` priamo cez `--ignore-vuln <ID>`, pri `npm audit` porovnaním s uloženým '
              'zoznamom), každé s dôvodom a podmienkou odstránenia (napr. „zatvorí 183b“); upozorniť má len záznam, ktorý v zozname nie je. '
              'Pozor na hluk: `npm audit` hlási aj tranzitívne balíky, preto začať s prahom `high`.',
         dec=None, src='vetva 143'),
    dict(n=195, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         what='`backend/.coveragerc`: zoznam `omit` obsahuje päť neexistujúcich súborov (`swaply/settings_clean.py`, `swaply/migrate_api.py`, '
              '`accounts/views/google_oauth.py`, `accounts/views/simple_google_oauth.py`, `accounts/views/oauth.py`) a prah `fail_under = 94.8` sa líši '
              'od `--cov-fail-under=85` v `pytest.ini`. Riadok `accounts/views/*` navyše vynecháva z merania pokrytia všetky views.',
         note='CI beží s `--no-cov` (pokrytie sa nevynucuje), takže nič z toho nespôsobuje chybu; číslo pokrytia však o views nič nehovorí. '
              'Zistené pri odstraňovaní allauth (143), kde som z `omit` zmazal len riadky pre zmazané allauth súbory. Patrí k téme „pokrytie sa rieši '
              'samostatne“ z komentára v `deploy.yml`: treba rozhodnúť, aký prah platí a čo sa meria.',
         dec=None, src='vetva 143'),
    dict(n=196, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         what='`.github/workflows/deploy.yml`: akcie `actions/checkout@v4`, `actions/setup-node@v4` a `actions/setup-python@v4` sú staršie než verzie pre '
              'Node.js 24 (`setup-python@v4` deklaruje `node16`, ostatné dve `node20`). GitHub ich dnes núti bežať na Node.js 24 a v logu každého behu '
              'vypíše varovanie „Node.js 20 is deprecated“ (beh CI na PR #203, 27. 10.). CI pritom prechádza a krok `Setup Python` nezlyhal.',
         note='Overené v `action.yml` jednotlivých tagov: `setup-python@v5` deklaruje `node20` (varovanie by zostalo), až `setup-python@v6` `node24`; '
              '`checkout@v5` a `setup-node@v5` už `node24`. CodeRabbit (PR #203) navrhol len `setup-python@v5` s tvrdením, že krok môže zlyhať; beh CI '
              'to nepotvrdil a samotné v5 by varovanie neodstránilo. Oprava: povýšiť všetky tri akcie naraz na verzie pre Node 24 a overiť behom CI; '
              'robiť spolu s nálezom 194 (úprava workflow).',
         dec=None, src='vetva 143'),
    dict(n=200, bucket=P, imp=S_, eff=ES, pkg='Zdieľanie a obrázky', kratko='HEIC padá na validácii, kým sa nezaregistruje pillow-heif',
         what='HEIC fotka prejde backendom len v procese gunicornu, ktorý už predtým spracoval iný obrázok: podpora HEIC (`register_heif_opener`) sa '
              'registruje lenivo až vo funkciách spracovania (`strip_image_metadata`, miniatúry, moderácia), no validácia `ImageField` v DRF '
              '(`SendMessageSerializer`, `UserProfileSerializer`) beží skôr. V čerstvom procese HEIC zlyhá s „Uploadujte prosím obrázok…“ (400). '
              'Podľa správ WebKitu posiela iPhone pri `accept="image/*"` originál HEIC (zmena z jari 2024).',
         note='Overené 27. 10. v čerstvom procese so starými aj novými knižnicami (Pillow 10.1.0 s pillow-heif 0.22.0 aj Pillow 13.0.0 s 1.8.1): '
              'rovnaký výsledok, po `register_heif_opener()` HEIC prejde, takže nejde o regresiu z PR #203. Backend testy to nezachytia, lebo si '
              'opener registrujú samy (`generate_heic_file`). Oprava: registrácia pri štarte (`AppConfig.ready`) + test v čerstvom procese. '
              'Kým platí nález 197, v praxi sa neprejaví (fotka z iPhonu na server nedorazí).',
         dec=None, src='vetva 144'),
    dict(n=201, bucket=P, imp=S_, eff=ES, pkg='Profil a identita', kratko='avatar: výber súboru cez vstup mimo DOM (iOS)',
         what='Zmena avatara cez „Zmeniť fotku“ otvára výber súboru cez `document.createElement(\'input\')`, ktorý sa nikdy nepripojí do DOM '
              '(`ProfileAvatarActionsModal.tsx:41` – používa ho profil aj mobilná úprava profilu, `useProfileEditFormDesktop.ts:216`; rovnaký vzor '
              'majú aj nepoužité súbory `ProfileAvatar.tsx` a `profile-edit/shared/AvatarActionsModal.tsx`). WebKit na iOS môže takýto element '
              'počas otvoreného výberu odpratať a udalosť `change` sa nikdy nespustí (WebKit bug 201289): po výbere fotky sa nestane nič a '
              'nezobrazí sa ani chyba.',
         note='Hypotéza z manuálneho testu na iPhone: modal „Zmeniť fotku“ nezobrazí žiadny toast, kým ikona fotoaparátu na avatare bez fotky '
              '(vstup je v DOM) požiadavku odošle a skončí chybou nahrávania (nález 197). Neoverené na zariadení. Oprava: spoločný pomocník, '
              'ktorý vstup počas výberu pripojí do DOM a po `change` / `cancel` ho odstráni.',
         dec=None, src='vetva 144'),
    dict(n=202, bucket=P, imp=S_, eff=ES, pkg='Spoľahlivosť CI a testov', kratko='E2E: beh dlhší než 15 minút stratí prihlásenie',
         what='`frontend/e2e/global-setup.ts` sa prihlási raz a všetky testy štartujú z uloženého stavu (`e2e/.auth/user.json`), no access token žije '
              '15 minút a refresh token sa po prvom použití zablokuje (`ROTATE_REFRESH_TOKENS`, `BLACKLIST_AFTER_ROTATION`). Beh dlhší než približne '
              '15 minút preto kolabuje: prvý test po vypršaní obnoví token, každý ďalší dostane 401 „Token is blacklisted“, appka ho vráti na '
              'prihlásenie a `feed-list` sa nezobrazí. Celý beh z 27. 10. (732 testov, `--workers=2`, 1,0 h) mal 318 pádov, z toho 297 má túto príčinu '
              '(webkit-desktop 22, webkit-mobile 157, chromium-desktop 118); prvých približne 160 testov vo webkit-desktop prešlo, potom sa pády rozbehli.',
         note='Mechanizmus overený na kóde backendu: prvý kontext po vypršaní dostane z obnovenia 200, druhý a tretí 401. Zvyšných 21 pádov má iné '
              'príčiny: `google-login-completion` vo WebKit projektoch (10), `notifications-infinite-scroll` (1), druhý testovací účet bez ponuky '
              '(3), `search-*` (7). Do opravy treba spúšťať E2E po skupinách pod približne 12 minút (každý beh má vlastné prihlásenie). Návrh '
              'opravy len v testoch: prihlásenie na začiatku každého špecu cez API fixture alebo obnova uloženého stavu so zdieľaným zámkom.',
         dec=None, src='vetva 144'),
    dict(n=203, bucket=P, imp=N, eff=ES, pkg='Preklady a hlášky', kratko='diakritika (`?`) v textoch o fotkách v cs, de, hu, pl',
         what='V `messages/{cs,de,hu,pl}.json` majú texty o fotkách v časti Správy namiesto písmen s diakritikou znak `?` (cs 5, de 4, hu 7, pl 4 '
              'hodnoty, napr. `messages.attachImage` „P?ilo?it obr?zek“, ďalej `chooseImage`, `takePhoto`, `imageOnlyPreview`, `imageTooLarge`, '
              '`invalidImageType`), takže pri výbere alebo odmietnutí fotky ukážu tieto jazyky otázniky.',
         note='Zistené pri vetve 144 hľadaním vzoru písmeno–`?`–písmeno (angličtina 0). Súvisí s nálezom 176 (poľské a maďarské texty bez '
              'diakritiky). Oprava: doplniť správne texty a pridať test, ktorý v hodnotách prekladov zakáže `?` medzi písmenami.',
         dec=None, src='vetva 144'),
    dict(n=204, bucket=P, imp=N, eff=ES, pkg='Preklady a hlášky', kratko='chýbajúce a nepoužité kľúče prekladov',
         what='`npm run check:used-translation-keys` hlási kľúče, ktoré kód používa, ale nie sú v `messages/sk.json`: `feed.captionPlaceholder` '
              '(`FeedPostEditModal.tsx`), `feed.commentsClose` (`FeedPhotoCommentsSheet.tsx`) a `feed.openProfile` (`FeedPhotoViewerChrome.tsx`, '
              '`FeedPostCard.tsx`, `FeedPostComments.tsx`, `FeedPostMobileDetail.tsx`), takže sa vo všetkých jazykoch ukáže natvrdo zadaná slovenčina. '
              'Naopak `profile.photoRemovedError` je preložený vo všetkých jazykoch, no kód ho nepoužíva a ukazuje doslovný text '
              '„Nepodarilo sa odstrániť fotku. Skúste znova.“ (`ProfileModule.tsx`).',
         note='Skript hlási ešte tri kľúče z testu (`common`, `common.save.unavailable`, `missing.path` v `LanguageContext.locale.test.tsx`), ktoré '
              'sú falošný poplach. Skript nie je súčasťou CI. Oprava: doplniť tri kľúče do všetkých šiestich jazykov, použiť '
              '`profile.photoRemovedError` a vylúčiť test zo skriptu.',
         dec=None, src='vetva 144'),
]

NTASKS = [
    dict(n='N1', bucket=P, eff=ES, what='Rozhodnúť hosting a región EÚ (odporúčanie v prílohe C).',
         note='Až keď bude aplikácia hotová; teraz netreba (Railway ostáva na testy). Od rozhodnutia závisí zvyšok prípravy '
              '(reverzný proxy, WebSocket, zálohy, náklady). Rozhodnutie R1.'),
    dict(n='N2', bucket=P, eff=ES,
         what='Doména a e-mail: v kóde sa už používa `svaply.com` (a `api.svaply.com`). Ak je doména vlastnená, treba nasmerovať DNS na nový '
              'server a nastaviť SPF / DKIM / DMARC pre odosielateľa (Resend, `DEFAULT_FROM_EMAIL`) a schránku `info@svaply.com`.',
         note='Dlhá dodacia lehota (šírenie DNS, reputácia odosielateľa): začať asi 2–3 mesiace pred plánovaným štartom. '
              'Ak doména ešte nie je zaregistrovaná, treba ju najprv získať.'),
    dict(n='N3', bucket=P, eff=EM,
         what='Právne dokumenty: podmienky používania, ochrana osobných údajov (GDPR), cookies / súhlas, zmluvy so spracovateľmi '
              '(hosting, Cloudflare, Resend, Google Vision, Sentry).',
         note='Dlhá dodacia lehota (právnik), nie je to kód. Začať s dostatočným predstihom pred štartom. Pozor na prenosy osobných údajov mimo EÚ '
              '(Google, Sentry, Resend, Cloudflare). Súvisí s nálezom 186.'),
    dict(n='N4', bucket=P, eff=EM, what='Oddeliť prostredia: ostrá prevádzka bez testovacích účtov; staging pre E2E a testy.',
         note='Pravidlo v `.cursor/rules/svaply.mdc` hovorí, že E2E bežia proti produkcii (Railway). Po štarte so skutočnými používateľmi musia '
              'bežať proti stagingu, ktorý je kópiou ostrej prevádzky (inak by testy zasahovali do cudzích dát), a pravidlo sa musí upraviť '
              '(rozhodnutie majiteľa). Railway môže slúžiť ako staging; nezachytí však chyby viazané na hosting (proxy, WebSocket). Súvisí s 173, 16, OW-08.'),
    dict(n='N5', bucket=P, eff=EM,
         what='Konfigurácia a tajomstvá: nové `SECRET_KEY`, `JWT_SIGNING_KEY`, `MFA_ENCRYPTION_KEY`, VAPID, '
              'OAuth redirect URI a reCAPTCHA pre novú doménu, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_ORIGIN`.',
         note='Zahŕňa OW-06 (produkčné CORS domény). Žiadne kľúče z Railway nepreberať.'),
    dict(n='N6', bucket=P, eff=EM,
         what='PostgreSQL v EÚ: zálohy (denné + PITR), vyskúšaná obnova, migrácie od nuly (0125 vytvára dva GIN indexy `CONCURRENTLY`).',
         note='Register: pri migráciách 0124 / 0125 nesmú staré procesy zapisovať; zaviesť politiku „rozšír, potom zmenši“.'),
    dict(n='N7', bucket=P, eff=ES, what='Redis: oddeliť cache a broker pre Celery (politika vyhadzovania, perzistencia), sledovať pamäť.',
         note='V repozitári je `RAILWAY_REDIS_FIX.md` – problémy s Redis už boli.'),
    dict(n='N8', bucket=P, eff=EM,
         what='Procesy a proxy: gunicorn (HTTP), daphne (WS), Celery worker + beat, healthchecky, WebSocket časové limity, '
              '`TRUSTED_PROXY_HOPS` podľa skutočného reťazca proxy.',
         note='Zlé `TRUSTED_PROXY_HOPS` rozbije rate limity podľa IP (nález 429 z histórie). Návrh: reverzný proxy smeruje '
              '`/api/`, `/ws/` a `/media/` priamo na backend (rovnaká doména, cookies ostanú first-party) a Next v ceste nie je. Súvisí s 180.'),
    dict(n='N9', bucket=P, eff=EM,
         what='Médiá: S3-kompatibilné úložisko a CDN, CORS bucketu, podpísané alebo verejné URL; zvážiť, aby obrázky nešli cez Django.',
         note='Obrázky Nástenky dnes streamuje Django (`feed_image_files.py`, `_stream_key`); `/media/*` ide cez Next proxy na backend.'),
    dict(n='N10', bucket=P, eff=ES,
         what='Obrazová moderácia: účet Google Cloud, kľúč služby (`GCP_VISION_SERVICE_ACCOUNT_JSON`), kvóty a sledovanie nákladov. V produkcii je '
              'zapnutá a nastavená „fail-closed“: pri výpadku Google Vision sa nahranie obrázka odmietne s hláškou.',
         note='Rozhodnutie R10 (odporúčanie: ponechať). Overiť pri smoke teste N14.'),
    dict(n='N11', bucket=P, eff=ES,
         what='Monitoring: Sentry (backend + frontend, `global-error`), kontrola dostupnosti, logy, upozornenia na disk a pamäť, kontrola Celery beat.',
         note='Zahŕňa 33.'),
    dict(n='N12', bucket=P, eff=EM,
         what='CI/CD: nasadenie až po zelenom CI, rollback, migrácie pred novou verziou, bez výpadku pri zápise starých procesov.',
         note='Dnes: Railway auto-deploy + „Wait for CI“ mimo repozitára (poznámka v `.github/workflows/deploy.yml`).'),
    dict(n='N13', bucket=P, eff=ES, what='Bezpečnostné nastavenia: `manage.py check --deploy`, HSTS, secure cookies, CSP, ochrana admin URL, rate limity.',
         note='Nadväzuje na 183 / 185.'),
    dict(n='N14', bucket=P, eff=EM,
         what='Záťažový a smoke test na novom serveri: WebSocket, nahrávanie obrázkov, e-mail, push, registrácia, prihlásenie cez Google.',
         note='Pred pozvaním prvých používateľov.'),
    dict(n='N15', bucket=P, eff=ES,
         what='Čo s Railway po štarte: ostane na testy / staging, alebo sa vypne (sú tam len testovacie dáta, pravdepodobne sa nič neprenáša).',
         note='Rozhodne sa spolu s N4; až po N14.'),
    dict(n='N16', bucket=P, eff=EM, pkg='Vyhľadávanie a Sledovania',
         what='Živé overenie zlúčených opráv vyhľadávania a Sledovaní: OW-16 (mobilné karty), OW-18 (krajina), OW-19 (scroll), OW-20 (cache), '
              'OW-23 (viac ľudí / ponúk), TEST-01, TEST-02 a PR #193 (opisy a výsledky); vrátane migrácií 0124 / 0125.',
         note='Všetko je zlúčené v `main` a nasadené na Railway, takže sa dá urobiť už teraz (ručne alebo cieleným E2E); register výslovne vedie '
              'nasadený retest ako otvorený. Pred štartom stačí krátko zopakovať na novom serveri (N14).'),
]
