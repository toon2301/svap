"""
Custom ORM transform pre accent- & case-insensitive vyhľadávanie na PostgreSQL.

`field__unaccent_lower__contains=value` vyrendruje
``immutable_unaccent(lower(<field>)) LIKE '%value%'``. Výraz presne zodpovedá
expression GIN trigram indexu z migrácie ``0086_search_unaccent_indexes`` (rovnaký
``immutable_unaccent(lower(col))``), takže ho plánovač môže využiť.

`immutable_unaccent` je IMMUTABLE wrapper nad ``unaccent('unaccent', ...)`` – built-in
``unaccent`` je len STABLE, a na STABLE funkcii nemožno postaviť index. Transform sa
používa LEN na PostgreSQL (volajúci vetví podľa ``connection.vendor``); na sqlite/dev
sa použije accent-regex fallback, preto ``as_sql`` zámerne nedefinujeme.
"""

from __future__ import annotations

from django.db.models import CharField, TextField, Transform


class UnaccentLower(Transform):
    lookup_name = "unaccent_lower"
    output_field = TextField()

    def as_postgresql(self, compiler, connection):
        lhs_sql, lhs_params = compiler.compile(self.lhs)
        return f"immutable_unaccent(lower({lhs_sql}))", lhs_params


def register_search_lookups() -> None:
    """Idempotentne zaregistruje `unaccent_lower` transform na textové polia."""
    for field_cls in (CharField, TextField):
        try:
            field_cls.register_lookup(UnaccentLower)
        except (AttributeError, LookupError):
            # Duplicitná registrácia (opätovný import) – bezpečne ignoruj.
            # Iné (neočakávané) výnimky nechaj propagovať, nech nezostanú tiché.
            pass
