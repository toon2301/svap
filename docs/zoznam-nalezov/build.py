# -*- coding: utf-8 -*-
"""Generátor zoznamu nálezov.

Použitie z koreňa repozitára:

    python docs/zoznam-nalezov/build.py            # overí dáta a zapíše ZOZNAM.md
    python docs/zoznam-nalezov/build.py --check    # nič nezapíše, len overí, že ZOZNAM.md zodpovedá dátam

Návratový kód je 0 pri úspechu a 1 pri chybe dát alebo keď sa ZOZNAM.md líši od dát (`--check`).
"""
import argparse
import sys
from pathlib import Path

from model import zostav_model
from vystup import zostav_dokument

VYSTUP = Path(__file__).resolve().parent / 'ZOZNAM.md'


def hlavna(argumenty=None):
    """Spustí kontroly a zápis (alebo len porovnanie pri `--check`); vráti návratový kód procesu."""
    parser = argparse.ArgumentParser(description='Generuje docs/zoznam-nalezov/ZOZNAM.md z dát v tomto priečinku.')
    parser.add_argument('--check', action='store_true', help='nezapisuje, len overí, že ZOZNAM.md zodpovedá dátam')
    args = parser.parse_args(argumenty)
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(errors='replace')

    try:
        model = zostav_model()
    except ValueError as chyba:
        print('CHYBA v dátach zoznamu:\n%s' % chyba)
        return 1
    text = zostav_dokument(model)
    p = model.pocty

    if args.check:
        sucasny = VYSTUP.read_text(encoding='utf-8') if VYSTUP.exists() else ''
        if sucasny != text:
            print('ZOZNAM.md nezodpovedá dátam. Spusti: python docs/zoznam-nalezov/build.py')
            return 1
        print('ZOZNAM.md zodpovedá dátam.')
        return 0

    VYSTUP.write_text(text, encoding='utf-8', newline='\n')
    print('Zapísané %s (%d riadkov).' % (VYSTUP.name, text.count('\n')))
    print('Nálezy spolu %d: HNEĎ %d, PRED %d, PO %d; hotové %d (+%d čaká na zlúčenie).'
          % (p.spolu, p.nalezy['H'], p.nalezy['P'], p.nalezy['A'], p.hotove, p.caka_na_zlucenie))
    return 0


if __name__ == '__main__':
    sys.exit(hlavna())
