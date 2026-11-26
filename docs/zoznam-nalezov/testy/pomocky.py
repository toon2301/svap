# -*- coding: utf-8 -*-
"""Pomôcky testov príkazov skriptu `zapis.py` (`test_prikazy.py`, `test_prikazy_fronta.py`, `test_postupnost.py`): vstupy a výber nálezov."""
import pytest

from conftest import suhrn

NEBEZPECNY_TEXT = "Apostrof ' a obrátená lomka \\ a zvislítko | a úvodzovky \"x\" a `kód` a ľščťžýáíé 🙂 {x} %s"


def build(k):
    kod, vystup = k.spusti('build.py')
    assert kod == 0, vystup
    return suhrn(vystup)


def ok(k, *argumenty, **kw):
    kod, vystup = k.zapis(*argumenty, **kw)
    assert kod == 0, vystup
    return vystup


def novy_vstup(u, skupina='P', **zmeny):
    vstup = {'skupina': skupina, 'dopad': 'S', 'zlozitost': 'M', 'balik': u['baliky'][skupina][0],
             'kratko': 'krátky názov', 'co': 'Čo sa deje a kde.', 'poznamka': 'JASNÉ poznámka.', 'zdroj': 'ručný test majiteľa'}
    vstup.update(zmeny)
    return vstup


def hotove_vstup(n, **zmeny):
    vstup = {'n': n, 'vetva': 'K64', 'pr': '#345', 'zlucene': False, 'rucny_test': 'caka',
             'text': 'HOTOVÉ (K64, PR #345, čaká na zlúčenie). Oprava a overenie.'}
    vstup.update(zmeny)
    return vstup


def volny_nalez(u):
    """Otvorený nález, ktorý nie je vo fronte ani vo vlnách poradia."""
    for n in u['otvorene']:
        if str(n) not in u['fronta'] and str(n) not in u['vo_vlnach']:
            return n
    pytest.skip('v dátach nie je otvorený nález mimo fronty a vĺn')


def nalez_vo_fronte_a_vlne(u):
    for n in u['otvorene']:
        if str(n) in u['fronta'] and str(n) in u['vo_vlnach']:
            return n
    pytest.skip('v dátach nie je otvorený nález vo fronte aj vo vlne poradia')


def nalez_mimo_fronty(u, kolko=1):
    najdene = [n for n in u['otvorene'] if str(n) not in u['fronta']][:kolko]
    assert len(najdene) == kolko
    return najdene


def rozhodnutie_vstup(**zmeny):
    vstup = {'tema': 'Skúšobná téma', 'otazka': 'Čo presne rozhodnúť?', 'odporucanie': 'Odporúčam áno.', 'kedy': 'pred ďalšou dávkou'}
    vstup.update(zmeny)
    return vstup


def pridaj_vstup(n, **zmeny):
    vstup = {'n': str(n), 'davka': 'K65', 'co': 'Skúšobná práca.', 'preco': 'JASNÉ (skúška).'}
    vstup.update(zmeny)
    return vstup
