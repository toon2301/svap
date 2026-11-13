"""
Custom ORM transform pre accent- & case-insensitive vyhľadávanie na PostgreSQL.

`field__unaccent_lower__contains=value` vyrendruje
``public.immutable_unaccent(lower(<field>)) LIKE '%value%'``. Výraz presne zodpovedá
expression GIN trigram indexu z migrácie ``0086_search_unaccent_indexes`` (rovnaký
``public.immutable_unaccent(lower(col))``), takže ho plánovač môže využiť.

Hľadaný text sa spracuje tou istou databázovou funkciou (`UnaccentLowerValue`), nie v Pythone:
``unaccent`` mení aj písmená, ktoré sa nedajú rozložiť na základné písmeno a diakritiku
(napr. ``ł`` na ``l``, ``ß`` na ``ss``, ``đ`` na ``d``, ``ø`` na ``o``, ``æ`` na ``ae``, ``œ`` na ``oe``),
a rozklad Unicode v Pythone ich nechá nezmenené, takže stĺpec a hľadaný text by sa nikdy nezhodli.

`immutable_unaccent` je IMMUTABLE wrapper nad ``unaccent('unaccent', ...)`` – built-in
``unaccent`` je len STABLE, a na STABLE funkcii nemožno postaviť index. Transform sa
používa LEN na PostgreSQL (volajúci vetví podľa ``connection.vendor``); na sqlite/dev
sa použije accent-regex fallback, preto ``as_sql`` zámerne nedefinujeme.
"""

from __future__ import annotations

from django.db.models import CharField, Func, TextField, Transform
from django.db.models.functions import Lower


class UnaccentLower(Transform):
    lookup_name = "unaccent_lower"
    output_field = TextField()

    def as_postgresql(self, compiler, connection):
        lhs_sql, lhs_params = compiler.compile(self.lhs)
        # Schéma-kvalifikované `public.immutable_unaccent`, aby runtime SQL bolo
        # textovo aj rezolučne zhodné s expression indexom z 0086 a nezáviselo od
        # search_path app spojenia (rovnaký dôvod ako v migrácii).
        return f"public.immutable_unaccent(lower({lhs_sql}))", lhs_params


class UnaccentLowerValue(Func):
    """
    Hľadaný text (výraz alebo hodnota) bez diakritiky a malými písmenami, tou istou funkciou ako stĺpec.

    Vyrendruje ``public.immutable_unaccent(lower(<výraz>))``, rovnako ako `UnaccentLower` pri stĺpci,
    takže obe strany porovnania prechádzajú identickou úpravou a nerozídu sa ani pri písmenách, ktoré
    `unaccent` mení inak než rozklad Unicode v Pythone. Používa sa ako pravá strana
    ``field__unaccent_lower__contains``; `contains` ošetrí znaky ``%``, ``_`` a ``\\`` v hľadanom texte
    priamo v SQL, takže sa berú doslovne. Ako `UnaccentLower` je to len pre PostgreSQL.
    """

    function = "public.immutable_unaccent"
    template = "%(function)s(lower(%(expressions)s))"
    arity = 1
    output_field = TextField()


def register_search_lookups() -> None:
    """Idempotentne zaregistruje textové transformy na CharField/TextField.

    ``unaccent_lower`` je PG-only (accent-insensitive ILIKE nad expression
    indexom). ``lower`` je Djangov built-in ``Lower`` – funguje na každom
    backende a umožňuje case-insensitive ``__in`` porovnanie, ktoré samotné
    Django lookupy neponúkajú (``__iexact`` zoznam neprijíma).
    """
    for field_cls in (CharField, TextField):
        try:
            field_cls.register_lookup(UnaccentLower)
        except (AttributeError, LookupError):
            pass
        try:
            field_cls.register_lookup(Lower)
        except (AttributeError, LookupError):
            # Duplicitná registrácia (opätovný import) – bezpečne ignoruj.
            # Iné (neočakávané) výnimky nechaj propagovať, nech nezostanú tiché.
            pass
