# -*- coding: utf-8 -*-
"""Spoločné konštanty zoznamu nálezov: skupiny (HNEĎ / PRED / PO), dopad a zložitosť.

Dátové moduly (`polozky_povodne.py`, `polozky_nove.py`, `register.py`) používajú tieto skratky, aby sa pri
udržiavaní zoznamu písali krátke a jednotné hodnoty.
"""

# Skupina: kedy sa má položka riešiť.
H = 'H'  # HNEĎ
P = 'P'  # PRED NASADENÍM
A = 'A'  # PO NASADENÍ

# Dopad položky.
V = 'V'  # vysoký (bezpečnosť, dáta, základný tok)
S_ = 'S'  # stredný (viditeľná chyba, iPhone, jazyk)
N = 'N'  # nízky

# Zložitosť (odhad): S do pol dňa vrátane testov, M 1–2 dni, L viac dní alebo viac krokov.
ES = 'S'
EM = 'M'
EL = 'L'

NAZOV_SKUPINY = {H: 'HNEĎ', P: 'PRED NASADENÍM', A: 'PO NASADENÍ'}
NAZOV_DOPADU = {V: 'vysoký', S_: 'stredný', N: 'nízky'}

# Ručný test dávky (pole `rucny_test` pri hotových položkách `DONE_SINCE`): dávka sa neuzatvára pred úspešným ručným testom,
# ak je požadovaný. Bez poľa ručný test nie je požadovaný (alebo sa nesledoval).
RUCNY_CAKA = 'caka'
RUCNY_PRESIEL = 'prešiel'
RUCNY_NEPRESIEL = 'neprešiel'
RUCNY_STAVY = (RUCNY_CAKA, RUCNY_PRESIEL, RUCNY_NEPRESIEL)
RUCNY_NEUZAVRETE = (RUCNY_CAKA, RUCNY_NEPRESIEL)

# Na koho môže záznam fronty čakať (pole `caka` = (kto, čo presne)) a tvar na zobrazenie.
KTO_CAKA = {'majiteľ': 'majiteľa', 'Codex': 'Codexa'}
