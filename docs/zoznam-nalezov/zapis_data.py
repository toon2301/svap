# -*- coding: utf-8 -*-
"""Súbory zoznamu nálezov ako jedna celistvá množina: čítanie, zmeny v pamäti a vyhľadanie položiek (jadro skriptu `zapis.py`).

`Dataset` drží zdrojové texty súborov v priečinku zoznamu. Operácie ich len menia v pamäti; na disk ich zapíše až transakcia
(`zapis_transakcia.py`) a hneď po zápise overí celý model. Vyhľadávacie funkcie nehľadajú podľa pevných názvov premenných, ale
podľa tvaru dát (zoznamy `dict(n=…)` v súboroch `polozky_nove*.py`, `hotove*.py`, `zaznamy_*_NN.py`), aby skript nezastaral,
keď pribudne nový súbor.
"""
import ast
import os
from pathlib import Path

from zapis_zdroj import ChybaZdroja, Zdroj

ROTACIA_RIADKOV = int(os.environ.get('ZAPIS_ROTACIA_RIADKOV', 350))  # súbor záznamov s viac riadkami dostane nasledovníka (`…_02.py`); premenná je pre testy

SABLONY = {
    'zaznamy_nove': ('"""Nové otvorené nálezy zapísané skriptom `zapis.py novy` (formát drží skript; ručne ich neupravuj bez dôvodu).\n\n'
                     'Rovnaký tvar ako `polozky_nove_k60.py`. Po oprave sa nález odstráni odtiaľto (`zapis.py hotove`) a zapíše do `zaznamy_hotove_NN.py`.\n"""\n\n'
                     'from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401\n\nNEW_ITEMS_ZAZNAMY = [\n]\n'),
    'zaznamy_hotove': ('"""Hotové položky zapísané skriptom `zapis.py hotove` (formát drží skript; ručne ich neupravuj bez dôvodu).\n\n'
                       "Rovnaký tvar ako `hotove_k59.py`: `dict(n=…, vetva='K64', pr='#345', zlucene=True, rucny_test='caka', text='HOTOVÉ …')`. Pole `rucny_test`\n"
                       '(`caka`, `prešiel`, `neprešiel`) sa vypĺňa, keď dávka vyžaduje ručný test; bez neho ručný test nie je požadovaný.\n"""\n\n'
                       'DONE_SINCE_ZAZNAMY = [\n]\n\n# Zlúčené PR, v ktorých nález nie je hotový celý (len časť otvoreného nálezu): (PR, vetva, text).\n'
                       'DONE_PR_TABLE_CASTOCNE_ZAZNAMY = [\n]\n'),
    'zaznamy_rozhodnutia': ('"""Rozhodnutia zapísané skriptom `zapis.py rozhodnutie` (formát drží skript; ručne ich neupravuj bez dôvodu).\n\n'
                            'Rovnaký tvar ako `rozhodnutia_k46.py`. Číslo `R<n>` pridelí skript ako ďalšie voľné.\n"""\n\nDECISIONS_ZAZNAMY = [\n]\n'),
    'zaznamy_zatvorene': ('"""Nálezy zatvorené rozhodnutím majiteľa, zapísané skriptom `zapis.py zatvor` (formát drží skript).\n\n'
                          "Rovnaký tvar ako `zatvorene_dalsie.py`: `dict(n=…, rozhodnutie='R85', datum='…', text='ZATVORENÉ …')`; rozhodnutie musí mať odpoveď.\n\"\"\"\n\n"
                          'CLOSED_SINCE_ZAZNAMY = [\n]\n'),
}
ZLOZENIE = {'zaznamy_nove': 'NEW_ITEMS_ZAZNAMY', 'zaznamy_hotove': 'DONE_SINCE_ZAZNAMY',
            'zaznamy_rozhodnutia': 'DECISIONS_ZAZNAMY', 'zaznamy_zatvorene': 'CLOSED_SINCE_ZAZNAMY'}


