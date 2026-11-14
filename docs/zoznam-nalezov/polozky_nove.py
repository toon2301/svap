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
         note='Zahŕňa APP-02 a APP-03 z registra. R2 je rozhodnuté 13. 11. 2026: všetkých šesť jazykov (sk, cs, hu, de, pl, en) má byť pri '
              'štarte plne preložených, takže nález ide pred štart. '
              'Odporúčanie: jeden preklad naraz, najprv profil, vyhľadávanie a karty ponúk. ' +
              'Doplnok 10. 11. 2026 (kolega v K17, agent čísla preveril): v `cs.json` má 29 hodnôt slovenské písmená (ľ, ĺ, ŕ, ô, ä) '
              'a asi 394 viacslovných hodnôt je zhodných so `sk.json` (napr. dialóg zmazania recenzie `reviews.deleteReviewMessage` a '
              '`reviews.reportError`; v `reviews.*` je takých 17); z nich je 264 v `skillsCatalog`, kde sú technické názvy legitímne '
              'zhodné, takže mimo katalógu zručností je to asi 130. Ostatné jazyky podľa rovnakého počítania (spolu, z toho v '
              '`skillsCatalog`): pl 123 (66), en 93 (79), de 260 (258), hu 40, teda mimo katalógu asi pl 57, en 14 a de 2. Oprava '
              'R2 je rozhodnuté: všetkých šesť jazykov pred štartom. '
              'Doplnok 13. 11. 2026 (kolega, K21): maďarský preklad pomenúva sekciu Žiadosti nejednotne: `navigation.requests` je '
              '„Kérelmek“ a `requests.title` (nadpis stránky) je „Kérések“ (`frontend/messages/hu.json`); pri mapovaní po jazykoch '
              'treba zvoliť jeden výraz a rovnaký použiť aj v novej vete opisu hlavného vypínača (`notifications.turnOffAllDesc`, '
              'nález 330), ktorá dnes používa „Kérelmek“.',
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
              'Spustené 26. 10. 2026, časť 183a 27. 10. 2026, časť 183b (vetva 154) 30. 10. 2026; počty sú záznamy nástroja, nie doslovný zoznam zneužiteľných chýb. Doplnok z K12 (8. 11. 2026): výnimka `PYSEC-2026-1845` (pytest '
              '8.3.2) je v `.github/dependency-audit-exceptions.json` s podmienkou „zatvorí nález 183 (pytest 9)“; po povýšení na pytest 9 '
              'ju týždenný audit ohlási ako zastaranú a treba ju odstrániť. Doplnok z K14 (8. 11. 2026): audit teraz číta `backend/constraints.txt`, '
              'takže pri povýšení na pytest 9 treba obnoviť aj zámok (postup je v jeho hlavičke).',
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
              'strane (hlavička `CF-IPCountry` pri Cloudflare, GeoIP na backende). Súvisí s OW-18 (krajina vo vyhľadávaní). '
              'DOPLNOK 13. 11. 2026 (kolega, K21; po oprave 332): pri prvej návšteve (bez uloženej voľby a bez čerstvej vyrovnávacej '
              'pamäte krajiny) sa úvodná stránka najprv ukáže po slovensky (začiatočný stav `sk` v `LanguageContext.tsx`) a po '
              'odpovedi `ipapi.co` sa prepne; v Chromiu so simulovaným oneskorením 400 ms to bolo asi 0,4 s po slovensky, pri '
              'slovenskom prostredí a pri ručnej voľbe sa jazyk neprepína. Serverové zistenie krajiny (hlavička `CF-IPCountry`, R7) '
              'by zablikanie odstránilo a umožnilo by aj správny atribút `lang` už v prvom HTML (nález 335 rieši len zápis `lang` v '
              'prehliadači).',
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
              'robiť spolu s nálezom 194 (úprava workflow). Doplnok z K12 (8. 11. 2026): nový workflow '
              '`.github/workflows/dependency-audit.yml` používa `actions/checkout@v4`, `actions/setup-node@v4` a '
              '`actions/setup-python@v5` a v logu behu je hneď varovanie „Node.js 20 is deprecated“; treba ho zahrnúť do tohto nálezu a '
              'povýšiť spolu s `deploy.yml`. Doplnok z K14 (8. 11. 2026): `actions/setup-python@v4` je v `deploy.yml` stále dvakrát (riadky 57 a '
              '132) a podľa kolegu to `actionlint` hlási aj na `main`.',
         dec=None, src='vetva 143'),
    dict(n=204, bucket=P, imp=N, eff=ES, pkg='Preklady a hlášky', kratko='nepoužitý kľúč `profile.photoRemovedError` (zvyšok po K6)',
         what='ČIASTOČNE HOTOVÉ: tri chýbajúce kľúče (`feed.captionPlaceholder`, `feed.commentsClose`, `feed.openProfile`) aj tri falošné '
              'kľúče zo skriptu sú hotové v K6 (nález 120, PR #234, zlúčené 6. 11. 2026, commit `6fe2c8ea`): '
              '`npm run check:used-translation-keys` teraz končí s 0 chýbajúcimi kľúčmi. Časť CI je hotová v K12 (PR #242, zlúčené 8. 11. 2026, '
              'commit `3eff7772`): v jobe `checks` v `deploy.yml` beží po `npm ci` krok `check:used-translation-keys` (v CI je zelený). '
              'OSTÁVA: `profile.photoRemovedError` je preložený '
              'vo všetkých jazykoch, no kód ho nepoužíva a ukazuje doslovný text „Nepodarilo sa odstrániť fotku. Skúste znova.“ v '
              '`ProfileModule.tsx:468` (563 riadkov, nad limitom). Ten istý text je aj v `ProfileEditForm.tsx:250` (432 riadkov), no ten '
              'komponent je nepoužitý (nález 239), takže sa neopravuje: zmizne so zmazaním komponentu.',
         note='`ProfileModule.tsx` vyžaduje delenie súboru alebo výnimku od majiteľa (oprava: `t("profile.photoRemovedError", …)`). '
              'Druhý skript `check:missing-translations` (úplnosť ostatných jazykov) v CI zatiaľ nie je: nález 297.',
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
              'miesto (nízky · S). '
              'Doplnok z K14 (8. 11. 2026): `frontend/src/utils/__tests__/csrf.test.ts:28` používa `require(...)` (pravidlo '
              '`no-require-imports`); podľa kolegu je to na `main` od júna a ESLint je na súboroch zmenených v K14 inak čistý.',
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
              '(stav dát). Otvorené: ktorý z účtov A a B je hlavný E2E účet a ktorý `E2E_PEER_SLUG`, a od kedy je A súkromný. Re-check Codexu '
              '(po K8 až K12, 8. 11. 2026): (a) `offer-reviews-back.spec.ts:185`: súkromný `E2E_PEER_SLUG` môže pád vysvetliť (test '
              'očakáva dostupný cudzí profil), historické nastavenie však nie je potvrdené; (b) `messages-peer-profile.spec.ts:139` a '
              '`:157`: samotné súkromie pôvodný pád nevysvetľuje (existujúca konverzácia môže ostať dostupná aj so súkromným účtom a '
              'príprava zlyhala ešte pred otvorením profilu), takže (b) ostáva nevysvetlené; (c) `profile-entry-scroll.spec.ts:218` a '
              '`:237`: súkromie môže výsledok ovplyvniť, lebo test kontroluje vlastníka ponuky, nie autora príspevku, a ak ju zdieľal '
              'súkromný druhý účet, príspevok môže byť správne skrytý (historické dôkazy autora neurčujú). Pády sa neoznačujú za '
              'nestabilitu prostredia a automaticky sa neuzatvárajú. Návrh Codexa: celý beh po potvrdení nasadenia v okne bez zmien '
              '(osobitne sledovať `mobile-settings-navigation.spec.ts` a `mobile-settings-offer-watch-motion.spec.ts`). Návrh agenta: '
              'doplniť do `requirePeerConversation` diagnostiku (koľko konverzácií na prvej stránke prešlo každou podmienkou, len '
              'počty) a bez zmeny testov zistiť (áno alebo nie), či hlavný E2E účet vidí profil `E2E_PEER_SLUG`. '
              'Dodatok 9. 11. 2026 (Codex, `main` `5bf32b26`, po obnovení dát hlavného účtu majiteľom): oba konverzačné testy (b) '
              'prešli a `[E2E-PEER]` ukázal `firstPage=1 slugMatches=1 deletedMatches=0 namedMatches=1 nameMatches=1`; hlavný účet '
              'profil `E2E_PEER_SLUG` vidí (áno); oba návraty z Nástenky (c) prešli. K (a) Codex v tomto behu samostatný záver '
              'neuviedol. Dátové medzery ostávajú: stránkovanie Sledovaní potrebuje aspoň 11 živých zhôd (strážca '
              '`no_paginated_watch`), scenár firemných hodín potrebuje firemný profil s hodinami a 55 prechodov PASS→SKIP v celom '
              'behu vzniklo zo strážcov dát (24 desktopových prekladov recenzií, 7 prekladov Like, 11 stránkovania, 12 upozornení, 1 '
              'firemné hodiny); ďalšie dáta (návody otáčania, prečítané upozornenia, história) sa dohodnú samostatne. Nevytvárať '
              'ďalšie účty ani verejný obsah len kvôli SKIP.',
         dec=None, src='vetva 151 a Codex, 9. 11. 2026'),
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
              'zastarané balíky v `package-lock.json` sú v nálezu 238. Doplnok z K12 (8. 11. 2026): AST sken kolegu našiel 37 zápisov '
              '`ref.current` počas renderu v 27 súboroch (36 priamych); pravidlo `react-hooks/refs` je vypnuté v `eslint.config.mjs` '
              '(riadok 13). Nález 292 opravil jedno takéto miesto (K11).',
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
              'zastaraný; vymení ho tá istá aktualizácia `@sentry/nextjs`, viď nález 238. Doplnok z K12 (8. 11. 2026): `glob` a `minimatch` sú '
              'moderate, takže pri prahu `high` (`--npm-level high` v `dependency-audit.yml`) ich týždenný audit nehlási a vo výnimkách '
              'nie sú; ak sa prah zníži na `moderate`, treba ich pridať do `.github/dependency-audit-exceptions.json` s podmienkou '
              '„zatvorí nález 229“.',
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

# Nálezy od 305 (kandidáti kolegu z K13 a K14 a ručné testy po K14) sú v `polozky_nove_k14.py`.
from polozky_nove_k14 import NEW_ITEMS_K14  # noqa: E402

NEW_ITEMS.extend(NEW_ITEMS_K14)

# Nález 223 (dlhý denník dôkazov) je v `polozky_nove_223.py` (kvôli limitu 500 riadkov).
from polozky_nove_223 import NEW_ITEMS_223  # noqa: E402

NEW_ITEMS.extend(NEW_ITEMS_223)
