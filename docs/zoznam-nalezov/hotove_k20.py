# -*- coding: utf-8 -*-
"""Nálezy opravené od 13. 11. 2026 (po K20): `DONE_SINCE_K20`.

Samostatný súbor kvôli limitu 500 riadkov (`hotove_dalsie.py` má 496 riadkov). `hotove.py` ho pripája do `DONE_SINCE`. Nový opravený nález sa pridáva sem.
"""

DONE_SINCE_K20 = [
    dict(n=329, vetva='175', pr='#259', zlucene=True,
         text='HOTOVÉ (vetva 175, zlúčené v PR #259 dňa 13. 11. 2026, commit `ca8c4c5b`, merge `203e8d14`; mapovanie a oprava agenta '
               'na výslovnú žiadosť majiteľa, jednorazová výnimka z pravidla, že agent kód aplikácie nemení). HLÁSENIE MAJITEĽA (ručné '
               'testy po K20, 13. 11. 2026): používateľ A sa nenájde vo vyhľadávaní používateľa B ani pri presnom mene (odpoveď 200, 0 '
               'používateľov a 0 kariet), hoci sa jeho profil otvorí cez odkaz. PRÍČINA HLÁSENIA: účet A bol superuser; '
               'administrátorské účty (staff a superuser) sa zo všetkých vyhľadávaní vylučujú zámerne (audit, '
               '`accounts/search_visibility.py`) a ich profil sa otvorí priamym odkazom, takže majiteľ hlásenie uzavrel ako zámer (13. '
               '11. 2026) a v tomto smere sa nič nemení. NÁJDENÁ INÁ CHYBA (len PostgreSQL, reprodukované na PostgreSQL 16): meno '
               'alebo text s písmenom, ktoré sa nedá rozložiť na základné písmeno a diakritiku (ł, ß, đ, ø, æ, œ), sa nenájde ani pri '
               'presnom zadaní. Stĺpec sa porovnával ako `public.immutable_unaccent(lower(stĺpec))`, kde `unaccent` tieto písmená mení '
               '(ł na l, ß na ss, đ na d, ø na o, æ na ae, œ na oe), no hľadaný text upravoval Python (`_remove_diacritics`, rozklad '
               'Unicode), ktorý ich nechá nezmenené, takže vzor bol napríklad `%łukasz%` a stĺpec obsahoval `lukasz`. SQLite (testy a '
               'vývoj) používa regex a chybu nemá, preto ju doterajšie testy nezachytili. Dotknuté bolo dashboard, global aj verejné '
               'vyhľadávanie (používatelia aj ponuky), lebo všetky idú cez `accent_insensitive_contains_q`. OPRAVA: nový výraz '
               '`UnaccentLowerValue` (`accounts/search_lookups.py`, 73 riadkov) vyrenderuje '
               '`public.immutable_unaccent(lower(<text>))`, teda tú istú funkciu ako ľavá strana, a PostgreSQL vetva '
               '`accent_insensitive_contains_q` (`accounts/views/dashboard_views/utils.py`, 94 riadkov) ho používa namiesto úpravy v '
               'Pythone; pravidlá viditeľnosti (aktívny účet, verejný profil, vylúčenie staff a superuser, symetrické blokovanie) a '
               'SQLite vetva sa nemenia. OVERENIE (agent): plán dotazu pri 40 000 používateľoch (vypnuté sekvenčné čítanie): nový '
               'výraz sa zloží na konštantný vzor `%lukasz%` a plánovač ďalej používa `Bitmap Index Scan` na trigramovom indexe '
               '`acc_user_username_ua_idx`, rovnako ako pri pôvodnom výraze; znaky %, _ a spätná lomka sa v hľadanom texte berú '
               'doslovne (test na oboch databázach); nový test `accounts/test/test_search_accent_normalization.py` (164 riadkov, 8 '
               'testov, dashboard aj global, používatelia aj ponuky) s pôvodným kódom na PostgreSQL padá 5 z 8 a s opravou prechádza 8 '
               'z 8 na PostgreSQL aj SQLite; upravený starý test '
               '`test_search_unaccent.py::test_postgresql_branch_uses_unaccent_lower_contains` (overoval starý tvar s hodnotou '
               'upravenou v Pythone); mutácie (výraz bez `lower`, výraz bez `unaccent`) dali po 6 pádov zo 14 testov; celá backendová '
               'sada: PostgreSQL 16.15 2 532 prešlo a 2 preskočené, SQLite 2 510 prešlo a 24 preskočených, 0 zlyhalo; ruff a black '
               'čisté. Nasadenie aj kontrola CodeRabbitu prebehli bez problému (hlásenie majiteľa, 13. 11. 2026). Dopad na E2E: '
               'žiadny.'),
]
