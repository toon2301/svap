# -*- coding: utf-8 -*-
"""Zápis zmien na disk „všetko alebo nič“ a kontrola celého modelu po zápise (jadro skriptu `zapis.py`).

Postup: zapíšu sa zmenené a nové súbory, v čerstvom interpretri (bez starých `.pyc`) sa spustí `build.py` (kontroly dát a
zápis `ZOZNAM.md`) a pri akejkoľvek chybe sa všetky súbory vrátia do pôvodného stavu vrátane `ZOZNAM.md`. Suchý beh pracuje v
dočasnej kópii priečinka, takže skutočné súbory nikdy nezmení.
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


class ChybaKontroly(Exception):
    """Model zoznamu po zápise neprešiel kontrolou; zmeny sú vrátené späť a správa nesie výpis generátora."""


def spusti_build(priecinok, argumenty=()):
    """Spustí `build.py` v priečinku v čerstvom interpretri a vráti (návratový kód, výstup)."""
    with tempfile.TemporaryDirectory() as pyc:
        prostredie = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', PYTHONIOENCODING='utf-8')
        beh = subprocess.run([sys.executable, '-B', '-X', 'pycache_prefix=' + pyc, 'build.py', *argumenty], cwd=str(priecinok),
                             env=prostredie, capture_output=True, text=True, encoding='utf-8')
    return beh.returncode, (beh.stdout + beh.stderr).strip()


def _zapis(cesta, text):
    with open(cesta, 'w', encoding='utf-8', newline='\n') as subor:
        subor.write(text)


def vykonaj(ds):
    """Zapíše zmeny `Dataset`u, overí model a pri chybe všetko vráti; vráti výstup generátora (jeho posledné riadky sú súhrn)."""
    zmeny = ds.zmeny()
    if not zmeny:
        raise ChybaKontroly('operácia nič nezmenila')
    zoznam = ds.priecinok / 'ZOZNAM.md'
    zaloha_zoznamu = zoznam.read_text(encoding='utf-8') if zoznam.exists() else None
    zapisane = []
    try:
        for nazov, (_stary, novy) in zmeny.items():
            _zapis(ds.priecinok / nazov, novy)
            zapisane.append(nazov)
        kod, vystup = spusti_build(ds.priecinok)
        if kod != 0:
            raise ChybaKontroly(vystup)
        return vystup
    except BaseException:
        for nazov in zapisane:
            stary = zmeny[nazov][0]
            if stary is None:
                (ds.priecinok / nazov).unlink(missing_ok=True)
            else:
                _zapis(ds.priecinok / nazov, stary)
        if zaloha_zoznamu is not None:
            _zapis(zoznam, zaloha_zoznamu)
        raise


def kopia_na_sucho(priecinok):
    """Vytvorí dočasnú kópiu priečinka zoznamu spolu s registrom (model ho číta zo súrodeneckého `testing/`); vráti (koreň, kópia)."""
    zdroj = Path(priecinok).resolve()
    koren = Path(tempfile.mkdtemp(prefix='zapis-na-sucho-'))
    ciel = koren / 'docs' / zdroj.name
    shutil.copytree(zdroj, ciel, ignore=shutil.ignore_patterns('__pycache__', 'testy', '.pytest_cache', 'navrhy'))  # `navrhy/` sú obrázky (13 MB), build ich nečíta
    register = zdroj.parent / 'testing' / 'findings-register.md'
    (koren / 'docs' / 'testing').mkdir(parents=True)
    shutil.copy2(register, koren / 'docs' / 'testing' / register.name)
    return koren, ciel
