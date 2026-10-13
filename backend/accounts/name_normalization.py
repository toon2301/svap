from __future__ import annotations

from typing import Any, TypedDict


class NormalizedProfileNameFields(TypedDict):
    """Trojica mien profilu, ktorá sa ukladá do `first_name`, `last_name` a `company_name`."""

    first_name: str
    last_name: str
    company_name: str


def clean_name_value(value: Any) -> str:
    """Vráti meno ako orezaný reťazec; `None` dá prázdny reťazec."""
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    return value.strip()


def build_individual_display_name(first_name: Any, last_name: Any) -> str:
    """Zloží zobrazené meno osoby z mena a priezviska oddelených jednou medzerou."""
    first = clean_name_value(first_name)
    last = clean_name_value(last_name)
    return " ".join(part for part in (first, last) if part)


def build_company_display_name(company_name: Any, username: Any = "") -> str:
    """Vráti názov firmy, a keď chýba, používateľské meno."""
    company = clean_name_value(company_name)
    return company or clean_name_value(username)


def get_canonical_display_name(
    *,
    user_type: str,
    first_name: Any,
    last_name: Any,
    company_name: Any,
    username: Any = "",
) -> str:
    """Vráti meno, ktoré sa o používateľovi zobrazuje a z ktorého vzniká odkaz na profil."""
    if user_type == "company":
        return build_company_display_name(company_name, username)
    return build_individual_display_name(first_name, last_name) or clean_name_value(
        username
    )


def normalize_profile_name_fields(
    *,
    user_type: str,
    first_name: Any,
    last_name: Any,
    company_name: Any,
) -> NormalizedProfileNameFields:
    """Zjednotí polia mena podľa typu účtu pri registrácii a pri úprave profilu.

    Firma: názov firmy ostane (alebo sa odvodí z mena osoby), priezvisko sa zmaže
    a `first_name` ostane, resp. prevezme názov firmy, ak je prázdny.
    Osoba: názov firmy sa zmaže, meno a priezvisko ostanú.

    Pri samotnej zmene typu účtu sa nepoužíva: ten prenáša zobrazené meno cez
    `carry_display_name_on_type_switch`.
    """
    first = clean_name_value(first_name)
    last = clean_name_value(last_name)
    company = clean_name_value(company_name)

    if user_type == "company":
        canonical_company_name = company or build_individual_display_name(first, last)
        return {
            "first_name": first or canonical_company_name,
            "last_name": "",
            "company_name": canonical_company_name,
        }

    return {
        "first_name": first,
        "last_name": last,
        "company_name": "",
    }


def carry_display_name_on_type_switch(
    *,
    to_type: str,
    first_name: Any,
    last_name: Any,
    company_name: Any,
) -> NormalizedProfileNameFields:
    """Prenesie zobrazené meno pri zmene typu účtu tak, aby sa meno (a odkaz na profil) nezmenilo.

    Volá sa len vtedy, keď požiadavka mení iba `user_type` a nenesie žiadne meno:
    zobrazené meno patrí účtu a mení ho len používateľ, keď ho sám upraví a uloží.
    Vstupom sú uložené hodnoty pôvodného typu, výsledkom polia pre nový typ.

    - Na firmu (`to_type == "company"`): názov firmy je zobrazené meno osoby.
      Priezvisko sa u firmy ukladá prázdne (existujúce pravidlo), jeho text ostáva
      v názve firmy.
    - Na osobu: zobrazeným menom je názov firmy. Ak sa zhoduje s menom a priezviskom,
      ostanú; ak začína menom a zloženie mena so zvyškom dá presne ten istý text,
      priezvisko sa dopočíta zvyškom (obnoví sa rozdelenie po ceste osoba -> firma ->
      osoba); inak sa celý názov uloží do mena, aby sa zobrazený text nezmenil
      ani o medzeru. Meno sa neskracuje ani nekontroluje – ide o údaj, ktorý
      používateľ už zadal.
    """
    first = clean_name_value(first_name)
    last = clean_name_value(last_name)
    company = clean_name_value(company_name)
    personal_name = build_individual_display_name(first, last)

    if to_type == "company":
        return {
            "first_name": first or personal_name,
            "last_name": "",
            "company_name": personal_name,
        }

    if not company or company == personal_name:
        return {"first_name": first, "last_name": last, "company_name": ""}
    if first and company.startswith(f"{first} "):
        rest = company[len(first) + 1 :]
        # Rozdelí sa len vtedy, keď zloženie mena a priezviska dá presne ten istý text
        # (napr. nie pri dvoch medzerách za menom) – zobrazené meno sa nesmie zmeniť.
        if build_individual_display_name(first, rest) == company:
            return {"first_name": first, "last_name": rest, "company_name": ""}
    return {"first_name": company, "last_name": "", "company_name": ""}
