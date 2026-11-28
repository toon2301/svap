# -*- coding: utf-8 -*-
"""Pomocný skript na zápis do zoznamu nálezov: `python docs/zoznam-nalezov/zapis.py <príkaz> …`.

Nahrádza ručné upravovanie desiatich súborov: skript zmení presne tie miesta, ktoré treba, hneď overí celý model (`build.py`),
prepíše `ZOZNAM.md` a pri akejkoľvek chybe všetko vráti. Príkazy: `stav` (prehľad pri štarte), `novy` (nový nález s ďalším číslom),
`hotove`, `zatvor`, `zlucene`, `rucny-test`, `fronta` (pridaj, odstran, presun, caka, volne, po), `zmena` (hlavička a denník) a
`rozhodnutie`. Dlhé texty sa dávajú v JSON súbore (`--json subor.json`, alebo `-` zo štandardného vstupu); príklady sú v
`sablony/zapis/`. Pred ostrým zápisom sa dá použiť `--na-sucho` (pracuje v dočasnej kópii). Postup je v `POSTUP.md`.

Návratový kód: 0 v poriadku, 1 model po zápise neprešiel kontrolou (zmeny sú vrátené), 2 neplatný vstup alebo stav, 3 neočakávaná
chyba alebo zmeny sa nepodarilo vrátiť (výpis povie, ktoré súbory a kde je záloha).
"""
import argparse
import atexit
import json
import shutil
import sys
import tempfile
import traceback
from pathlib import Path

PRIECINOK = Path(__file__).resolve().parent
sys.path.insert(0, str(PRIECINOK))
# Staré `.pyc` v `__pycache__` sa ignorujú: zdroj zmenený v tej istej sekunde a s rovnakou veľkosťou by sa inak načítal zo starého `.pyc`.
try:
    sys.pycache_prefix = tempfile.mkdtemp(prefix='zapis-pyc-')
    atexit.register(shutil.rmtree, sys.pycache_prefix, ignore_errors=True)
except OSError:  # bez dočasného priečinka sa aspoň nezapisujú nové `.pyc`
    sys.dont_write_bytecode = True

import zapis_data  # noqa: E402
import zapis_operacie as op  # noqa: E402
import zapis_stav  # noqa: E402
import zapis_transakcia  # noqa: E402
from konstanty import RUCNY_NEPRESIEL, RUCNY_PRESIEL  # noqa: E402
from zapis_format import ChybaVstupu  # noqa: E402
from zapis_zdroj import ChybaZdroja  # noqa: E402


def _bez_poznamok(hodnota):
    """Odstráni z JSON objektov (aj vnorených) polia s názvom začínajúcim `_` (poznámky, nie dáta) a polia s hodnotou `null`
    (rovnako ako vynechané pole: voliteľné ostane nezadané, povinné skončí chybou „chýbajú polia“)."""
    if isinstance(hodnota, dict):
        return {k: _bez_poznamok(v) for k, v in hodnota.items() if not str(k).startswith('_') and v is not None}
    if isinstance(hodnota, list):
        return [_bez_poznamok(v) for v in hodnota]
    return hodnota


def _nacitaj_json(cesta):
    """Načíta JSON objekt zo súboru alebo (pri `-`) zo štandardného vstupu."""
    try:
        text = sys.stdin.read() if cesta == '-' else Path(cesta).read_text(encoding='utf-8')
        return _bez_poznamok(json.loads(text))
    except (OSError, ValueError) as chyba:
        raise ChybaVstupu('vstupný JSON sa nepodarilo načítať: %s' % chyba) from chyba


def _parser():
    """Zostaví parser príkazového riadka: prepínač `--na-sucho` a príkazy `stav`, `novy`, `hotove`, `zatvor`, `zmena`,
    `rozhodnutie`, `zlucene`, `rucny-test` a `fronta` (s podpríkazmi pridaj, odstran, presun, caka, volne, po)."""
    p = argparse.ArgumentParser(prog='zapis.py', description='Zápis do zoznamu nálezov (pozri POSTUP.md).')
    p.add_argument('--na-sucho', action='store_true', help='nič nezapíše na disk: vyskúša zmenu v dočasnej kópii a vypíše výsledok')
    pod = p.add_subparsers(dest='prikaz', required=True)
    pod.add_parser('stav', help='prehľad pri štarte práce (len čítanie)')
    for meno, pomoc in (('novy', 'nový nález s ďalším voľným číslom'), ('hotove', 'presun otvoreného nálezu do hotových'),
                        ('zatvor', 'zatvorenie nálezu rozhodnutím majiteľa'), ('zmena', 'hlavička a záznam v denníku zmien'),
                        ('rozhodnutie', 'nové rozhodnutie R<n>')):
        a = pod.add_parser(meno, help=pomoc)
        a.add_argument('--json', required=True, metavar='SUBOR', help='vstup v JSON (alebo - zo štandardného vstupu)')
    a = pod.add_parser('zlucene', help='hotové položky vetvy sú zlúčené')
    a.add_argument('--vetva', required=True)
    a.add_argument('--pr', help='číslo PR, napr. #345')
    a.add_argument('--merge', help='skrátený hash zlučovacieho commitu')
    a.add_argument('--cas', help='dátum a čas zlúčenia, napr. "26. 11. 2026 o 12:07 UTC"')
    a = pod.add_parser('rucny-test', help='výsledok ručného testu majiteľa k vetve')
    a.add_argument('--vetva', required=True)
    a.add_argument('--vysledok', required=True, choices=[RUCNY_PRESIEL, RUCNY_NEPRESIEL])
    a.add_argument('--datum', required=True)
    a.add_argument('--poznamka')
    f = pod.add_parser('fronta', help='úpravy poradia prác').add_subparsers(dest='podprikaz', required=True)
    a = f.add_parser('pridaj')
    a.add_argument('--json', required=True, metavar='SUBOR')
    a = f.add_parser('odstran')
    a.add_argument('n')
    a = f.add_parser('presun')
    a.add_argument('n')
    a.add_argument('--na', required=True, type=int, help='nové poradie od 1')
    a = f.add_parser('caka')
    a.add_argument('n')
    a.add_argument('--kto', required=True, help='majiteľ alebo Codex')
    a.add_argument('--text', required=True, help='čo presne sa čaká')
    a = f.add_parser('volne')
    a.add_argument('n')
    a = f.add_parser('po')
    a.add_argument('n')
    a.add_argument('--po', default='', help='ID oddelené čiarkou; prázdne zruší závislosti')
    return p


