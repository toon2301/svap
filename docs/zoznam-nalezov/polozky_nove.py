# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 173 (úlohy na prípravu ostrého nasadenia N1… sú v `polozky_priprava.py`).

`NEW_ITEMS` sú otvorené nálezy (po oprave sa odstránia a zapíšu do `stav.DONE_SINCE`). Nové nálezy dostanú vždy ďalšie
voľné číslo, čísla sa nikdy nepoužívajú znova. Voliteľný kľúč `kratko` je krátky názov do časti „V skratke“.
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
         kratko='surový „Network Error“ v hláškach v Spoluprácach (časť Obľúbené je hotová)',
         what='Surový `error.message` z knižnice axios (napr. „Network Error“) sa ukazuje v Spoluprácach (`RequestsDesktop.tsx:636`, '
              '`RequestsMobile.tsx:698`). Časť Obľúbené je HOTOVÁ v K7 (PR #235, zlúčené 7. 11. 2026, commit `bcf3d955`): '
              '`getErrorMessage` vo `FavoritesModule.tsx` je nahradené `profileActionErrorMessage` zo `search/foreignProfileHelpers.ts` '
              '(text zo servera, potom hláška o sieti, potom záložný text s diakritikou); test pokrýva 6 druhov chýb pri načítaní aj pri '
              'odobratí z obľúbených a surová správa sa nikdy nezobrazí (pred opravou sa pri výpadku siete ukázalo „Network Error“).',
         note='Ostáva časť v Spoluprácach: oba súbory majú nad 500 riadkov (`RequestsDesktop.tsx` 646, `RequestsMobile.tsx` 706), takže '
              'zmena vyžaduje delenie súboru alebo výnimku od majiteľa; pomocník `profileActionErrorMessage` je pripravený. Neoverené: '
              'či backend niekde posiela anglické `detail` texty (DRF). Záložné texty v Obľúbených bez diakritiky: nález 281.',
         dec=None, src='vetva 138, čiastočne K7'),
    dict(n=176, bucket=P, imp=S_, eff=EL, pkg='Preklady a hlášky',
         what='Zvyšné slovenské kópie v češtine a poľštine (a jedna v nemčine). V profile a vyhľadávaní je to asi 30 hodnôt v češtine a 14 v '
              'poľštine (karty ponúk „Správa“, „Cena do“, „Skrytá“, vyhľadávanie „PONÚKAM/HĽADÁM“, „Posledné vyhľadávania“, portfólio); v nemčine '
              'ostáva „Vyčistiť vyhľadávanie“. V celej aplikácii mimo katalógu zručností je to hrubo cs ~210 a pl ~90 (časť sú legitímne rovnaké slová). '
              'Poľské texty bez diakritiky: heuristika našla 27 kľúčov (najmä `messages.*` a `requests.*`, napr. „Nie udalo sie wyslac wiadomosci.“). '
              'Doplnok z K6 (6. 11. 2026, meranie kolegu): zhodných so slovenčinou je v `pl.json` 49 hodnôt, v `cs.json` 247 (aspoň 29 '
              'určite slovenských), v `de.json` 3 a v `hu.json` 1, takže rozsah je väčší, než tu uvedené odhady (časť zhôd sú legitímne '
              'rovnaké slová).',
         note='Zahŕňa APP-02 a APP-03 z registra. Ak štart nepokryje češtinu a poľštinu, môže počkať (rozhodnutie R2). '
              'Odporúčanie: jeden preklad naraz, najprv profil, vyhľadávanie a karty ponúk.',
         dec='ROZHODNUTIE R2', src='vetva 138'),
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
    dict(n=183, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy', kratko='zraniteľné knižnice (backend): zostáva len vývojový `pytest` (2 záznamy)',
         what='Backend: `pip-audit` celého prostredia (aj tranzitívne balíky) hlásil 191 záznamov v 14 balíkoch (prvý sken 26. 10. bral len '
              'pripnuté balíky: 180 záznamov). Časť 183a (vetva 143, 27. 10.) je hotová: Pillow 13.0.0, pillow-heif 1.x, DRF 3.17.2, simplejwt 5.5.1, '
              'gunicorn 23.0.0, daphne 4.2.3, requests 2.33.0, python-dotenv 1.2.2, bleach 6.4.0, Django 4.2.30 a odstránený nepoužívaný '
              '`django-allauth`; CI beží na Pythone 3.11 (191 → 22 záznamov v 5 balíkoch). Časť 183b je hotová v dvoch krokoch: nastavenia úložísk '
              'sú presunuté do `STORAGES` (vetva 152, zlúčená v PR #209) a backend je povýšený na Django 5.2.18 s DRF 3.18.3 (vetva 154, zlúčená v '
              'PR #214; 22 → 4 záznamy bez nástrojov samotného prostredia `pip` a `setuptools`). Časť 183c je hotová (vetva 158, zlúčená v PR #217): '
              '`google-cloud-vision` 3.4.5 → 3.16.0 vyžaduje protobuf od 6.33.5 (čerstvá inštalácia dá 7.36.2), takže hlásenie CVE-2026-0994 '
              'zmizlo (4 → 2 záznamy). Zostáva len `pytest` 8.3.2 (2 záznamy, len vývoj; oprava až v 9.0.3), preto sa nález presúva do skupiny '
              'po nasadení. Twisted 26.10.0, ktoré medzitým vyšlo, berie čerstvá inštalácia sama, takže jeho 6 záznamov zmizlo.',
         note='Django 4.2 LTS už nemá podporu (skončila 04/2026), preto 9 zvyšných záznamov nikto pre 4.2 nevyhodnotil (popisy sa týkajú Djanga 5.2 '
              'a 6.0: cache middleware, signed cookies, GeoDjango/GDAL, `DomainNameValidator`; aplikácia nič z toho v kóde nepoužíva). '
              'Riešenie 183b (vetva 154): samostatný balík Django 4.2 → 5.2 LTS spolu s DRF 3.18.3 (3.18.0 a 3.18.1 '
              'ešte neopravujú nič; všetky 3 záznamy DRF majú opravu až v 3.18.2). Dva z nich sú DoS bez prihlásenia na verejných endpointoch '
              '(hlavička `Accept` a netextový `charset` v `Content-Type`), tretí sa týka DRF tokenov, ktoré aplikácia nepoužíva, prihlasuje len JWT. '
              'Pred ním bolo treba presunúť `STATICFILES_STORAGE` a `DEFAULT_FILE_STORAGE` do `STORAGES`: Django 5.1+ ich ticho ignoruje, '
              'aplikácia by bežala ďalej, no fotky (avatary, ponuky, správy) by sa ukladali na lokálny disk servera a po každom nasadení by zmizli '
              '(skúška na Djangu 5.2 bez presunu: úložisko bolo lokálny disk a 3 z 38 kontrol zlyhali). Presun je na vetve 152: `STORAGES` je v '
              '`static_media.py` a `settings_production.py`, `messaging/storage.py` ho číta (záložnú vetvu na `DEFAULT_FILE_STORAGE` odstránila) '
              'a stráži ho `tests/test_production_settings_storages.py` (načíta produkčné nastavenia v samostatnom procese a zakáže staré nastavenia) '
              'spolu s `tests/test_messaging_storage_selection.py` (výber súkromného úložiska fotiek správ, ktorý doteraz nemal test). Django 4.2 '
              'odvodzuje `STORAGES` zo starých nastavení, preto je súkromné úložisko správ (ACL private, podpísané adresy) v produkcii aktívne už dnes '
              'a po presune ostáva rovnaké. Povýšenie (vetva 154): Django 5.2 vyžaduje PostgreSQL 14 a novší (Railway má 17), prihlásenie je asi '
              '1,7-krát náročnejšie na procesor (hashovanie hesiel 1 000 000 iterácií namiesto 600 000; staré heslá sa prepíšu pri prihlásení a Django 4.2 '
              'overí aj nový hash, takže rollback je bezpečný; dôsledok pre CI je v náleze 220) a DRF 3.18 vyžaduje Django 5.2, preto sa povyšujú spolu. '
              '183c (vetva 158): `google-cloud-vision` 3.4.5 → 3.16.0 kvôli protobuf (CVE-2026-0994: zacyklenie `json_format.ParseDict` '
              'pri vnorených `Any`, oprava od 5.29.6 alebo 6.33.5; aplikácia protobuf priamo nepoužíva). Produkcia má `SAFESEARCH_FAIL_OPEN=False`, '
              'takže pokazená knižnica by zamietla každé nahrávanie obrázka; preto pribudol test `swaply/test/test_vision_client_contract.py`, '
              'ktorý spúšťa skutočného klienta proti falošnému gRPC serveru (bez účtu a bez siete). Overené: čerstvé prostredie, `pip check` '
              'čistý, celá sada na SQLite (1 993 prešlo a 10 preskočených) aj na PostgreSQL 16 (2 001 prešlo a 2 preskočené), päť zámerných chýb test zachytil, nahratie obrázka '
              'správy cez API proti falošnému serveru prešlo. Skutočné volanie serverov Google sa lokálne overiť nedá (potrebuje účet); overil ho '
              'majiteľ po nasadení 31. 10. 2026 (PC aj mobil): obyčajná fotka prešla, nevhodná sa nepridala so správnym hlásením a dobrá '
              'prešla so správnym hlásením (produkcia je fail-closed, takže úspech znamená, že kontrola funguje). '
              'Twisted: päť zo šiestich hlásení je v moduloch, ktoré aplikácia nepoužíva (IMAP, telnet, IRC, XMPP); šieste sa týka HTTP servera v daphne '
              '(holý CR/LF v hlavičke, request smuggling za proxy). Opravy prišli vo finálnom 26.10.0 (30. 10. 2026 ho už berie čerstvá inštalácia a '
              '`pip-audit` pri ňom nehlási nič); `daphne` Twisted nepripína, preto by sa dala doplniť dolná hranica `Twisted>=26.10.0` (zatiaľ len '
              'návrh, mimo vetvy 154). pytest 8 → 9 je vývojový balík (spolu s pytest-django a pytest-cov). Pillow 13 vyžaduje Python 3.11: CI sa prepol z 3.10, '
              '`backend/Dockerfile` je na 3.11 od začiatku a lokálne prostredie treba mať tiež na 3.11. Presne na 3.11: `psycopg2-binary==2.9.7` '
              'má hotové balíky najviac pre Python 3.11, takže na 3.12 a vyššom by sa musel najprv povýšiť aj on. Python 3.11 má podporu do '
              '10/2027 (Google knižnice na to už upozorňujú), prechod na 3.12+ spolu s povýšením `psycopg2-binary` preto patrí do plánu. Overené na vetve 143: celá backend sada '
              '(1955 testov, aj v CI na PR #203), porovnanie skutočných obrazových funkcií so starým Pillow (146 prípadov, rovnaké výsledky aj pixely), migrácie '
              '(nové sú len `token_blacklist.0013` a `authtoken.0004`, obe bez zmeny schémy), tokeny platia v oboch smeroch (nasadenie aj rollback). '
              'Spustené 26. 10. 2026, časť 183a 27. 10. 2026, časť 183b (vetva 154) 30. 10. 2026; počty sú záznamy nástroja, nie doslovný zoznam zneužiteľných chýb.',
         dec='ROZHODNUTIE R8', src='kontrola 26. 10. 2026'),
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
              'preto samostatne a s overením na iPhone; nález 52 (vetva 161) `sw.js` nemenil, takže sa s ním neriešil. Po zmene `sw.js` by `serviceWorkers: \'block\'` v špecoch nebolo nutné '
              '(poistka `E2eServiceWorker.guard.test.ts` by sa upravila). Vetva 144: rovnaký vzorec je podľa hlásení iných projektov spúšťačom chyby '
              'WebKitu pri nahrávaní z iPhonu (nález 197); appka ju obchádza kopírovaním súborov do pamäte, takže zmena `sw.js` už nie je naliehavá, '
              'no vynechanie `respondWith` pri POST a PATCH by bolo ďalšou poistkou. Vetva 151: blok workera sa dnes vyžaduje aj pri '
              '`context.route` (Playwright pri ňom upozorňuje na to isté ako pri `page.route`; desať testov `google-login-completion` padalo vo '
              'WebKite) a poistka to stráži.',
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
    dict(n=191, bucket=A, imp=N, eff=ES, pkg='Navigácia – drobnosti',
         what='Číselná adresa profilu s pod-cestou, napr. `/dashboard/users/<id>/language`, sa po načítaní prepíše na '
              '`/dashboard/users/<slug>?tab=offers` a pod-cesta sa stratí (`useDashboardUserProfile.tsx`: prepis číselného ID na slug '
              'zachová len `/edit`).',
         note='Zmerané 26. 10. v Chromiu na produkčnom builde. Dotýka sa len starých odkazov s číselným ID (route ich podporuje kvôli '
              'spätnej kompatibilite). Nízka priorita; vyplynulo z nálezu 189.',
         dec=None, src='vetva 141'),
    dict(n=193, bucket=P, imp=S_, eff=ES, pkg='Bezpečnosť a produkčná odolnosť',
         kratko='kód hotový v K10; ručný test po K10: BMP prijaté v portfóliu a na Nástenke (nevysvetlené)',
         what='ČIASTOČNE HOTOVÉ: kód je hotový v K10 (PR #239, zlúčené 7. 11. 2026, commit `bc105f53`). Spoločný zoznam povolených formátov '
              'a pomocník `open_allowed_image` v `swaply/image_signature.py` používa všetkých päť miest (`staged_image_moderation.py`, '
              '`tasks/offer_images.py`, `image_metadata.py`, `portfolio/image_processing.py`, `messaging/services/image_thumbnails.py`): '
              'JPEG, PNG, WebP, GIF a HEIC (HEIF len keď je `pillow-heif` zaregistrovaný); MPO z mobilov ide cez JPEG (MPO do `formats=` '
              'nepatrí: Pillow ho nemá ako samostatný opener a pri nezhodnom vstupe by vyhodil `KeyError`). Validátor `validate_image_file` '
              'už nepustí BMP a TIFF podľa obsahu súboru; TIFF pomenovaný `.jpg` predtým prešiel nahrávaním správy a uložil sa originál aj '
              's polohou GPS. Odmietnutie ostalo na každom mieste také, aké už malo (zamietnutý záznam, `ModerationRejectedError` s HTTP '
              '400, `None`) a platí so SafeSearch aj bez neho. Overenie podľa kolegu: 118 nových testov, 13 mutácií zachytili testy, '
              'backend 2 161 prešlo; CI prešlo (`checks` aj `backend-postgres`). OSTÁVA: ručný test majiteľa 7. 11. 2026 po K10 vyšiel '
              'podozrivo. Súbor BMP s názvom `….png.bmp` sa podarilo nahrať do portfólia aj na Nástenku a po obnovení stránky sa fotka '
              'zobrazovala (či ho aplikácia prekódovala, alebo server prijal nepovolený formát, nie je známe). Podľa kódu to nemalo '
              'prejsť: klient (`PORTFOLIO_ALLOWED_IMAGE_EXTENSIONS`, `FEED_IMAGE_EXTENSIONS`) aj server (`upload-init` a `upload-complete` '
              'pre portfólio aj príspevky) odmietajú príponu `.bmp` a v aplikácii nie je žiadne prekódovanie obrázka v prehliadači (žiadny '
              '`canvas` ani `toBlob`). V ponukách server odmietol nepovolený typ súboru (snímka majiteľa: „Neplatný typ súboru.“; nález 293).',
         note='Možné vysvetlenia (neoverené): súbor mal pri nahrávaní inú príponu než `.bmp` (obsah BMP s príponou `.png` prešiel pred K10, '
              'teraz ho odmietne kontrola obsahu), test bežal pred nasadením K10, alebo je na Railway nastavená `ALLOWED_IMAGE_EXTENSIONS` '
              '(podľa majiteľa nie je; `SAFESEARCH_ENABLED` nie je potvrdené). Prvý krok je zopakovať test s dôkazom: sieťový panel '
              'prehliadača (názov súboru, odpoveď `upload-init` a `upload-complete`) a skutočná prípona súboru, alebo E2E test z nálezu '
              '295. Django `ImageField` pri validácii otvára obrázok tiež bez `formats` (len hlavičky); nemení sa. Pôvodné zistenie '
              '(mapovanie 183a): Pillow 12.3.0 mal 37 známych chýb v dekóderoch formátov, ktoré aplikácia neprijíma; Pillow 13.0.0 ich '
              'nemá, obmedzenie formátov je lacná poistka proti budúcim.',
         dec=None, src='vetva 143, čiastočne K10 a manuálny test majiteľa'),
    dict(n=194, bucket=P, imp=S_, eff=ES, pkg='Bezpečnosť a produkčná odolnosť', kratko='CI nekontroluje zraniteľné závislosti',
         what='Ani CI (`.github/workflows/deploy.yml`), ani iný plánovaný workflow nekontroluje zraniteľné závislosti: nebeží `pip-audit` ani '
              '`npm audit` a v repozitári nie je Dependabot. Zoznam zraniteľných balíkov (191 záznamov backendu, 19 balíkov frontendu) preto narástol '
              'nepozorovane a odhalila ho až jednorazová kontrola 26. 10.',
         note='Návrh: plánovaný týždenný workflow (`schedule` + `workflow_dispatch`) s `pip-audit -r backend/requirements.txt -r backend/requirements-test.txt` '
              '(rovnaké súbory, aké inštaluje CI; `pytest` je len v druhom) a `npm audit --omit=dev`, ktorý len hlási (nezastavuje PR), alebo Dependabot pre `pip` a `npm`. Pozor: kým nie sú hotové `pytest` z 183 '
              'a build nástroj Sentry z 229, audit hlási známe zraniteľnosti (backend 2 záznamy vývojového `pytest`; frontend 5 stredných v build nástroji Sentry) pri každom '
              'behu, takže opakované hlásenie samo o sebe neznamená novú zraniteľnosť. Workflow preto musí porovnávať výsledok so zoznamom známych '
              'výnimiek: ID záznamov vedené v repozitári (pri `pip-audit` priamo cez `--ignore-vuln <ID>`, pri `npm audit` porovnaním s uloženým '
              'zoznamom), každé s dôvodom a podmienkou odstránenia (napr. „zatvorí 229“); upozorniť má len záznam, ktorý v zozname nie je. '
              'Pozor na hluk: `npm audit` hlási aj tranzitívne balíky, preto začať s prahom `high`.',
         dec=None, src='vetva 143'),
    dict(n=195, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         what='`backend/.coveragerc`: prah `fail_under = 94.8` sa líši od `--cov-fail-under=85` v `pytest.ini` a riadok `accounts/views/*` '
              'v zozname `omit` vynecháva z merania pokrytia všetky views. Päť neexistujúcich súborov v `omit` (`swaply/settings_clean.py`, '
              '`swaply/migrate_api.py`, `accounts/views/google_oauth.py`, `accounts/views/simple_google_oauth.py`, '
              '`accounts/views/oauth.py`) odstránila K2 (PR #225, commit `0305eee0`); riadok `swaply/test_settings.py` zmizol spolu s '
              'nálezom 221.',
         note='CI beží s `--no-cov` (pokrytie sa nevynucuje), takže nič z toho nespôsobuje chybu; číslo pokrytia však o views nič nehovorí. '
              'Zistené pri odstraňovaní allauth (143). Patrí k téme „pokrytie sa rieši samostatne“ z komentára v `deploy.yml`: ostávajú dve '
              'rozhodnutia, aký prah platí (94,8 alebo 85) a či sa views majú z merania vynechávať. Vzor `*/venv/*` je zámerný (lokálne '
              'virtuálne prostredie) a ostáva.',
         dec=None, src='vetva 143, čiastočne K2'),
    dict(n=196, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         what='`.github/workflows/deploy.yml`: akcie `actions/checkout@v4`, `actions/setup-node@v4` a `actions/setup-python@v4` sú staršie než verzie pre '
              'Node.js 24 (`setup-python@v4` deklaruje `node16`, ostatné dve `node20`). GitHub ich dnes núti bežať na Node.js 24 a v logu každého behu '
              'vypíše varovanie „Node.js 20 is deprecated“ (beh CI na PR #203, 27. 10.). CI pritom prechádza a krok `Setup Python` nezlyhal.',
         note='Overené v `action.yml` jednotlivých tagov: `setup-python@v5` deklaruje `node20` (varovanie by zostalo), až `setup-python@v6` `node24`; '
              '`checkout@v5` a `setup-node@v5` už `node24`. CodeRabbit (PR #203) navrhol len `setup-python@v5` s tvrdením, že krok môže zlyhať; beh CI '
              'to nepotvrdil a samotné v5 by varovanie neodstránilo. Oprava: povýšiť všetky tri akcie naraz na verzie pre Node 24 a overiť behom CI; '
              'robiť spolu s nálezom 194 (úprava workflow).',
         dec=None, src='vetva 143'),
    dict(n=204, bucket=P, imp=N, eff=ES, pkg='Preklady a hlášky', kratko='nepoužitý kľúč `profile.photoRemovedError` (zvyšok po K6)',
         what='ČIASTOČNE HOTOVÉ: tri chýbajúce kľúče (`feed.captionPlaceholder`, `feed.commentsClose`, `feed.openProfile`) aj tri falošné '
              'kľúče zo skriptu sú hotové v K6 (nález 120, PR #234, zlúčené 6. 11. 2026, commit `6fe2c8ea`): '
              '`npm run check:used-translation-keys` teraz končí s 0 chýbajúcimi kľúčmi. OSTÁVA: `profile.photoRemovedError` je preložený '
              'vo všetkých jazykoch, no kód ho nepoužíva a ukazuje doslovný text „Nepodarilo sa odstrániť fotku. Skúste znova.“ v '
              '`ProfileModule.tsx:468` (563 riadkov, nad limitom). Ten istý text je aj v `ProfileEditForm.tsx:250` (432 riadkov), no ten '
              'komponent je nepoužitý (nález 239), takže sa neopravuje: zmizne so zmazaním komponentu.',
         note='`ProfileModule.tsx` vyžaduje delenie súboru alebo výnimku od majiteľa (oprava: `t("profile.photoRemovedError", …)`). '
              'Skript `check:used-translation-keys` je po K6 čistý (0 chýbajúcich kľúčov), preto ho možno pridať do CI (dnes nie je '
              'súčasťou CI; navrhnuté v dávke K12), aby sa chýbajúce kľúče nevracali.',
         dec=None, src='vetva 144, čiastočne K6'),
    dict(n=205, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra', kratko='päť lenivých registrácií HEIC je po nálezu 200 nadbytočných',
         what='`register_heif_opener()` sa volá lenivo v piatich moduloch spracovania obrázkov: `swaply/image_metadata.py`, '
              '`swaply/staged_image_moderation.py`, `swaply/tasks/offer_images.py`, `portfolio/image_processing.py` a '
              '`messaging/services/image_thumbnails.py`. Od opravy 200 sa podpora HEIC registruje raz pri štarte aplikácie '
              '(`swaply/heif_support.py`), takže tieto volania sú nadbytočné.',
         note='Neškodné (registrácia je opakovateľná), preto sa v oprave 200 nemenili, aby zmena ostala malá a ľahko vrátiteľná. Upratanie: '
              'volania zmazať alebo nahradiť jedným `register_heif_support()`; prirodzene to ide spolu s nálezom 193 (`Image.open` bez `formats=`), '
              'ktorý tie isté miesta tiež rieši.',
         dec=None, src='vetva 146'),
    dict(n=206, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy', kratko='ESLint hlási 681 chýb v 104 súboroch',
         what='`npx eslint src` hlási 681 chýb a 31 varovaní v 124 z 1 255 súborov frontendu (104 súborov s chybou, z toho 51 testov a 53 produkčných). '
              'Najviac je `no-unused-vars` (359), `no-explicit-any` (213), `no-require-imports` (66) a `no-unused-expressions` (29, najmä modaly '
              'úpravy profilu `profile-edit/modals/*`). Deväť chýb `react-hooks/rules-of-hooks` je v `messages/ConversationMessageRow.tsx` '
              '(riadky 173–233: hooky stoja za predčasným `return` pre skupinové pozvánky a systémové správy).',
         note='Zmerané 27. 10. na vetve 147. Rozširuje nález 178 (ten opisoval jediný súbor a je hotový v K4, PR #231) a súvisí s TOOL-01 (CI lint nespúšťa). '
              '`ConversationMessageRow` dnes nepadá, lebo typ správy sa pri tom istom `id` nemení; ak by sa niekedy zmenil (napr. skupinová '
              'pozvánka na obyčajnú správu), React hodí „Rendered more hooks than during the previous render“. Odporúčanie: najprv hooky '
              'pred `return`, potom rozhodnúť, či lint dať do CI, a upratať zvyšok po balíkoch (najprv produkčné súbory). '
              'Doplnok z K7 (7. 11. 2026): jeden z 213 `no-explicit-any` je v `frontend/src/components/dashboard/__tests__/FavoritesModule.test.tsx` '
              'na riadku 13 (mock `framer-motion`: `({ children, ...props }: any)`); kolega ho v K7 nechal, lebo je mimo zadania (podľa neho '
              'je z PR #171; agent to pre skrátenú históriu klonu nevie overiť), rovnaká chyba je na `main` aj pred K7 a CI ESLint nespúšťa. '
              'Doplnok z K10 (7. 11. 2026): rovnaký mock `framer-motion` s `any` je aj v druhom teste Obľúbených, '
              '`frontend/src/components/dashboard/modules/__tests__/FavoritesModule.test.tsx:10`; kolega ho pri K10 nahlásil ako nové '
              'miesto (nízky · S).',
         dec=None, src='vetva 147'),
    dict(n=207, bucket=P, imp=N, eff=EM, pkg='Zdieľanie a obrázky', kratko='odoslanie fotky v správach trvá dlhšie',
         what='Po oprave 197 sa fotky z iPhonu v správach odosielajú, no podľa manuálneho testu (28. 10.) odoslanie trvá dlhšie, než by používateľ '
              'čakal; nie je to chyba, preto sa nerieši hneď. Cesta jednej fotky: appka ju neprepočíta ani nezmenší (v správach ani v `lib` nie je '
              'žiadne zmenšovanie), nahrá sa celý súbor z telefónu (snímka z iPhonu má niekoľko MB); v požiadavke beží kontrola obrazu cez Google '
              'Vision (`check_image_safety` vo `validate_image_file`, limit `SAFESEARCH_TIMEOUT` 5 s); potom v transakcii so zámkom konverzácie '
              '`strip_image_metadata` (odstránenie EXIF prekódovaním), uloženie originálu a miniatúry do úložiska (S3). Počas odosielania sa len '
              'zablokujú tlačidlá (`sending`, nižšia priehľadnosť), bez indikátora priebehu.',
         note='Meranie na iPhone 28. 10. (jedna fotka, stopky od ťuknutia po zobrazenie správy): Wi-Fi približne 5 s, mobilné dáta 4,25 s. Rozdiel '
              'medzi sieťami je malý a mobilné dáta vyšli rýchlejšie, čo naznačuje, že väčšinu času netvorí nahranie z telefónu; je to len hypotéza '
              'z jedného merania. Lokálne meranie 28. 10. (v sandboxe bez Google Vision a S3, snímka 4032 × 3024 JPEG 3,3 MB): spracovanie na serveri '
              '0,4 až 0,8 s (medián 0,59 s), z toho prekódovanie `strip_image_metadata` 0,25 s a miniatúra 0,16 s. Obe merania prebehli v rôznych '
              'prostrediach (iPhone a Railway oproti lokálnemu stroju bez Vision a S3), preto z ich rozdielu nemožno určiť, koľko času pripadá na '
              'náš kód, Vision, S3 alebo siete; Railway môže mať pomalší procesor, takže aj náš kód tam môže trvať dlhšie než 0,6 s. Všetko to sú '
              'zatiaľ hypotézy. Prvý krok bez zmeny kódu: na Railway zapnúť `SAFESEARCH_TIMING_LOG=true` a porovnať čas Vision s celkovým časom '
              '(podľa výsledku doplniť meranie krokov spracovania priamo na serveri). Možné zlepšenia: zmenšiť fotku v prehliadači pred odoslaním (napr. dlhšia strana 2048 px, výrazne menej dát aj práce servera; '
              'zasahuje do kvality a do pravidla 5 MB, treba rozhodnúť), ukázať indikátor odosielania, spracovanie obrazu mimo transakcie so '
              'zámkom konverzácie.',
         dec=None, src='vetva 148'),
    dict(n=209, bucket=P, imp=N, eff=ES, pkg='Spoľahlivosť CI a testov', kratko='E2E: sedem testov čaká na údaje na Railway',
         what='Druhý celý beh E2E na Railway (28. 10.) mal sedem pádov s hláškou „Príprava:“, lebo testy potrebujú údaje, ktoré si nevytvárajú '
              'a ktoré na Railway chýbajú: (a) `offer-reviews-back.spec.ts:185` (3×, všetky tri projekty): druhý testovací účet '
              '(`E2E_PEER_SLUG`) nemá ponuku s tlačidlom „Pridať recenziu“; (b) `messages-peer-profile.spec.ts:139` a `:157` (2×, webkit-mobile): '
              'medzi najnovšími konverzáciami v Správach (prvá stránka zoznamu) nie je prijatá priama konverzácia s účtom z `E2E_PEER_SLUG` '
              'alebo ten účet nemá zobrazované meno; (c) `profile-entry-scroll.spec.ts:218` a `:237` (2×, webkit-mobile): na prvých piatich '
              'stranách Nástenky nie je zdieľaná vlastná ponuka hlavného testovacieho účtu.',
         note='Pôvodné vysvetlenie (29. 10. 2026; po analýze Codexu z 7. 11. 2026 nepreukázané, pozri doplnok nižšie): nie je to chyba '
              'aplikácie ani testov, testy zámerne zlyhajú s hláškou „Príprava:“ (nepreskočia), aby chýbajúce údaje nevyzerali ako '
              'úspešný beh. Údaje pripravuje používateľ na Railway (jedna ponuka druhého účtu, prijatá konverzácia medzi oboma účtami medzi '
              'najnovšími a jedna zdieľaná ponuka hlavného účtu na Nástenke); potom sa zopakuje celý beh. Pri stagingu (N4) treba tieto tri '
              'položky pripraviť v testovacích dátach od začiatku. '
              'Doplnok (Codex po K8, 7. 11. 2026): vysvetlenie „iba chýbajúce dáta“ sa nepovažuje za preukázané a súvisiace pády nie sú '
              'nestabilita prostredia. (a) `offer-reviews-back.spec.ts:185`, všetky tri projekty (3 z 3 variantov v zachovanom behu z '
              '28. 10., jeden pokus na projekt): tlačidlo „Pridať recenziu“ sa nezobrazilo; test nerozlíšil neprítomnú ponuku od '
              'problému načítania alebo viditeľnosti profilu. (b) `messages-peer-profile.spec.ts:139` a `:157` (webkit-mobile, 2 z 2 '
              'scenárov): príprava nenašla vyhovujúcu konverzáciu, k otvoreniu profilu nedošlo; podozrivé miesto je '
              '`requirePeerConversation` (filtruje podľa slugu, príznaku odstránenia a mena; dôkaz neurčuje, ktorá podmienka neprešla). '
              '(c) `profile-entry-scroll.spec.ts:218` a `:237` (2 z 2 mobilných scenárov): nenašli vlastnú zdieľanú ponuku (vlastný '
              'obsah, nie priamo neviditeľnosť druhého účtu). Pri týchto pádoch `[E2E-EVIDENCE]` nevznikol. V poslednom uloženom celom '
              'behu z 1. 11. všetkých sedem scenárov prešlo; E2E však používa jeden prihlásený účet, opačný smer nebol overený. Po K8 '
              'a K9: účty A a B z manuálneho testu sú účty z E2E testov (`.env.e2e`; majiteľ 7. 11.) a účet A má súkromný profil (275, '
              'R25), takže ak je A druhý účet (`E2E_PEER_SLUG`), prípady (a) a (b) môže vysvetľovať práve to, že ho hlavný účet nevidí '
              '(stav dát). Otvorené: ktorý z účtov A a B je hlavný E2E účet a ktorý `E2E_PEER_SLUG`, a od kedy je A súkromný.',
         dec=None, src='vetva 151'),
    dict(n=211, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra', kratko='tri rôzne záložné texty pre názov otváracích hodín',
         what='Kľúč `skills.openingHours.title` má v kóde tri rôzne záložné texty: „Otváracia doba“ (`OpeningHoursModal.tsx`, '
              '`SkillsDescriptionMobileLayout.tsx`, `SkillsDescriptionMobileModals.tsx`), „Otváracia doba (voliteľné)“ (`OpeningHoursSection.tsx`) a '
              '„Otváracie hodiny“ (`ProfileOfferDetailMobileContent.tsx`, `ProfileOpeningHoursMobileModal.tsx`, `OfferCardBack.tsx`, '
              '`ProfileOffersSection.tsx`, `OfferReviewsDesktop.tsx`). Používateľ rozdiel nevidí, lebo preklad existuje vo všetkých šiestich '
              'jazykoch (sk: „Otváracia doba“).',
         note='Záložný text sa zobrazí len pri chýbajúcom preklade. Rozdiel stál jeden E2E test: `search-mobile-cards.spec.ts` hľadal tlačidlo podľa '
              'záložného textu „Otváracie hodiny“ a padal (vetva 151). Upratanie: jeden záložný text zhodný so slovenským prekladom.',
         dec=None, src='vetva 151'),
    dict(n=215, bucket=A, imp=N, eff=EM, pkg='Upratovanie a architektúra', kratko='knižnice staršie než oficiálna podpora Djanga 5.2',
         what='Po povýšení na Django 5.2 (vetva 154) ostanú pripnuté verzie, ktoré Django 5.2 oficiálne ešte neuvádzajú (podľa klasifikátorov na PyPI): '
              '`django-cors-headers` 4.3.1 (Django 5.2 uvádza od 4.7.0), `django-filter` 23.3 (od 25.1), `django-redis` 5.4.0 (od 6.0.0), `channels` '
              '4.1.0 (od 4.2.1) a `whitenoise` 6.6.0 (od 6.9.0). Pri `channels-redis` 4.2.0 (najnovšia 4.3.0) a `django-storages` 1.14.2 (najnovšia '
              '1.14.6) klasifikátor Djanga 5.2 neuvádza žiadna verzia.',
         note='Skúška 29. 10. 2026 (Django 5.2.18 + DRF 3.18.3 s týmito verziami): celá backendová sada, 38 kontrol s produkčnými nastaveniami '
              '(PostgreSQL, Redis, simulované S3), servery daphne a gunicorn s WebSocketom, Celery aj admin prešli, takže nič nehorí. Ide o oficiálnu '
              'podporu a opravy chýb, nie o súčasný problém. Povyšovať po jednej knižnici a po každej spustiť celú sadu; pred každým povýšením '
              'prečítať zápis zmien.',
         dec=None, src='vetva 152'),
    dict(n=216, bucket=A, imp=N, eff=ES, pkg='Výkon a plynulosť', kratko='stránka `/search` pošle hľadanie pri prvom načítaní dvakrát',
         what='Stránka `/search` pošle pri prvom načítaní to isté hľadanie dvakrát: hneď (prihlásený používateľ ešte nie je známy) a znova po '
              'odpovedi `/api/auth/me/`, lebo `user?.id` je v závislostiach `fetchSearch` a `fetchGlobal` (`app/search/page.tsx`). Na kartách '
              '„Všetko“ a „Ľudia“ druhé hľadanie na chvíľu nahradí sekciu „Ľudia“ kostrou, ktorá je o 14 px vyššia, takže sa obsah po prvom '
              'vykreslení posunie a vzápätí vráti (výška `main` 2 175 → 2 189 → 2 175 px). Zmerané 29. 10. 2026 v Chromiu na produkčnom '
              'builde; na Railway trvá medzistav tak dlho ako druhá odpoveď, teda aj stovky ms.',
         note='Súbor `app/search/page.tsx` má 648 riadkov (chránený podľa `svaply.mdc`), preto sa nemenil. Klientske filtrovanie vlastných '
              'ponúk podľa `user?.id` je pri prihlásených zbytočné: backend ich vynecháva sám (`accounts/views/search.py:65`, '
              '`search_global.py:236`). Návrh: nechať `user?.id` mimo závislostí načítania (filter pri vykreslení alebo bez filtra), čím '
              'zostane jedno hľadanie a zmizne posun obsahu. Chyba sa prejavila v E2E testoch ako nález 217 (testy sa kvôli nej teraz '
              'čakajú na ustálenie stránky).',
         dec=None, src='vetva 153'),
    dict(n=219, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy', kratko='dôkazy pri páde E2E: snímka stránky bez časového limitu',
         what='`PageActivity.report()` (`e2e/support/page-activity.ts`) čaká na `page.evaluate(readPageSnapshot)` bez časového limitu. Ak hlavné vlákno '
              'stránky zamrzne (napr. nekonečný cyklus), `evaluate` sa nevráti ani nevyhodí chybu, `afterEach` visí do limitu hooku, pôvodné '
              'zlyhanie sa stratí a dôkazy o požiadavkách sa nevypíšu práve v prípade, na ktorý sú určené (CodeRabbit, PR #210, Minor).',
         note='Návrh: obmedziť čakanie na snímku na 3 s pomocou pomôcky `withTimeout` v `page-activity-format.ts` (časovač sa musí zrušiť; test '
              's nikdy nekončiacim sľubom) a pri vypršaní vypísať „page state: unavailable“ spolu s požiadavkami. Spolu s tým upraviť hlášku '
              'v `search-settled.ts` („Both initial searches…“ → „The initial search requests…“): CodeRabbit ju čítal ako požiadavku na dve '
              'hľadania, no kód čaká len na 0,4 s ticha po načítaní používateľa a jedno hľadanie stačí, takže jeho druhý bod (zaseknutie pri '
              'už inicializovanom `authBootstrapSnapshot`) neplatí. Dve štylistické poznámky k `ZOZNAM.md` (rozdeliť dlhé súvetia pri nálezoch '
              'o diagnostike a o dôkazoch) sú kozmetika a CodeRabbit ich sám označil za nepotvrdené. Vetva 153 sa zlúčila bez nich.',
         dec=None, src='vetva 153'),
    dict(n=223, bucket=P, imp=N, eff=EM, pkg='Spoľahlivosť CI a testov',
         kratko='občasné zlyhanie siete pri `GET /api/auth/me/` počas prípravy E2E (príčina nepreukázaná)',
         what='Codex pri behu špecu `profile-numeric-language` (nasadený `main` `e3ed0f42`) hlásil občasné zlyhanie siete '
              'pri prípravnom `GET /api/auth/me/`: z 8 pokusov 2 zastavilo toto zlyhanie už počas prípravy a poľský tmavý profilový variant preto '
              'raz padol, pri troch opakovaniach potom prešiel (3 z 3). Presná príčina nie je preukázaná. Ďalšie dôkazy: v celom behu 30. 10. '
              '(`main` `e2612438`, 19:08 až 19:45 UTC) skončil druhý `GET /api/auth/me/` sieťovou chybou po 24 178 ms (19:30:21 UTC), '
              '25 246 ms (19:35:09) a 24 430 ms (19:36:43); v diagnostických opakovaniach `mobile-settings-navigation` (20:00:30 UTC) prišli 401 '
              'na pollingových GET a 403 na `POST /api/token/refresh/` a v `offer-watch-card-actions` (20:02:46 UTC) vrátil `GET /api/auth/me/` 401 '
              'a adresa skončila na `/`. Dňa 31. 10. (07:09 až 07:10 UTC) sa v tmavom variante jazykového špecu po úvodnom `GET /api/auth/me/` '
              '200 dve požiadavky zasekli na 21 s (sieťová chyba) a potom prišli 401 (asi 1,3 s) a 403 pri obnove (asi 1,1 s), teda odpovede '
              'boli pomalé, nielen odmietnuté.',
         note='Codex výslovne žiada nepripisovať ju automaticky Railway ani povýšeniu na Django 5.2 (nasadené 30. 10. 2026). Kontrola logov Railway '
              'majiteľom (okná 20:29 až 20:40 a 21:00 až 21:03 nášho času, teda 19:29 až 19:40 a 20:00 až 20:03 UTC; dátum v jeho súhrne bol 29. 10., '
              'čaká na potvrdenie, že išlo o 30. 10.): žiadne reštarty ani pády, žiadne HTTP 500 až 504, PostgreSQL a Redis bez zjavných problémov, '
              'Celery úspešne; opakované `WSREJECT` s `missing_token` pri WebSockete (pravdepodobne odhlásený testovací prehliadač, súvisí s '
              'nálezom 9, ktorý sa vo vetve 161 nepotvrdil: neprihlásené spojenie sa lokálne odmieta za milisekundy); metriky CPU a RAM v logoch nie sú a zaseknuté požiadavky sa nepotvrdili. V dostupných logoch teda nie je dôkaz, že za '
              'pády testov môže Railway; príčina ostáva neurčená. V kóde je zapnutá rotácia obnovovacích tokenov (`ROTATE_REFRESH_TOKENS`, '
              '`BLACKLIST_AFTER_ROTATION`, prístupový token 15 minút, `swaply/settings_split/jwt.py`), čo je relevantné pri 401 a 403, no nie je to dôkaz. '
              'Sonda Codexa (31. 10. 2026, 13:06 až 13:16 UTC, 600 288 ms; Node `https` bez prehliadača, prihlásenia a cookies, z toho '
              'istého kontajnera a obrazu `mcr.microsoft.com/playwright:v1.63.0-noble`; `GET /` na frontende a `GET /api/` na verejnom '
              'koreni API, nové aj znovu použité spojenia, telo odpovede sa zahodilo): 122 z 122 odpovedí HTTP 200, 0 sieťových chýb, 0 '
              'timeoutov, 0 meraní nad 10 s a dve nad 2 s (maximum 2,84 s; mediány 75 až 240 ms). Zaseknutie sa vo verejných Node volaniach '
              'nezopakovalo. Je to indícia, nie dôkaz: sonda nepoužila autentifikované `/api/auth/me/`, obnovu JWT ani prehliadačový '
              'protokol, takže nehovorí nič o WebKite ani o relácii testu. Nález ostáva otvorený. Ďalší krok (Codex): rovnaké verejné volania '
              'priamo z WebKitu v Dockeri v tom istom čase ako Node sonda; nespúšťať celý beh len kvôli zelenému výsledku. Ak sa zasekne aj '
              'tam, pripojiť blok `[E2E-EVIDENCE]`. Dovtedy nič neopravovať. Celý beh po nasadení Next 16 (1. 11. 2026, 07:32 až 08:14 UTC, '
              '`main` `9e311839`, PR #218) priniesol 21 pádov oproti prijatému stavu: 17 z nich prešlo pri všetkých troch opakovaniach, '
              'jeden (svetlý mobilný variant `profile-numeric-language`) padol 2 zo 4 pokusov na nedokončenom `GET /api/auth/feed/posts/` ešte '
              'pred otvorením číselnej adresy (nie je to návrat nálezu 222), jeden preskočil dátový strážca (položka 16) a dva kľúče (jeden test v dvoch '
              'projektoch) sú jedna skutočná regresia (nález 231, opravená). V pôvodných pádoch sa opäť objavili 401 (4×, z toho 3× aj 403 pri obnove relácie), '
              '`GET /api/auth/me/` zlyhal po 22 690 ms (nemecký tmavý profilový variant, po troch opakovaniach prešiel) a viaceré '
              'pollingové a zoznamové požiadavky ostali pending alebo zlyhali po asi 16 s. Pomer 17 z 21 svedčí skôr o nestabilite prostredia '
              'než o dôsledku povýšenia, no príčinu nepreukazuje. Návrh: majiteľ prejde logy Railway aj pre okno 07:32 až 08:30 UTC dňa '
              '1. 11. (rovnaké otázky ako 30. 10.). Dodatok 1. 11. 2026 (Codex, `main` `583b94c0`): prvý pokus celého behu zasiahol vyčerpaný '
              'limit Railway (stránka `/dashboard/watches` a obnova relácie vracali 404 o 15:13:34 a 15:18:33 UTC, potvrdil majiteľ) a '
              'nezapočítava sa. Po navýšení limitu nový celý beh dal 418 prešlo, 13 zlyhalo a 307 preskočených (prijatý stav 427, 2, 303 '
              'sa nemení); tri diagnostické vykonania každého zo 13 zlyhaných kľúčov dali 37 prešlo a 2 zlyhali. Zlyhania majú spoločný vzor: '
              'príprava sa zastaví pred samotnou kontrolou (`feed-list` sa nezobrazil, `GET /api/auth/feed/posts/` ostal pending, '
              '`GET /api/auth/me/` alebo vyhľadávanie zlyhali po asi 23 s, obnova relácie dostala 401 a 403). Dva pády sa zopakovali 2 zo 4 '
              '(`offer-card-review-translations`, desktopový WebKit, a `profile-numeric-language`, svetlý mobilný variant). Z logov Railway, '
              'ktoré majiteľ poslal, je potvrdená len jedna chyba: nález 232 (súbeh na serveri). Príčina '
              'týchto zlyhaní ostáva neurčená; nález ostáva otvorený a Codex pokračuje v mapovaní. Dodatok 1. 11. 2026 večer (Codex, `main` '
              '`5402c5de`, po PR 221): celý beh dal 427 prešlo, 4 zlyhali a 307 preskočených (WebKit desktop 129/1/116, WebKit mobil '
              '169/2/75, Chromium 129/1/116); všetkých 13 pádov z predošlého behu tentoraz prešlo. Zlyhali štyri iné kľúče (jeden je '
              'známy pád č. 3, tri sú nové kombinácie špec/projekt) a pri trojnásobnom opakovaní každého prešlo 12 z 12. Vzor je rovnaký ako '
              'predtým: príprava alebo navigácia sa zastaví na pending požiadavke (`/api/auth/me/`, `/api/auth/search/`, RSC požiadavka '
              'profilu asi 23 s), bez 401 a 403 a bez chýb stránky. Striedanie rôznych kľúčov a 12 z 12 pri opakovaní svedčí skôr o '
              'nestabilite prostredia než o regresii po PR 221, no príčinu nepreukazuje; nález ostáva otvorený. Kontrola logov Railway majiteľom (2. 11. 2026, všetky 4 časy pádov): vo '
              'všetkých sa objavuje odmietnutie WebSocket spojenia pre chýbajúci token (`missing_token`; ten istý záznam ako pri skoršej '
              'kontrole, súvisí s nálezom 9, ktorý sa nepotvrdil), Redis a PostgreSQL bez zjavnej chyby. Dôkaz, že tieto záznamy '
              'spôsobujú pády E2E testov, nie je; príčina pádov ostáva nepotvrdená. Dodatok 5. a 6. 11. 2026 (Codex, `main` `00d627ba`, '
              'cielený beh siedmich špecov histórie, návratov z profilu, vyhľadávania a Sledovaní): 110 prešlo, 3 zlyhali a 31 '
              'preskočených (WebKit desktop 38/2/8, WebKit mobil 32/1/15, Chromium 40/0/8). Všetky štyri pády z posledného celého '
              'behu prešli; tri nové kľúče zlyhali raz a pri izolovaných opakovaniach prešli (desktop 6 z 6, mobil 3 z 3). Vzor ostáva '
              'rovnaký: prvé požiadavky sú rýchle (stránka `/dashboard` 184 ms, `GET /api/auth/me/` 114 ms) a ďalšia požiadavka alebo '
              'dávka ostane pending 10 až 26 s; raz skončili `unread-summary` a `unread-count` 200 po asi 26,4 s a hneď potom prišlo 401 '
              'a pri obnove 403. Okná pádov: 20:08:42 až 20:08:53 UTC a 20:09:16 až 20:09:55 UTC (WebKit desktop) a 20:14:41 až '
              '20:14:51 UTC (WebKit mobil). Kontrola logov Railway majiteľom (6. 11.): backend fungoval, väčšina požiadaviek skončila '
              '200, dôkaz o výpadku servera sa nenašiel; dvakrát sa pri obnove prihlásenia objavilo 403 pre chýbajúce CSRF cookie, '
              'objavili sa aj 401, a logy neukazujú, ako dlho backend jednotlivé požiadavky spracovával. Tabuľka Codexa (29. 10. až '
              '5. 11. 2026; neúspešné testové pokusy so sieťovými alebo autentifikačnými príznakmi vrátane diagnostických opakovaní, nie '
              'jednotlivé požiadavky): WebKit desktop 29 (z toho 7 s obnovou 401/403), WebKit mobil 54 (6), Chromium desktop 0 (0). '
              'Spoločná príčina nie je preukázaná a počty zahŕňajú opakovania, no rozdiel je veľký a WebKit je engine Safari na '
              'iPhone, preto sa 223 nezatvára ako chyba prostredia testov. Z kódu to nevysvetľujú: cache Redis (predvolený limit 0,3 s '
              'a chyby sa ignorujú), pomalý dotaz do databázy (limit 5 s by skončil chybou) ani periodické úlohy (každých 5 minút, '
              'časy pádov sa s nimi nekryjú). Backend posiela pri každej odpovedi API hlavičku `X-App-Duration-Ms` (čas spracovania v '
              'Djangu); Codex ju od PR #229 (zlúčený 6. 11.) zapisuje do dôkazov pri obnove a pri odpovediach nad 5 s, spolu s názvami '
              'cookies a prítomnosťou `X-CSRFToken` pri 401 a 403 na obnove. Podľa nich sa rozhodne, či sa čas stráca v backende. Slabé '
              'miesta obnovy prihlásenia v prehliadači sú v nálezu 245. Navrhnutý ďalší krok: kontrolný beh WebKit proti Chromiu '
              'striedavo, už s týmito dôkazmi (počas neho sa nič nezlučuje).',
         dec=None, src='správa Codexa z 30. 10., 1. 11. a 5. 11. 2026 a kontrola logov Railway od majiteľa (2. 11. a 6. 11.)'),
    dict(n=224, bucket=A, imp=N, eff=EM, pkg='Navigácia – drobnosti',
         kratko='mobilné Nastavenia: po F5 vedie Zatvoriť na Nástenku, nie na profil',
         what='Nález majiteľa z manuálneho testu na iPhone Safari (30. 10. 2026): vo vlastnom profile → Menu → zoznam Nastavení (Upozornenia, '
              'Jazyk, Typ účtu, Sledovanie, Nastavenia súkromia, Blokované, Účet) po otvorení ktorejkoľvek sekcie a obnovení stránky (F5) vedie '
              'šípka Späť správne na zoznam Nastavení, ale Zatvoriť potom nevedie na profil, odkiaľ sa Nastavenia otvorili, ale na Nástenku. '
              'Lokálne reprodukované (30. 10., Chromium s rozmermi iPhonu): bez F5 vedie Zatvoriť na profil, po F5 v sekcii aj po F5 priamo '
              'na zozname vedie na Nástenku.',
         note='Príčina: záznam histórie Nastavení nesie značku s identitou načítania stránky (`PAGE_LOAD_ID` v `hooks/mobileSettingsOrigin.ts`), '
              'takže po F5 neplatí a `handleMobileSettingsClose` (`hooks/useMobileSettings.ts`) použije deterministický cieľ, teda Nástenku. Pôvod '
              'Nastavení (vlastný alebo cudzí profil, hamburger je na oboch) sa nikde neukladá. Šípka zo sekcie po F5 navyše vloží nový záznam '
              'zoznamu s prázdnym stavom (`pushState(null, …)` v `hooks/useDashboardState.ts`, 922 riadkov po jedinej schválenej výnimke (R24), inak sa súbor nemení, pozri TECH-01…11), '
              'takže ani zoznam už pôvod nenesie. Návrh: pôvod (adresu) uložiť do `history.state` záznamov Nastavení (prežije F5), alebo pre kartu '
              'do `sessionStorage`, a pri zatvorení po F5 ísť naň; zmena v `mobileSettingsOrigin.ts` a `useMobileSettings.ts` plus Jest testy. '
              'Zasahuje do histórie prehliadača, preto patrí do jedného balíka s nálezmi 13, 14 a 174 (Späť na mobile). Dopad na E2E: nový test pre '
              'Codexa (profil → Menu → Jazyk → F5 → Späť → Zatvoriť → profil). Majiteľ ho vedome odkladá na čas po nasadení. Majiteľ 1. 11. 2026 potvrdil, že problém platí len na mobile; na desktope sa '
              'nevyskytuje.',
         dec=None, src='manuálny test majiteľa, 30. 10. a 1. 11. 2026'),
    dict(n=225, bucket=P, imp=N, eff=EM, pkg='Spoľahlivosť CI a testov',
         kratko='E2E: voľba jazyka sa v emulovanom WebKite (Docker) neprepne, ťuk bez kliku pre `preventDefault` na `pointerdown` (iPhone v poriadku)',
         what='Testy `mobile: light language changes update the top title and survive reload` a ich tmavý variant (`mobile-language-header.spec.ts`, '
              '`webkit-mobile`) padajú vo WebKite v Dockeri: celý beh 30. 10. (`main` `e2612438`) 2 z 2, diagnostické opakovania 6 z 6 a porovnanie '
              'A/B 31. 10. v jednom kontajneri (obraz `mcr.microsoft.com/playwright:v1.63.0-noble`) 6 z 6 s historickou verziou špecu z `9346520e` '
              'aj 6 z 6 s aktuálnou; následný beh s pasívnou diagnostikou 0 PASS a 6 FAIL. Padajú na asercii prekladu tlačidla Späť po prvom '
              'prepnutí slovenčina → čeština (prvý krok, v ktorom sa nadpis nezmení, ale názov tlačidla áno). Pasívna diagnostika ťuku (Codex): '
              'dotyk na voľbu SK aj CZ vyvolá udalosti pointerdown, touchstart, pointerup a touchend, ale žiadny click; uložený aj označený jazyk '
              'ostane SK. Na reálnom iPhone (manuálny test majiteľa, 31. 10.) sa po výbere češtiny zmení text aj nadpis a v Chromiu s rozmermi '
              'iPhonu oba testy prechádzajú (30. 10., proti lokálnej kópii). Kód jazyka (`LanguageModule.tsx`, `MobileTopBar.tsx`, '
              '`LanguageContext.tsx`) ani preklady sa od posledného zeleného behu (29. 10., `main` `9346520e`) nezmenili.',
         note='Izolovaný pokus Codexa (31. 10. 2026, vetva `e2e/izolovane-sondy`; syntetická stránka bez aplikácie, prihlásenia a osobných '
              'údajov, 3 projekty, 96 pozorovaní, bez opakovaní): tlačidlo (natívne DOM aj React 18) so štyrmi kombináciami vlastností v '
              'troch kolách. Ťuk vytvoril click pri tlačidle bez oboch vlastností 3 z 3, len s `tabindex=-1` 3 z 3, len s `preventDefault()` '
              'na `pointerdown` 0 z 3 a s oboma 0 z 3 (natívne aj React); priamy click fungoval vo všetkých kombináciách. Rozdiel teda '
              'spôsobuje `preventDefault()` na `pointerdown`, nie `tabindex`. Je to vlastnosť tejto testovacej konfigurácie WebKitu '
              '(emulovaný dotyk v Dockeri); na reálnom iPhone voľba jazyka funguje (manuálny test majiteľa 31. 10.) a Codex ho fyzicky '
              'netestoval. Predošlý záznam s `defaultPrevented=false` sa spätne neprepisuje. Aplikácia sa nemení; dôvod `preventDefault()` v '
              '`LanguageModule.tsx` sa nezisťoval. Codex preto v jedinom kroku `mobile-language-header.spec.ts` (voľba jazyka) použil '
              '`click()` namiesto `tap()` s komentárom a odkazom na tento nález; ostatné gestá, kontroly prekladov, F5, časové limity a '
              'opakovania ostali; samostatné overenie: svetlý aj tmavý variant po trikrát, 6 z 6 prešlo (E2E súbory vlastní Codex a zmena je '
              'na jeho vetve). Posledný pokus tmavého variantu (31. 10.) skončil inak (sieťové chyby, 401 a 403) a patrí k nálezu 223, nie '
              'sem. V celom behu po nasadení Next 16 (1. 11. 2026) oba reálne produkčné scenáre prepínania všetkých šiestich jazykov '
              'vrátane F5 (svetlý aj tmavý) prešli; použitá je už schválená výnimka s `click()` pri voľbe jazyka, test sa nemenil. Nález '
              'ostáva otvorený kvôli emulovanému WebKitu v Dockeri (príčinu v aplikácii nepreukazuje).',
         dec=None, src='správa Codexa z 31. 10. a 1. 11. 2026'),
    dict(n=227, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='lint: nové pravidlá React vypnuté, ESLint 9 už nie je podporovaný',
         what='Po 184b (vetva 159) funguje `npm run lint` (`eslint .`); predtým sa pýtal na interaktívne nastavenie a v CI sa nespúšťa. Nový '
              '`eslint-config-next` 16 prináša pravidlá „React Compiler“ z `eslint-plugin-react-hooks` 7; na dnešnom kóde by pridali ~340 '
              'hlásení (`set-state-in-effect` 255, `refs` 57, `preserve-manual-memoization` 20, `immutability` 6, `purity` 1), preto sú v '
              '`eslint.config.mjs` vypnuté. Lint hlási 779 problémov (336 chýb a 443 varovaní): `no-unused-vars` 363, `no-explicit-any` 213, '
              '`no-require-imports` 101 a drobnosti; pred 184b to bolo 752 (721 chýb).',
         note='Návrh: najprv vyčistiť `no-unused-vars` a `no-explicit-any`, potom zapínať vypnuté pravidlá po jednom (najprv `purity`, '
              '`immutability`) a lint zapojiť do CI s prahom chýb. `npm ci` hlási, že `eslint@9.39.5` už nie je podporovaný; '
              '`eslint-config-next` 16 vyžaduje `eslint >=9.0.0`, takže povýšenie na novšiu hlavnú verziu je samostatný malý krok. Kolega ho nahlásil znova (5. 11. 2026); ostatné '
              'zastarané balíky v `package-lock.json` sú v nálezu 238.',
         dec=None, src='vetva 159'),
    dict(n=229, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         kratko='5 stredných zraniteľností v build nástroji Sentry (frontend)',
         what='`npm audit --omit=dev` hlási po 184b 5 stredných záznamov: `@sentry/nextjs` → `@sentry/bundler-plugins` a '
              '`@sentry/webpack-plugin` → `glob` a `minimatch` (DoS cez zosilnenie `globparts` a obídenie zrušenia cez `AbortSignal`). '
              'Všetko je v nástroji, ktorý beží len pri zostavení; nahrávanie zdrojových máp je vypnuté, kým nie je nastavený '
              '`SENTRY_AUTH_TOKEN`.',
         note='Nástroj navrhuje `npm audit fix --force`, no ponúka `@sentry/nextjs` 10.76.1, teda nižšiu verziu než dnešné `^10.76.2`, takže '
              'to nie je oprava. Čakať na novšiu verziu `@sentry/nextjs`, ktorá bundler plugin aktualizuje, a medzitým ich viesť ako známu '
              'výnimku v kontrole z nálezu 194. Doplnené 5. 11. 2026: v produkčnom strome je aj `@opentelemetry/sdk-trace-base` 2.12.0 '
              '(cez `@sentry/node`, `@sentry/node-core` a `@sentry/opentelemetry`), ktorý je v `package-lock.json` označený ako '
              'zastaraný; vymení ho tá istá aktualizácia `@sentry/nextjs`, viď nález 238.',
         dec=None, src='vetva 159'),
    dict(n=230, bucket=A, imp=N, eff=EM, pkg='Upratovanie a architektúra',
         kratko='prechod z webpacku na Turbopack (Next 16)',
         what='Next 16 používa predvolene Turbopack; aplikácia ho zatiaľ nepoužíva: `build` a `dev` majú od 184b `--webpack`, lebo Turbopack '
              'padá pri tvorbe stránok `/404` a `/500` na starom `src/pages/_document.tsx` (`PageNotFoundError: /_document`) a '
              '`next.config.js` má vlastný blok `webpack` (alias `@`, vypnutá cache vo vývoji).',
         note='Návrh: zmazať `src/pages/_document.tsx` (16 riadkov, `<Html lang="sk">`; jazyk rieši koreňový layout) a overiť, že sa `/404` '
              'a `/500` zostavia; potom zvážiť Turbopack najprv len pre `dev`. Nízka priorita, nič nehorí.',
         dec=None, src='vetva 159'),
]

# Úlohy na prípravu nasadenia (N1…) sú v `polozky_priprava.py`; tu sa len sprístupňujú pod pôvodným názvom.
from polozky_priprava import NTASKS  # noqa: E402,F401

# Nálezy od 232 sú v `polozky_nove_dalsie.py` (kvôli limitu 500 riadkov); do `NEW_ITEMS` sa pridávajú tu.
from polozky_nove_dalsie import NEW_ITEMS_DALSIE  # noqa: E402

NEW_ITEMS.extend(NEW_ITEMS_DALSIE)

# Nálezy od 251 (zo zoznamu majiteľa, príloha D) sú v `polozky_nove_nastenka.py`.
from polozky_nove_nastenka import NEW_ITEMS_NASTENKA  # noqa: E402

NEW_ITEMS.extend(NEW_ITEMS_NASTENKA)
