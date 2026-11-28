# -*- coding: utf-8 -*-
"""Záznamy zapisované skriptom `zapis.py` do číslovaných súborov (`zaznamy_nove_01.py`, `zaznamy_hotove_01.py`, …).

Číslované súbory sa nahrávajú automaticky v poradí čísel, takže skript nemusí nič dopĺňať do ostatných modulov: keď sa súbor
zaplní, založí ďalší (`…_02.py`). Každý súbor drží zoznamy s rovnakými názvami, ako sú nižšie (napr. `NEW_ITEMS_ZAZNAMY`).
Ostatné moduly ich pripájajú na koniec svojich zoznamov: `polozky_nove.py`, `hotove.py`, `stav.py` a `zatvorene_dalsie.py`.
"""
import importlib
from pathlib import Path

PRIECINOK = Path(__file__).resolve().parent

# Predpona súboru -> názvy zoznamov, ktoré súbor drží.
SUBORY = {
    'zaznamy_nove': ('NEW_ITEMS_ZAZNAMY',),
    'zaznamy_hotove': ('DONE_SINCE_ZAZNAMY', 'DONE_PR_TABLE_CASTOCNE_ZAZNAMY'),
    'zaznamy_rozhodnutia': ('DECISIONS_ZAZNAMY',),
    'zaznamy_zatvorene': ('CLOSED_SINCE_ZAZNAMY',),
}


def subory(predpona, priecinok=PRIECINOK):
    """Číslované súbory danej predpony v poradí čísel (`zaznamy_nove_01.py`, `zaznamy_nove_02.py`, …)."""
    return sorted(Path(priecinok).glob('%s_[0-9][0-9].py' % predpona))


def _nacitaj(predpona, nazov):
    """Spojí zoznam `nazov` zo všetkých súborov danej predpony."""
    vysledok = []
    for cesta in subory(predpona):
        vysledok.extend(getattr(importlib.import_module(cesta.stem), nazov))
    return vysledok


NEW_ITEMS_ZAZNAMY = _nacitaj('zaznamy_nove', 'NEW_ITEMS_ZAZNAMY')
DONE_SINCE_ZAZNAMY = _nacitaj('zaznamy_hotove', 'DONE_SINCE_ZAZNAMY')
DONE_PR_TABLE_CASTOCNE_ZAZNAMY = _nacitaj('zaznamy_hotove', 'DONE_PR_TABLE_CASTOCNE_ZAZNAMY')
DECISIONS_ZAZNAMY = _nacitaj('zaznamy_rozhodnutia', 'DECISIONS_ZAZNAMY')
CLOSED_SINCE_ZAZNAMY = _nacitaj('zaznamy_zatvorene', 'CLOSED_SINCE_ZAZNAMY')
