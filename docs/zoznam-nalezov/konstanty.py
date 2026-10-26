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