def _vykonaj_prikaz(args, ds, ctx):
    """Zavolá operáciu podľa príkazu a vráti jej správy."""
    if args.prikaz == 'novy':
        return op.novy(ds, ctx, _nacitaj_json(args.json))
    if args.prikaz == 'hotove':
        return op.hotove(ds, ctx, _nacitaj_json(args.json))
    if args.prikaz == 'zatvor':
        return op.zatvor(ds, ctx, _nacitaj_json(args.json))
    if args.prikaz == 'zmena':
        return op.zmena(ds, ctx, _nacitaj_json(args.json))
    if args.prikaz == 'rozhodnutie':
        return op.rozhodnutie(ds, ctx, _nacitaj_json(args.json))
    if args.prikaz == 'zlucene':
        return op.zlucene(ds, ctx, args.vetva, args.pr, args.merge, args.cas)
    if args.prikaz == 'rucny-test':
        return op.rucny_test(ds, ctx, args.vetva, args.vysledok, args.datum, args.poznamka)
    if args.podprikaz == 'pridaj':
        return op.fronta_pridaj(ds, ctx, _nacitaj_json(args.json))
    if args.podprikaz == 'odstran':
        return op.fronta_odstran(ds, ctx, args.n)
    if args.podprikaz == 'presun':
        return op.fronta_presun(ds, ctx, args.n, args.na)
    if args.podprikaz == 'caka':
        return op.fronta_caka(ds, ctx, args.n, args.kto, args.text)
    if args.podprikaz == 'volne':
        return op.fronta_volne(ds, ctx, args.n)
    return op.fronta_po(ds, ctx, args.n, [i.strip() for i in args.po.split(',') if i.strip()])


def hlavna(argumenty=None):
    """Spracuje príkaz a vráti návratový kód procesu."""
    for tok in (sys.stdin, sys.stdout, sys.stderr):  # slovenské znaky aj v konzole Windowsu a pri vstupe `--json -`
        if hasattr(tok, 'reconfigure'):
            tok.reconfigure(encoding='utf-8', errors='replace')
    args = _parser().parse_args(argumenty)
    try:
        ctx = op.nacitaj_kontext()
    except ValueError as chyba:
        print('Dáta zoznamu sú už teraz neplatné, oprav ich (python docs/zoznam-nalezov/build.py):\n%s' % chyba)
        return 2
    except Exception as chyba:  # noqa: BLE001 - chybný dátový súbor (syntax, názov, import): agent dostane vysvetlenie, nie výpis
        print('Dáta zoznamu sa nepodarilo načítať (%s: %s). Oprav ich (python docs/zoznam-nalezov/build.py).' % (type(chyba).__name__, chyba))
        return 2
    if args.prikaz == 'stav':
        import stav
        print(zapis_stav.zostav_prehlad(ctx, PRIECINOK, stav))
        return 0
    koren = None
    priecinok = PRIECINOK
    try:
        if args.na_sucho:
            koren, priecinok = zapis_transakcia.kopia_na_sucho(PRIECINOK)
        ds = zapis_data.Dataset(priecinok)
        spravy = _vykonaj_prikaz(args, ds, ctx)
        if not ds.zmeny():  # napr. poradie alebo závislosti, ktoré už takto zapísané sú
            print('Bez zmeny: zadaný stav je už zapísaný, nič sa nezapísalo.')
            return 0
        vystup = zapis_transakcia.vykonaj(ds)
    except (ChybaVstupu, ChybaZdroja) as chyba:
        print('CHYBA vstupu: %s' % chyba)
        return 2
    except zapis_transakcia.ChybaObnovy as chyba:
        print(chyba)
        return 3
    except zapis_transakcia.ChybaKontroly as chyba:
        print('Zmena nie je platná, nič sa nezapísalo:\n%s' % chyba)
        return 1
    except Exception:  # noqa: BLE001 - posledná poistka, aby agent dostal výpis
        print('NEOČAKÁVANÁ CHYBA (nič sa nezapísalo):\n%s' % traceback.format_exc())
        return 3
    finally:
        if koren is not None:
            shutil.rmtree(koren, ignore_errors=True)
    for sprava in spravy:
        print(sprava)
    if getattr(ctx, 'pridelene', None):
        print('=> Pridelené číslo nálezu: %d' % ctx.pridelene)
    if getattr(ctx, 'pridelene_rozhodnutie', None):
        print('=> Pridelené rozhodnutie: %s' % ctx.pridelene_rozhodnutie)
    print(('NA SUCHO (nič sa nezapísalo): ' if args.na_sucho else '') + 'Zmenené súbory: ' + ', '.join(sorted(ds.zmeny())) + '.')
    print(vystup.splitlines()[-1] if vystup else '')
    return 0


if __name__ == '__main__':
    sys.exit(hlavna())
