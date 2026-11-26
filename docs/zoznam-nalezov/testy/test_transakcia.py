# -*- coding: utf-8 -*-
"""Testy zápisu „všetko alebo nič“: kontrola modelu po zápise, vrátenie zmien pri chybe a suchý beh v dočasnej kópii."""
import os
import re
import shutil
import subprocess
import sys

import pytest

import zapis_data
import zapis_operacie as op
import zapis_transakcia as tr
from zapis_zdroj import Zdroj

PRAZDNE_HOTOVE = '# -*- coding: utf-8 -*-\nDONE_SINCE_ZAZNAMY = [\n]\nDONE_PR_TABLE_CASTOCNE_ZAZNAMY = [\n]\n'


def _pokaz_frontu(ds):
    """Zmena, ktorú model odmietne: `preco` prvého záznamu fronty nezačína slovom JASNÉ ani NEJASNÉ."""
    z = ds.zdroj('fronta.py')
    pokazene = re.sub(r"preco='(NE)?JASNÉ", "preco='ZLE", z.text, count=1)
    assert pokazene != z.text
    ds.nastav('fronta.py', Zdroj(pokazene, 'fronta.py'))


def test_zmena_ktoru_model_odmietne_sa_vrati_aj_s_novym_suborom(kopia):
    ds = zapis_data.Dataset(kopia.priecinok)
    _pokaz_frontu(ds)
    ds.vytvor('zaznamy_hotove_02.py', PRAZDNE_HOTOVE)
    pred = kopia.snimka()
    with pytest.raises(tr.ChybaKontroly, match='JASNÉ'):
        tr.vykonaj(ds)
    assert kopia.snimka() == pred
    assert not (kopia.priecinok / 'zaznamy_hotove_02.py').exists()
    assert kopia.build_check()[0] == 0


def test_zoznam_nalezov_sa_obnovi_aj_ked_ho_generator_stihol_prepisat(kopia, monkeypatch):
    ds = zapis_data.Dataset(kopia.priecinok)
    ds.nastav('fronta.py', Zdroj(ds.zdroj('fronta.py').text + '\n# zmena\n', 'fronta.py'))
    pred = kopia.text('ZOZNAM.md')

    def pokazeny_build(priecinok, argumenty=()):
        (priecinok / 'ZOZNAM.md').write_text('POŠKODENÝ VÝSTUP', encoding='utf-8')
        return 1, 'generátor zlyhal'

    monkeypatch.setattr(tr, 'spusti_build', pokazeny_build)
    with pytest.raises(tr.ChybaKontroly, match='generátor zlyhal'):
        tr.vykonaj(ds)
    assert kopia.text('ZOZNAM.md') == pred
    assert '# zmena' not in kopia.text('fronta.py')


def test_prerusenie_pocas_zapisu_vrati_aj_uz_zapisane_subory(kopia, monkeypatch):
    ds = zapis_data.Dataset(kopia.priecinok)
    for nazov in ('fronta.py', 'konstanty.py', 'stav.py'):
        ds.nastav(nazov, Zdroj(ds.zdroj(nazov).text + '\n# zmena\n', nazov))
    pred = kopia.snimka()
    povodny_zapis, volania = tr._zapis, []

    def prerusovany(cesta, text):
        volania.append(cesta)
        if len(volania) == 2:
            raise KeyboardInterrupt
        povodny_zapis(cesta, text)

    monkeypatch.setattr(tr, '_zapis', prerusovany)
    with pytest.raises(KeyboardInterrupt):
        tr.vykonaj(ds)
    monkeypatch.setattr(tr, '_zapis', povodny_zapis)
    assert kopia.snimka() == pred


def test_operacia_ktora_nic_nezmenila_je_chyba_kontroly(kopia):
    with pytest.raises(tr.ChybaKontroly, match='nič nezmenila'):
        tr.vykonaj(zapis_data.Dataset(kopia.priecinok))


def test_uspesny_zapis_zapise_zmenene_subory_a_znovu_vygeneruje_zoznam(kopia):
    ds = zapis_data.Dataset(kopia.priecinok)
    op.zmena(ds, op.nacitaj_kontext(), {'datum': '27. 11. 2026', 'text': 'Skúška zápisu.'})
    pred = kopia.snimka()
    vystup = tr.vykonaj(ds)
    po = kopia.snimka()
    assert set(k for k in po if po[k] != pred.get(k)) == {'stav.py', 'ZOZNAM.md'}
    assert 'Nálezy spolu' in vystup
    assert kopia.build_check()[0] == 0


