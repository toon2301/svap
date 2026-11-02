# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 232 (nálezy 173 až 231 sú v `polozky_nove.py`; úlohy na prípravu ostrého nasadenia N1… v `polozky_priprava.py`).

Samostatný súbor kvôli limitu 500 riadkov. `polozky_nove.py` ich pripája do `NEW_ITEMS`, takže ostatné moduly sa nemenili.
Pravidlá sú rovnaké: otvorený nález sa po oprave odstráni odtiaľto a zapíše do `hotove.DONE_SINCE`; čísla sa nikdy nepoužívajú znova.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_DALSIE = [
    dict(n=232, bucket=P, imp=S_, eff=EM, pkg='Produkčná odolnosť aplikácie',
         kratko='HTTP 500 pri zmazaní príspevku, ktorý sa práve zdieľa (súbeh na serveri, príčina potvrdená logom Railway)',
         what='Celý beh Playwrightu po nasadení (1. 11. 2026, `main` `9e311839`): v `sharing-from-feed.spec.ts` (desktopový WebKit, '
              '07:34:13 až 07:34:54 UTC) vypršalo čakanie na odpoveď `POST` zdieľania a soft kontrola upratania hlásila pri mazaní príspevku '
              'HTTP 500 namiesto 204. Tri samostatné pokusy zdieľania potom prešli aj s upratovaním (3 z 3). Jeden zvyšok testovacieho '
              'príspevku sa so súhlasom majiteľa zmazal natrvalo. Test nevytvoril blok `[E2E-EVIDENCE]`, takže chýbajú údaje o požiadavke '
              '(ID, trvanie). Zdieľanie a mazanie sa v tom čase prekrývali s dlho visiacou požiadavkou (podobne ako pri 223). Potvrdené logom Railway (majiteľ, 1. 11. 2026): 07:34:53 UTC, '
              '`DELETE /api/auth/feed/posts/460/` vrátil 500; PostgreSQL `ForeignKeyViolation` na obmedzení '
              '`accounts_feedpost_shared_feed_post_id_…`: príspevok 460 bol ešte referencovaný iným záznamom v `accounts_feedpost`, teda '
              'zdieľaním.',
         note='Príčina je súbeh na serveri, nie len chyba testu. Zdieľanie (vytvorenie príspevku so `shared_feed_post`) a zmazanie jeho zdroja sa '
              'môžu prekryť: `DELETE` (`accounts/views/feed_posts.py`, `post.delete()`) riadok zdroja nezamyká a vytvorenie zdieľania (tamže, '
              '`transaction.atomic()` s `FeedPost.objects.create`) zdroj nezamyká tiež. Cudzí kľúč sa v PostgreSQL kontroluje až pri `COMMIT`, takže ak '
              'sa zdieľanie potvrdí po tom, čo `delete()` zistil súvisiace záznamy, ale pred jeho `COMMIT`, zmazanie zlyhá s 500 (v opačnom poradí '
              'zlyhá vytvorenie zdieľania). V E2E to najpravdepodobnejšie spôsobilo pomalé `POST` zdieľania: čakanie vypršalo a upratovanie zmazalo zdroj, kým server '
              'zdieľanie ešte dokončoval. Skutočný používateľ to zažije len pri prekrytí oboch akcií v tej istej chvíli (zriedkavé), no 500 je '
              'nesprávna odpoveď. Rovnaký vzorec je pravdepodobne aj pri zdieľaní ponuky a položky portfólia (`shared_offer`, '
              '`shared_portfolio_item`; neskúšané). Moja skoršia skúška súbehu v dvoch vláknach (PostgreSQL 16) ukázala jednu stranu mechanizmu '
              '(zlyhá zdieľanie) a pripúšťala druhú (zlyhá zmazanie); log Railway potvrdil druhú. Návrh opravy (samostatná vetva po 161, teraz sa '
              'nerobí): v tej istej transakcii zamknúť riadok zdroja (`select_for_update`) pri vytvorení zdieľania aj pri zmazaní (zdieľanie sa '
              'sploští na koreňový príspevok, zamykať treba ten, na ktorý cudzí kľúč skutočne ukazuje); keď zdroj už neexistuje, vrátiť jasnú 4xx '
              'namiesto 500; k tomu test súbehu v dvoch vláknach na PostgreSQL. Dopad na E2E (Codex): upratovať zdieľanie pred zdrojom a 500 '
              'nemaskovať opakovaním (poradie upratovania v `e2e/support/feed.ts`). Codex 1. 11. 2026 (`main` `583b94c0`): riziko poradia '
              'upratovania potvrdené (najprv sa maže známe ID, až potom sa hľadajú ďalšie podľa značky, len jedna stránka zoznamu, stav GET sa '
              'neoveruje); návrh malej E2E opravy čaká na súhlas majiteľa a serverový súbeh nezmení; oba špecy zdieľania prešli v novom celom '
              'behu vo všetkých troch projektoch (9 kontrol upratania bez neúspešného stavu).',
         dec=None, src='správa Codexa z 1. 11. 2026 a log Railway od majiteľa'),
    dict(n=233, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='E2E nemá scenár pre fotku v správach, emoji, reset hesla a O nás / FAQ / Kontakt',
         what='Codex v celom behu po nasadení (1. 11. 2026) potvrdil, že kolekcia 738 testov nemá samostatný scenár pre: odoslanie fotky v '
              'správach a zotrvanie okna dole (nález 218), výber emoji, reset hesla a verejné stránky O nás, FAQ a Kontakt; tieto funkcie '
              'preto beh nepotvrdil (manuálne ich overuje majiteľ). Odoslanie fotky na Railway je podľa odovzdania zakázané bez osobitnej '
              'dohody. Súvisiaca nepokrytá položka: `offer-watch-author-from-profile.spec.ts` (položka 16) sa v celom behu aj v opakovaniach '
              'preskočila dátovým strážcom (chýba uložené sledovanie alebo živá zhoda s autorom so slugom).',
         note='Návrh (E2E vlastní Codex): po schválení doplniť scenáre, ktoré nezapisujú do produkcie (reset hesla bez odoslania, verejné '
              'stránky, emoji výber) a pre fotku v správach bezpečný lokálny alebo riadený test medzi určenými účtami. Dátový guard položky 16 '
              'treba doplniť pevnou kategóriou preskočenia (nie ľubovoľným textom). Úlohu majiteľa (overiť uložené sledovanie a jeho živú '
              'zhodu s autorom) rieši majiteľ. Aktualizácia 1. 11. 2026 (Codex, po overení vetvy 160): návrh bezpečných scenárov je hotový, '
              'implementácia čaká na súhlas majiteľa. Verejné stránky a FAQ (bez odoslania kontaktného formulára), reset hesla (syntetický POST so '
              'strážcom zápisov, bez reálneho e-mailu), emoji (len do konceptu, bez odoslania) a fotka v správach (len lokálny produkčný build '
              's testovacou databázou, bez produkčných údajov). Pevná kategória dátového preskočenia pre položku 16: v oboch desktopových '
              'projektoch `no_live_match_with_slug` (prvé sledovanie nemá živú zhodu s autorom s adresou profilu), v mobile '
              '`not_applicable_mobile`; úloha majiteľa ostáva.',
         dec=None, src='správa Codexa z 1. 11. 2026'),
    dict(n=235, bucket=A, imp=S_, eff=EL, pkg='Funkcie – väčšie balíky',
         kratko='2FA je nedokončená funkcia: nedá sa zapnúť ani zadať pri prihlásení z aplikácie',
         what='Pri oprave nálezu 179 (vetva 161) sa ukázalo, že dvojfázové overenie (2FA, TOTP) je len polovica funkcie. Backend vie overiť kód '
              'pri prihlásení, ak je v profile `mfa_enabled` a `mfa_secret`, no nič tieto polia nenastaví: neexistuje koncový bod na zapnutie '
              '(vytvorenie secretu, QR kód, potvrdenie prvým kódom), na vypnutie ani na záložné kódy a administrácia tieto polia neponúka. '
              'Frontend o 2FA nevie nič: prihlásenie nikdy neposiela pole `totp`, nie je obrazovka na zadanie kódu ani prepínač v '
              'nastaveniach (API nastavení vracia len príznak `two_factor_auth`, ktorý frontend nepoužíva). Používateľ s 2FA by sa cez aplikáciu neprihlásil (dostal by „Vyžaduje '
              'sa 2FA kód.“); zapnúť sa dá len priamo v databáze alebo v Django shelli.',
         note='Nič z toho nebolo v zadaní nálezu 179, preto sa neopravuje. Aj v časti, ktorá existuje, chýba: (1) ochrana pred opakovaním, '
              'už použitý kód ostáva platný do konca okna (dnes ±30 s, teda až 90 s); (2) technické zlyhanie overenia (neplatný šifrovací '
              'kľúč, poškodený secret) vráti len hlášku „Chyba pri overovaní 2FA.“ a nezapíše sa do logu, takže by ostalo nepovšimnuté. '
              'CodeRabbit (PR #221) označil bod (1) ako Major; zatiaľ sa nerobí, lebo 2FA sa cez aplikáciu zapnúť nedá a ochrana patrí k '
              'dokončeniu tejto funkcie. Cesta k opakovanému použitiu kódu však existuje pre každý účet, ktorému by sa 2FA zapol ručne v '
              'databáze; či taký účet je v produkcii, nevieme (kontrola: počet profilov s `mfa_enabled`). Ak taký účet je, robí sa to hneď. '
              'Rozhodnutie R12 je na majiteľovi. Odporúčanie: dokončiť až po nasadení (väčší balík: koncové body, QR kód, záložné kódy, '
              'obrazovky vo všetkých šiestich jazykoch, ochrana pred opakovaním, testy); dovtedy sa 2FA používateľom neponúka, takže jeho '
              'chýbanie bežným používateľom neškodí. Ak má byť pri štarte, patrí do vlny 1.',
         dec='ROZHODNUTIE R12', src='vetva 161'),
    dict(n=236, bucket=P, imp=N, eff=ES, pkg='Produkčná odolnosť aplikácie',
         kratko='Neznáma cesta pod `/ws/` skončí chybou 500 a výpisom v logu (asi po 1 s), aj bez prihlásenia',
         what='Zistené pri meraní nálezu 9 (vetva 161): WebSocket na cestu, ktorú aplikácia nepozná (napr. `/ws/unknown/`), prejde kontrolou '
              'originu a prihlásením (to len zapíše stav do `scope`) a až `URLRouter` vyhodí `ValueError: No route found for path ...`. '
              '`daphne` to zapíše do logu ako „Exception inside application“ s celým výpisom a odpovie HTTP 500; v lokálnom meraní to trvalo '
              'asi 1 s (pri známej ceste bez tokenu príde odpoveď `403` za milisekundy). Platí to aj bez tokenu, takže to môže vyvolať '
              'ktokoľvek z internetu.',
         note='Dopad je malý, no po nasadení ide o dobre známy šum: každé preskúmanie ciest vyrobí v logu výpis a drží spojenie asi '
              'sekundu, čo prekryje skutočné chyby. Navrhovaná oprava (nerobí sa bez odsúhlasenia, je mimo zadania nálezu 9): doplniť do '
              '`swaply/routing.py` záverečnú cestu, ktorá spojenie na neznámu cestu hneď zatvorí (napr. kódom 4404) bez výnimky, plus test. '
              'Časové limity proxy (N8) to nenahradia.',
         dec=None, src='vetva 161'),
]
