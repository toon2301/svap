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


def otazka_pre_majitela(kopia):
    """Zapíše do kópie vlastnú nezodpovedanú otázku (`rozhodnutie` bez odpovede) a vráti jej `R<n>`: testy tak nezávisia od toho,
    ktoré rozhodnutia majiteľ v živých dátach zatiaľ nezodpovedal."""
    ok(kopia, 'rozhodnutie', '--json', kopia.json('otazka.json', rozhodnutie_vstup()))
    return kopia.udaje()['rozhodnutia'][-1]


def nezodpovedane_rozhodnutie_v_stav_py(kopia):
    """Zmení v kópii JEDNO už zodpovedané rozhodnutie zapísané priamo v `stav.py` (R1 až R12) na nezodpovedané (odstráni mu `odpoved`
    a `datum`) a vráti jeho `R<n>`: test odpovede na takto uložené rozhodnutie nezávisí od aktuálnych odpovedí majiteľa."""
    from zapis_zdroj import Zdroj
    cesta = kopia.priecinok / 'stav.py'
    zdroj = Zdroj(cesta.read_text(encoding='utf-8'), 'stav.py')
    identifikator = next(Zdroj.hodnota_kw(p, 'id') for p in zdroj.priradenie('DECISIONS').elts
                         if Zdroj.kw(p, 'odpoved') is not None and Zdroj.kw(p, 'datum') is not None)
    for kluc in ('odpoved', 'datum'):
        zdroj = zdroj.odstran_kw(zdroj.najdi_dict_volanie('id', identifikator, zoznam='DECISIONS')[2], kluc)
    cesta.write_text(zdroj.text, encoding='utf-8', newline='\n')
    return identifikator
