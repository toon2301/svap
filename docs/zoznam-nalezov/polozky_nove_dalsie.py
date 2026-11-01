# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 232 (nálezy 173 až 231 sú v `polozky_nove.py`; úlohy na prípravu ostrého nasadenia N1… v `polozky_priprava.py`).

Samostatný súbor kvôli limitu 500 riadkov. `polozky_nove.py` ich pripája do `NEW_ITEMS`, takže ostatné moduly sa nemenili.
Pravidlá sú rovnaké: otvorený nález sa po oprave odstráni odtiaľto a zapíše do `hotove.DONE_SINCE`; čísla sa nikdy nepoužívajú znova.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_DALSIE = [
    dict(n=232, bucket=P, imp=S_, eff=ES, pkg='Spoľahlivosť CI a testov',
         kratko='HTTP 500 pri upratovaní zdieľania z Nástenky (`DELETE /api/auth/feed/posts/<id>/`), príčina nepreukázaná',
         what='Celý beh Playwrightu po nasadení (1. 11. 2026, `main` `9e311839`): v `sharing-from-feed.spec.ts` (desktopový WebKit, '
              '07:34:13 až 07:34:54 UTC) vypršalo čakanie na odpoveď `POST` zdieľania a soft kontrola upratania hlásila pri mazaní príspevku '
              'HTTP 500 namiesto 204. Tri samostatné pokusy zdieľania potom prešli aj s upratovaním (3 z 3). Jeden zvyšok testovacieho '
              'príspevku sa so súhlasom majiteľa zmazal natrvalo. Test nevytvoril blok `[E2E-EVIDENCE]`, takže chýbajú údaje o požiadavke '
              '(ID, trvanie). Zdieľanie a mazanie sa v tom čase prekrývali s dlho visiacou požiadavkou (podobne ako pri 223).',
         note='Moje lokálne overenie (1. 11.): `DELETE` zdroja so zdieľaním vráti cez API na SQLite 204 a to isté prejde na modeli aj na '
              'PostgreSQL 16; zdieľanie prežije s prázdnym zdrojom (`SET_NULL`, obmedzenie `feed_post_type_consistency` to pripúšťa). Skúška '
              'súbehu v dvoch vláknach na PostgreSQL 16 (model, nie celé API): keď `DELETE` zdroja prebehne počas ešte nepotvrdeného zdieľania, '
              'chybou integrity skončí potvrdenie zdieľania (strácajúca strana je `POST`), nie `DELETE`; mazanie by zlyhalo len vtedy, keby '
              'sa zdieľanie potvrdilo v okne milisekúnd medzi nastavením `NULL` a potvrdením zmazania. Žiadna reprodukcia teda 500 pri '
              '`DELETE` nevyvolala a príčina ostáva neznáma (kaskádové mazanie súvisiacich záznamov, teda lajkov, komentárov, označení a '
              'nahlásení, som riadok po riadku neprešiel; signál na mazanie súborov z úložiska chyby pohlcuje). Kód '
              '(`accounts/views/feed_posts.py`, `post.delete()`) '
              'sa nemení, kým nie je k dispozícii záznam chyby. Čo treba: majiteľ vyhľadá v logu backendu na Railway okno 07:34:13 až '
              '07:34:54 UTC dňa 1. 11. 2026 (`Internal Server Error` alebo traceback pri `DELETE` na `/api/auth/feed/posts/`) a pošle názov '
              'výnimky bez osobných údajov. Dopad na E2E (Codex): pri vypršaní čakania na `POST` upratať aj prípadné neskoro vzniknuté '
              'zdieľanie a nemaskovať 500 opakovaným mazaním (poradie upratovania v `e2e/support/feed.ts`).',
         dec=None, src='správa Codexa z 1. 11. 2026'),
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
              'zhodu s autorom) rieši majiteľ.',
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
              'Rozhodnutie R12 je na majiteľovi. Odporúčanie: dokončiť až po nasadení (väčší balík: koncové body, QR kód, záložné kódy, '
              'obrazovky vo všetkých šiestich jazykoch, ochrana pred opakovaním, testy); dovtedy sa 2FA nikomu neponúka, takže jeho '
              'chýbanie nikomu neškodí. Ak má byť pri štarte, patrí do vlny 1.',
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
