# -*- coding: utf-8 -*-
"""Zápis zmien na disk „všetko alebo nič“ a kontrola celého modelu po zápise (jadro skriptu `zapis.py`).

Postup: zapíšu sa zmenené a nové súbory (každý cez dočasný súbor a `os.replace`, takže pôvodný súbor sa pri chybe disku nikdy
neskráti), v čerstvom interpretri (bez starých `.pyc`) sa spustí `build.py` (kontroly dát a zápis `ZOZNAM.md`) a pri akejkoľvek
chybe sa všetky súbory vrátia do pôvodného stavu vrátane `ZOZNAM.md`. Súbor sa eviduje na obnovu ešte pred zápisom a každý súbor
sa vracia osobitne: chyba pri jednom nezastaví obnovu ostatných a ak sa niečo vrátiť nepodarí, skript to povie presne (ktoré
súbory, pôvodná chyba, kde je záloha). Suchý beh pracuje v dočasnej kópii priečinka, takže skutočné súbory nikdy nezmení.
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


class ChybaKontroly(Exception):
    """Model zoznamu po zápise neprešiel kontrolou; zmeny sú vrátené späť a správa nesie výpis generátora."""


class ChybaObnovy(ChybaKontroly):
    """Zmena zlyhala (kontrola modelu, prerušenie alebo chyba disku) a niektoré súbory sa nepodarilo vrátiť do pôvodného stavu.

    Správa hovorí, ktoré súbory to sú, aká bola pôvodná chyba a kde je uložený ich pôvodný obsah.
    """


def spusti_build(priecinok, argumenty=()):
    """Spustí `build.py` v priečinku v čerstvom interpretri a vráti (návratový kód, výstup)."""
    with tempfile.TemporaryDirectory() as pyc:
        prostredie = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', PYTHONIOENCODING='utf-8')
        beh = subprocess.run([sys.executable, '-B', '-X', 'pycache_prefix=' + pyc, 'build.py', *argumenty], cwd=str(priecinok),
                             env=prostredie, capture_output=True, text=True, encoding='utf-8')
    return beh.returncode, (beh.stdout + beh.stderr).strip()


def _zapis(cesta, text):
    """Zapíše súbor cez dočasný súbor v tom istom priečinku a `os.replace`; pri chybe dočasný súbor zmaže a pôvodný nechá nedotknutý."""
    docasny = cesta.with_name('%s.zapis-%d.tmp' % (cesta.name, os.getpid()))
    try:
        with open(docasny, 'w', encoding='utf-8', newline='\n') as subor:
            subor.write(text)
        os.replace(docasny, cesta)
    except BaseException:
        try:
            docasny.unlink()
        except OSError:
            pass
        raise


def _vrat_zmeny(ds, zmeny, zapisane, zoznam, zaloha_zoznamu):
    """Vráti súbory do pôvodného stavu, každý osobitne; vráti zoznam (názov, pôvodný text, chyba) súborov, ktoré sa vrátiť nepodarilo."""
    zlyhali = []
    for nazov in zapisane:
        stary = zmeny[nazov][0]
        try:
            if stary is None:
                (ds.priecinok / nazov).unlink(missing_ok=True)
            else:
                _zapis(ds.priecinok / nazov, stary)
        except Exception as chyba:  # noqa: BLE001 - chyba pri jednom súbore nesmie zastaviť obnovu ostatných
            zlyhali.append((nazov, stary, chyba))
    if zaloha_zoznamu is not None:
        try:
            _zapis(zoznam, zaloha_zoznamu)
        except Exception as chyba:  # noqa: BLE001
            zlyhali.append((zoznam.name, zaloha_zoznamu, chyba))
    return zlyhali


def _uloz_zalohu(zlyhali):
    """Pôvodný obsah neobnovených súborov uloží do nového dočasného priečinka (najlepšia snaha); vráti jeho cestu alebo `None`."""
    try:
        zaloha = Path(tempfile.mkdtemp(prefix='zapis-zaloha-'))
        for nazov, stary, _chyba in zlyhali:
            if stary is not None:
                (zaloha / nazov).write_text(stary, encoding='utf-8', newline='\n')
        return zaloha
    except OSError:
        return None


def _sprava_obnovy(chyba, zlyhali, zaloha):
    riadky = ['NEPODARILO SA VRÁTIŤ ZMENY (pôvodná chyba: %s: %s).' % (type(chyba).__name__, str(chyba)[:500]),
              'Neobnovené súbory: ' + '; '.join('%s (%s: %s)' % (nazov, type(c).__name__, c) for nazov, _stary, c in zlyhali) + '.',
              ('Pôvodný obsah neobnovených súborov je uložený v %s.' % zaloha) if zaloha else
              'Pôvodný obsah sa nepodarilo uložiť, vezmi ho z gitu.',
              'Obnov ich z gitu (`git checkout -- docs/zoznam-nalezov/<súbor>`, nový súbor zmaž) a over `python docs/zoznam-nalezov/build.py --check`.']
    return '\n'.join(riadky)


def vykonaj(ds):
    """Zapíše zmeny `Dataset`u, overí model a pri chybe všetko vráti; vráti výstup generátora (jeho posledné riadky sú súhrn).

    Ak sa niektorý súbor vrátiť nepodarí, vyhodí `ChybaObnovy` s presným popisom; inak pôvodnú chybu (napr. `ChybaKontroly`).
    """
    zmeny = ds.zmeny()
    if not zmeny:
        raise ChybaKontroly('operácia nič nezmenila')
    zoznam = ds.priecinok / 'ZOZNAM.md'
    zaloha_zoznamu = zoznam.read_text(encoding='utf-8') if zoznam.exists() else None
    zapisane = []
    try:
        for nazov, (_stary, novy) in zmeny.items():
            zapisane.append(nazov)  # na obnovu ešte pred zápisom: zápis môže padnúť po tom, čo sa súbor začal prepisovať
            _zapis(ds.priecinok / nazov, novy)
        kod, vystup = spusti_build(ds.priecinok)
        if kod != 0:
            raise ChybaKontroly(vystup)
        return vystup
    except BaseException as chyba:
        zlyhali = _vrat_zmeny(ds, zmeny, zapisane, zoznam, zaloha_zoznamu)
        if zlyhali:
            raise ChybaObnovy(_sprava_obnovy(chyba, zlyhali, _uloz_zalohu(zlyhali))) from chyba
        raise


def kopia_na_sucho(priecinok):
    """Vytvorí dočasnú kópiu priečinka zoznamu spolu s registrom (model ho číta zo súrodeneckého `testing/`); vráti (koreň, kópia).

    Ak kopírovanie zlyhá, dočasný koreň sa zmaže a chyba pokračuje ďalej.
    """
    zdroj = Path(priecinok).resolve()
    koren = Path(tempfile.mkdtemp(prefix='zapis-na-sucho-'))
    try:
        ciel = koren / 'docs' / zdroj.name
        shutil.copytree(zdroj, ciel, ignore=shutil.ignore_patterns('__pycache__', 'testy', '.pytest_cache', 'navrhy'))  # `navrhy/` sú obrázky (13 MB), build ich nečíta
        register = zdroj.parent / 'testing' / 'findings-register.md'
        (koren / 'docs' / 'testing').mkdir(parents=True)
        shutil.copy2(register, koren / 'docs' / 'testing' / register.name)
    except BaseException:
        shutil.rmtree(koren, ignore_errors=True)
        raise
    return koren, ciel