def test_kontrola_modelu_nevidi_stare_pyc_subory_ani_ked_zdroj_ma_rovnaky_cas_aj_velkost(kopia):
    env = {k: v for k, v in os.environ.items() if k != 'PYTHONDONTWRITEBYTECODE'}
    beh = subprocess.run([sys.executable, 'build.py'], cwd=str(kopia.priecinok), env=env, capture_output=True, text=True)
    assert beh.returncode == 0 and (kopia.priecinok / '__pycache__').is_dir()
    stav_py = kopia.priecinok / 'stav.py'
    povodny = stav_py.stat()
    text = stav_py.read_text(encoding='utf-8')
    nova = text.replace("datum='26. 11. 2026'", "datum='27. 11. 2026'", 1)
    assert nova != text and len(nova.encode()) == len(text.encode())
    stav_py.write_text(nova, encoding='utf-8')
    os.utime(stav_py, ns=(povodny.st_atime_ns, povodny.st_mtime_ns))  # rovnaký čas úpravy a rovnaká veľkosť ako v starom `.pyc`
    kod, vystup = tr.spusti_build(kopia.priecinok)
    assert kod == 0, vystup
    assert '27. 11. 2026' in kopia.text('ZOZNAM.md')


def test_skript_cita_aktualne_data_aj_ked_stare_pyc_vyzera_platne(kopia):
    env = {k: v for k, v in os.environ.items() if k != 'PYTHONDONTWRITEBYTECODE'}
    beh = subprocess.run([sys.executable, 'build.py'], cwd=str(kopia.priecinok), env=env, capture_output=True, text=True)
    assert beh.returncode == 0 and (kopia.priecinok / '__pycache__').is_dir()
    stav_py = kopia.priecinok / 'stav.py'
    povodny = stav_py.stat()
    text = stav_py.read_text(encoding='utf-8')
    stav_py.write_text(text.replace("datum='26. 11. 2026'", "datum='27. 11. 2026'", 1), encoding='utf-8')
    os.utime(stav_py, ns=(povodny.st_atime_ns, povodny.st_mtime_ns))
    beh = subprocess.run([sys.executable, 'zapis.py', 'stav'], cwd=str(kopia.priecinok), env=env, capture_output=True, text=True, encoding='utf-8')
    assert beh.returncode == 0, beh.stdout + beh.stderr
    assert 'Hlavička zoznamu: 27. 11. 2026' in beh.stdout


def test_suchy_beh_ma_vlastnu_kopiu_s_registrom_bez_obrazkov_a_testov(kopia):
    koren, ciel = tr.kopia_na_sucho(kopia.priecinok)
    try:
        assert (ciel / 'build.py').is_file() and (ciel / 'ZOZNAM.md').is_file()
        assert (koren / 'docs' / 'testing' / 'findings-register.md').is_file()
        assert not (ciel / 'navrhy').exists() and not (ciel / 'testy').exists()
        kod, vystup = tr.spusti_build(ciel, ['--check'])
        assert kod == 0, vystup
    finally:
        shutil.rmtree(koren, ignore_errors=True)
    assert not koren.exists()


def test_zapisane_subory_maju_lf_a_utf8_bez_bom(kopia):
    u = kopia.udaje()
    n = next(n for n in u['otvorene'] if str(n) not in u['fronta'])
    vstupy = [('hotove', {'n': n, 'vetva': 'K64', 'pr': '#1', 'zlucene': False, 'rucny_test': 'caka', 'text': 'HOTOVÉ ľščťž 🙂'}),
              ('zmena', {'datum': '27. 11. 2026', 'text': 'ľščťž 🙂'})]
    for prikaz, vstup in vstupy:
        kod, vystup = kopia.zapis(prikaz, '--json', kopia.json(prikaz + '.json', vstup))
        assert kod == 0, vystup
    for nazov in ('zaznamy_hotove_01.py', 'stav.py', 'polozky_povodne.py', 'ZOZNAM.md'):
        data = (kopia.priecinok / nazov).read_bytes()
        assert b'\r' not in data and not data.startswith(b'\xef\xbb\xbf'), nazov
        data.decode('utf-8')
