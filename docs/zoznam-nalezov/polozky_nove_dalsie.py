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
]