class Dataset:
    """Zdrojové súbory zoznamu v pamäti s evidenciou, čo sa zmenilo (alebo vzniklo)."""

    def __init__(self, priecinok):
        self.priecinok = Path(priecinok)
        self._zdroje = {}
        self._povodne = {}

    def zdroj(self, nazov):
        """Aktuálny `Zdroj` súboru (z disku, kým ho operácia nezmenila)."""
        if nazov not in self._zdroje:
            text = (self.priecinok / nazov).read_text(encoding='utf-8')
            self._povodne[nazov] = text
            self._zdroje[nazov] = Zdroj(text, nazov)
        return self._zdroje[nazov]

    def nastav(self, nazov, zdroj):
        """Zapíše zmenený `Zdroj` do pamäte (na disk až transakcia)."""
        self.zdroj(nazov)
        self._zdroje[nazov] = zdroj

    def vytvor(self, nazov, text):
        """Založí nový súbor v pamäti; ak už existuje, je to chyba."""
        if (self.priecinok / nazov).exists() or nazov in self._zdroje:
            raise ChybaZdroja('%s: súbor už existuje' % nazov)
        self._povodne[nazov] = None
        self._zdroje[nazov] = Zdroj(text, nazov)

    def subory(self, vzor):
        """Názvy súborov podľa vzoru (z disku aj novo založené) v poradí názvov."""
        z_disku = {p.name for p in self.priecinok.glob(vzor)}
        novy = {n for n in self._zdroje if self._povodne.get(n, 0) is None and Path(n).match(vzor)}
        return sorted(z_disku | novy)

    def zmeny(self):
        """Slovník názov -> (pôvodný text alebo `None`, nový text) pre súbory, ktoré sa zmenili alebo vznikli."""
        return {n: (self._povodne[n], z.text) for n, z in self._zdroje.items() if z.text != self._povodne[n]}

    # ---------------------------------------------------------------- súbory záznamov (zaznamy_*_NN.py)
    def najnovsi_zaznamovy(self, predpona):
        """Názov najnovšieho súboru záznamov danej predpony; keď je plný, založí nasledujúci a vráti ten."""
        existujuce = self.subory('%s_[0-9][0-9].py' % predpona)
        if not existujuce:
            raise ChybaZdroja('chýba súbor %s_01.py' % predpona)
        posledny = existujuce[-1]
        if len(self.zdroj(posledny).text.splitlines()) <= ROTACIA_RIADKOV:
            return posledny
        cislo = int(posledny[len(predpona) + 1:-3]) + 1
        if cislo > 99:
            raise ChybaZdroja('súbory %s_NN.py sú vyčerpané' % predpona)
        novy = '%s_%02d.py' % (predpona, cislo)
        self.vytvor(novy, '# -*- coding: utf-8 -*-\n' + SABLONY[predpona])
        return novy

    def zoznam_zaznamov(self, predpona, meno_zoznamu=None):
        """(názov súboru, uzol zoznamu) v najnovšom súbore záznamov; `meno_zoznamu` pre súbory s viacerými zoznamami."""
        nazov = self.najnovsi_zaznamovy(predpona)
        return nazov, self.zdroj(nazov).priradenie(meno_zoznamu or ZLOZENIE[predpona])

    def pridaj_zaznam(self, predpona, text_prvku, meno_zoznamu=None):
        """Pridá hotový text prvku na koniec zoznamu najnovšieho súboru záznamov a vráti jeho názov."""
        nazov, uzol = self.zoznam_zaznamov(predpona, meno_zoznamu)
        self.nastav(nazov, self.zdroj(nazov).vloz_na_koniec_zoznamu(uzol, text_prvku))
        return nazov

    # ---------------------------------------------------------------- vyhľadanie podľa tvaru dát
    def najdi_dict(self, vzory, kluc, hodnota):
        """Prvý `dict(kluc=hodnota, …)` v zoznamoch súborov podľa vzorov: (názov súboru, `Zdroj`, uzol zoznamu, index, volanie)."""
        for vzor in vzory:
            for nazov in self.subory(vzor):
                zdroj = self.zdroj(nazov)
                najdene = zdroj.najdi_dict_volanie(kluc, hodnota)
                if najdene:
                    return (nazov, zdroj) + najdene
        return None


