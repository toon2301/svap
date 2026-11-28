# -*- coding: utf-8 -*-
"""Príkaz `zapis.py stav`: prehľad na začiatok práce (len čítanie).

Odpovedá na otázky, ktoré si agent kladie pri štarte: čo čaká na zlúčenie alebo na ručný test (to sa vybavuje ako prvé), čo čaká
na rozhodnutie majiteľa, ktorá položka fronty je prvá voľná a aké čísla (nález, rozhodnutie, dávka) sú ďalšie voľné. Skript nevie
nič o GitHube: otvorené PR a vetvy treba skontrolovať zvlášť (postup je v `POSTUP.md`).
"""
import re

from fronta_pravidla import dovod_blokovania, prva_volna
from konstanty import RUCNY_NEUZAVRETE


def _dalsia_davka(ctx, priecinok):
    """Ďalšie číslo dávky `K<n>`: najvyššie z `karty/K*.md`, vetiev hotových položiek a dávok vo fronte, plus jedna."""
    cisla = [int(m.group(1)) for p in (priecinok / 'karty').glob('K*.md') if (m := re.match(r'K(\d+)', p.name))]
    cisla += [int(m.group(1)) for d in ctx.hotove if (m := re.fullmatch(r'K(\d+)', str(d.get('vetva', ''))))]
    cisla += [int(m.group(1)) for z in ctx.fronta if (m := re.match(r'K(\d+)', str(z.get('davka', ''))))]
    return 'K%d' % (max(cisla, default=0) + 1)


def zostav_prehlad(ctx, priecinok, stav_modul):
    """Zostaví text prehľadu z kontextu (`zapis_operacie.nacitaj_kontext`)."""
    m, p = ctx.m, ctx.m.pocty
    riadky = ['Hlavička zoznamu: %s; stav kódu: %s' % (stav_modul.STAV['datum'], stav_modul.STAV['kod'][:110].rstrip() + ('…' if len(stav_modul.STAV['kod']) > 110 else '')),
              'Nálezy: spolu %d; otvorené HNEĎ %d, PRED %d, PO %d; hotové %d.' % (p.spolu, p.nalezy['H'], p.nalezy['P'], p.nalezy['A'],
                                                                                p.hotove + p.caka_na_zlucenie + p.caka_na_rucny_test),
              'Ďalšie voľné: nález č. %d, rozhodnutie R%d, dávka %s.' % (ctx.posledne_cislo + 1, ctx.n_rozhodnuti + 1, _dalsia_davka(ctx, priecinok)),
              '']
    caka_zlucenie = [d for d in ctx.hotove if not d.get('zlucene')]
    caka_test = [d for d in ctx.hotove if d.get('zlucene') and d.get('rucny_test') in RUCNY_NEUZAVRETE]
    riadky.append('NAJPRV VYBAV (štart práce):')
    if caka_zlucenie:
        riadky.append('  - čaká na zlúčenie: ' + '; '.join('č. %d (vetva %s, PR %s)' % (d['n'], d.get('vetva'), d.get('pr') or '?') for d in caka_zlucenie))
    if caka_test:
        riadky.append('  - čaká na ručný test alebo opravu po ňom: ' + '; '.join(
            'č. %d (vetva %s, %s)' % (d['n'], d.get('vetva'), d['rucny_test']) for d in caka_test))
    if not (caka_zlucenie or caka_test):
        riadky.append('  - nič nečaká na zlúčenie ani na ručný test.')
    cakajuce = [d for d in stav_modul.DECISIONS if not d.get('odpoved')]
    riadky.append('  - rozhodnutia bez odpovede majiteľa: ' + ('; '.join('%s (%s)' % (d['id'], d['tema'][:50]) for d in cakajuce) if cakajuce else 'žiadne'))
    riadky.append('')
    riadky.append('FRONTA (%d položiek):' % len(ctx.fronta))
    volna = prva_volna(ctx.fronta, ctx.otvorene_id)
    if volna:
        riadky.append('  - prvá voľná: č. %s (dávka %s): %s' % (volna['n'], volna.get('davka', '?'), volna['co'][:100]))
    elif ctx.fronta:
        riadky.append('  - žiadna položka nie je voľná, všetky čakajú.')
    for i, z in enumerate(ctx.fronta, 1):
        dovod = dovod_blokovania(z, ctx.otvorene_id)
        if dovod:
            riadky.append('  - %d. č. %s %s' % (i, z['n'], dovod))
    riadky.append('')
    riadky.append('Skontroluj ešte na GitHube: otvorené PR a vetvy (nezačínaj, kým predošlá vetva nie je zlúčená do main) a či sa `main` zhoduje s hlavičkou.')
    return '\n'.join(riadky)
