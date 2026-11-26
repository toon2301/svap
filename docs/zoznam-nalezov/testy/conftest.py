# -*- coding: utf-8 -*-
"""Spoločné pomôcky testov skriptu `zapis.py`: každý test dostane vlastnú KÓPIU skutočných dát zoznamu nálezov.

Testy bežia nad kópiou priečinka `docs/zoznam-nalezov` (a súrodeneckého `docs/testing/findings-register.md`, ktorý model číta),
takže overujú správanie na skutočných dátach a nikdy nemenia repozitár. Skript sa spúšťa ako samostatný proces v kópii, rovnako
ako ho spúšťa agent. Rýchle testy bez kópie (úpravy zdrojového textu, formát, model) importujú moduly priamo z repozitára.

Spustenie (z koreňa repozitára): `python -m pytest docs/zoznam-nalezov/testy -q`.
"""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ZDROJ = Path(__file__).resolve().parent.parent
REGISTER = ZDROJ.parent / 'testing' / 'findings-register.md'
PROSTREDIE = {'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONIOENCODING': 'utf-8'}
NEKOPIRUJ = ('__pycache__', 'testy', '.pytest_cache', 'navrhy')  # `navrhy/` sú obrázky (13 MB), build ich nečíta

sys.dont_write_bytecode = True  # testy nesmú vytvárať `__pycache__` v repozitári
if str(ZDROJ) not in sys.path:
    sys.path.insert(0, str(ZDROJ))

SUHRN = re.compile(r'Nálezy spolu (\d+): HNEĎ (\d+), PRED (\d+), PO (\d+); hotové (\d+) '
                   r'\(\+(\d+) čaká na zlúčenie, \+(\d+) čaká na ručný test\)')

KOD_UDAJE = '''
import json, fronta, model, stav
m = model.zostav_model()
print(json.dumps({
    'posledne': m.posledne_cislo,
    'otvorene': sorted(int(i) for i in m.otvorene_id if i.isdigit()),
    'otvorene_vsetky': sorted(m.otvorene_id),
    'fronta': [z['n'] for z in fronta.FRONTA],
    'hotove': [d['n'] for d in stav.DONE_SINCE],
    'rozhodnutia': [d['id'] for d in stav.DECISIONS],
    'rozhodnutia_s_odpovedou': [d['id'] for d in stav.DECISIONS if d.get('odpoved')],
    'vo_vlnach': [i for v in stav.PORADIE for i in v.get('polozky', [])],
    'baliky': {k: list(v) for k, v in model.PORADIE_BALIKOV.items()},
}, ensure_ascii=False))
'''


def suhrn(vystup):
    """Čísla zo súhrnného riadka generátora (`build.py` aj posledný riadok `zapis.py`) ako slovník."""
    najdene = SUHRN.search(vystup)
    assert najdene, 'vo výstupe chýba súhrnný riadok:\n%s' % vystup
    kluce = ('spolu', 'hned', 'pred', 'po', 'hotove', 'caka_zlucenie', 'caka_rucny')
    return dict(zip(kluce, map(int, najdene.groups())))


class Kopia:
    """Kópia priečinka zoznamu v dočasnom adresári s pomôckami na spúšťanie skriptov a čítanie súborov."""

    def __init__(self, koren):
        self.koren = Path(koren)
        self.priecinok = self.koren / 'docs' / 'zoznam-nalezov'
        shutil.copytree(ZDROJ, self.priecinok, ignore=shutil.ignore_patterns(*NEKOPIRUJ))
        (self.koren / 'docs' / 'testing').mkdir(parents=True)
        shutil.copy2(REGISTER, self.koren / 'docs' / 'testing' / REGISTER.name)

    def _proces(self, argumenty, vstup=None, env=None):
        beh = subprocess.run([sys.executable, '-B', '-X', 'pycache_prefix=' + str(self.koren / 'pyc'), *map(str, argumenty)],
                             cwd=str(self.priecinok), input=vstup, capture_output=True, text=True, encoding='utf-8',
                             env={**os.environ, **PROSTREDIE, **(env or {})})
        return beh.returncode, (beh.stdout + beh.stderr).strip()

    def spusti(self, skript, *argumenty, vstup=None, env=None):
        """Spustí skript z kópie (`zapis.py`, `build.py`); vráti (návratový kód, výstup)."""
        return self._proces([skript, *argumenty], vstup, env)

    def zapis(self, *argumenty, vstup=None, env=None):
        return self.spusti('zapis.py', *argumenty, vstup=vstup, env=env)

    def build_check(self):
        return self.spusti('build.py', '--check')

    def vyhodnot(self, vyraz, moduly='model, stav, fronta'):
        """Vyhodnotí Python výraz v kópii (moduly zoznamu sú importované) a vráti jeho hodnotu cez JSON."""
        kod = 'import json, %s\nprint(json.dumps(%s, ensure_ascii=False))' % (moduly, vyraz)
        navrat, vystup = self._proces(['-c', kod])
        assert navrat == 0, vystup
        return json.loads(vystup)

    def udaje(self):
        """Aktuálny stav dát v kópii: otvorené nálezy, fronta, hotové, rozhodnutia, vlny a balíky."""
        navrat, vystup = self._proces(['-c', KOD_UDAJE])
        assert navrat == 0, vystup
        return json.loads(vystup)

    def text(self, nazov):
        return (self.priecinok / nazov).read_text(encoding='utf-8')

    def snimka(self):
        """Obsah všetkých súborov kópie (na porovnanie pred a po)."""
        return {str(p.relative_to(self.priecinok)): p.read_bytes()
                for p in sorted(self.priecinok.rglob('*')) if p.is_file() and '__pycache__' not in p.parts}

    def json(self, nazov, obsah):
        """Zapíše vstupný JSON do kópie a vráti jeho cestu."""
        cesta = self.koren / nazov
        cesta.write_text(json.dumps(obsah, ensure_ascii=False, indent=2), encoding='utf-8')
        return cesta


@pytest.fixture
def kopia(tmp_path):
    return Kopia(tmp_path)