# Vzory súborov, v ktorých sa hľadajú otvorené nálezy a hotové položky.
VZORY_OTVORENE_NOVE = ['polozky_nove*.py', 'zaznamy_nove_[0-9][0-9].py']
VZORY_HOTOVE = ['hotove*.py', 'zaznamy_hotove_[0-9][0-9].py']


def odstran_otvoreny_nalez(ds, n):
    """Odstráni otvorený číslovaný nález zo zdroja (`ORIG_OPEN` alebo zoznam `dict(n=…)`); vráti názov upraveného súboru.

    Vyhodí `ChybaZdroja`, ak sa nález v zdrojoch nenašiel (potom nie je otvorený).
    """
    nazov = 'polozky_povodne.py'
    zdroj = ds.zdroj(nazov)
    slovnik = zdroj.priradenie('ORIG_OPEN')
    for kluc, hodnota in zip(slovnik.keys, slovnik.values):
        if isinstance(kluc, ast.Constant) and kluc.value == n:
            od = zdroj.rozsah(kluc)[0]
            do = zdroj.rozsah(hodnota)[1]
            ds.nastav(nazov, zdroj.odstran_riadkovy_prvok(od, do))
            return nazov
    najdene = ds.najdi_dict(VZORY_OTVORENE_NOVE, 'n', n)
    if najdene is None:
        raise ChybaZdroja('nález %s sa v zdrojoch otvorených nálezov nenašiel' % n)
    nazov, zdroj, uzol_zoznamu, index, _volanie = najdene
    ds.nastav(nazov, zdroj.odstran_prvok_zoznamu(uzol_zoznamu, index))
    return nazov


def odstran_z_fronty(ds, n):
    """Odstráni záznam `n` z `fronta.FRONTA`; vráti `True`, ak tam bol."""
    zdroj = ds.zdroj('fronta.py')
    najdene = zdroj.najdi_dict_volanie('n', str(n), zoznam='FRONTA')
    if najdene is None:
        return False
    uzol_zoznamu, index, _volanie = najdene
    ds.nastav('fronta.py', zdroj.odstran_prvok_zoznamu(uzol_zoznamu, index))
    return True


def odstran_z_vln(ds, identifikator):
    """Odstráni ID zo zoznamov `polozky` vĺn v `stav.PORADIE` (aby kontrola vĺn nehlásila zastaranú položku); vráti počet vĺn.

    `polozky` môže byť aj súčet zoznamov (`['N%d' % i for i in range(1, 16)] + ['OW-06', '180']`): ID sa hľadá vo všetkých
    literálnych zoznamoch výrazu; generátor zoznamu sa nemení.
    """
    pocet = 0
    while True:
        zdroj = ds.zdroj('stav.py')
        zasah = None
        for vlna in zdroj.priradenie('PORADIE').elts:
            k = Zdroj.kw(vlna, 'polozky') if Zdroj.je_dict_volanie(vlna) else None
            if k is None:
                continue
            for zoznam in (u for u in ast.walk(k.value) if isinstance(u, ast.List)):
                for i, prvok in enumerate(zoznam.elts):
                    if isinstance(prvok, ast.Constant) and prvok.value == identifikator:
                        zasah = (zoznam, i)
                        break
                if zasah:
                    break
            if zasah:
                break
        if not zasah:
            return pocet
        ds.nastav('stav.py', zdroj.odstran_inline_prvok(*zasah))
        pocet += 1
