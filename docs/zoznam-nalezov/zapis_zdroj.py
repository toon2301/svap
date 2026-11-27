# -*- coding: utf-8 -*-
"""Presné úpravy zdrojového textu dátových modulov zoznamu nálezov (jadro skriptu `zapis.py`).

Dáta zoznamu sú Python literály (zoznamy slovníkov, `dict(...)` volania, ranžírované reťazce). Skript ich nesmie prepisovať
celé (stratil by sa formát a komentáre), preto sa upravuje len presne ohraničený text: `ast` povie, kde prvok začína a končí,
a `Zdroj` ho odstráni, vloží alebo zmení a zvyšok súboru nechá bajt po bajte. Polohy z `ast` sú v BAJTOCH (UTF-8), preto sa
všetko robí nad bajtmi. Každá úprava vráti NOVÝ `Zdroj` (po úprave sa text znova rozparsuje, takže neplatný výsledok vyhodí
chybu skôr, než sa zapíše na disk). Ak má miesto neočakávaný tvar, vyhodí sa `ChybaZdroja`; skript radšej nič nezmení, než by
poškodil dáta.
"""
import ast
import re


class ChybaZdroja(Exception):
    """Zdrojový text nemá tvar, s ktorým skript počíta, alebo hľadaný prvok neexistuje."""


class Zdroj:
    """Nemenný zdrojový text modulu s operáciami na literáloch (každá operácia vráti nový `Zdroj`)."""

    def __init__(self, text, nazov='<zdroj>'):
        self.nazov = nazov
        self._b = text.encode('utf-8')
        try:
            self.strom = ast.parse(text)
        except SyntaxError as chyba:
            raise ChybaZdroja('%s: neplatný Python: %s' % (nazov, chyba)) from chyba
        self._zaciatky = [0] + [i + 1 for i, bajt in enumerate(self._b) if bajt == 0x0A]

    # ---------------------------------------------------------------- základ
    @property
    def text(self):
        return self._b.decode('utf-8')

    def _poz(self, riadok, stlpec):
        return self._zaciatky[riadok - 1] + stlpec

    def rozsah(self, uzol):
        """Dvojica (od, do) v bajtoch pre `ast` uzol (vrátane zátvoriek a spojených reťazcov)."""
        return (self._poz(uzol.lineno, uzol.col_offset), self._poz(uzol.end_lineno, uzol.end_col_offset))

    def _nahrad(self, od, do, nahrada=''):
        nove = self._b[:od] + nahrada.encode('utf-8') + self._b[do:]
        return Zdroj(nove.decode('utf-8'), self.nazov)

    def _zaciatok_riadku(self, poz):
        return self._b.rfind(b'\n', 0, poz) + 1

    def _na_zaciatku_riadku(self, poz):
        """Je pred pozíciou na jej riadku len medzera (prvok začína riadok)?"""
        return self._b[self._zaciatok_riadku(poz):poz].strip(b' \t') == b''

    # ---------------------------------------------------------------- vyhľadanie
    def priradenie(self, meno):
        """Hodnota (uzol) priradenia `MENO = ...` na úrovni modulu."""
        for uzol in self.strom.body:
            if isinstance(uzol, ast.Assign) and any(isinstance(c, ast.Name) and c.id == meno for c in uzol.targets):
                return uzol.value
        raise ChybaZdroja('%s: priradenie %s sa nenašlo' % (self.nazov, meno))

    def zoznamy_prvkov(self):
        """Všetky priradenia na úrovni modulu, ktorých hodnotou je zoznam: [(meno, uzol zoznamu)]."""
        vysledok = []
        for uzol in self.strom.body:
            if isinstance(uzol, ast.Assign) and isinstance(uzol.value, ast.List):
                for cielova in uzol.targets:
                    if isinstance(cielova, ast.Name):
                        vysledok.append((cielova.id, uzol.value))
        return vysledok

    @staticmethod
    def kw(volanie, meno):
        """Kľúčové slovo `meno` volania `dict(...)` (alebo `None`)."""
        for k in volanie.keywords:
            if k.arg == meno:
                return k
        return None

    @classmethod
    def hodnota_kw(cls, volanie, meno):
        """Hodnota kľúčového slova ako Python hodnota (`ast.literal_eval`), alebo `None`, ak ho volanie nemá alebo nie je literál."""
        k = cls.kw(volanie, meno)
        if k is None:
            return None
        try:
            return ast.literal_eval(k.value)
        except ValueError:
            return None

    @staticmethod
    def je_dict_volanie(uzol):
        return isinstance(uzol, ast.Call) and isinstance(uzol.func, ast.Name) and uzol.func.id == 'dict'

    def najdi_dict_volanie(self, kluc, hodnota, zoznam=None):
        """Prvý prvok zoznamov modulu v tvare `dict(kluc=hodnota, ...)`: (uzol zoznamu, index, volanie), alebo `None`.

        Bez `zoznam` sa prehľadajú všetky zoznamy na úrovni modulu; s `zoznam` (meno premennej) len ten jeden.
        """
        for meno, uzol_zoznamu in self.zoznamy_prvkov():
            if zoznam is not None and meno != zoznam:
                continue
            for i, prvok in enumerate(uzol_zoznamu.elts):
                if self.je_dict_volanie(prvok) and self.hodnota_kw(prvok, kluc) == hodnota:
                    return uzol_zoznamu, i, prvok
        return None

    # ---------------------------------------------------------------- odstránenie
    def odstran_riadkovy_prvok(self, od, do):
        """Odstráni prvok zoznamu alebo slovníka, ktorý zaberá celé riadky: text [od, do), čiarku za ním a samotné riadky.

        Očakáva tvar: pred prvkom na jeho riadku len odsadenie a za ním (po čiarke) koniec riadku. Inak vyhodí `ChybaZdroja`.
        """
        b = self._b
        koniec = do
        k = koniec
        while k < len(b) and b[k] in b' \t':
            k += 1
        if k < len(b) and b[k] == ord(','):
            koniec = k + 1
        k = koniec
        while k < len(b) and b[k] in b' \t':
            k += 1
        if not self._na_zaciatku_riadku(od) or not (k >= len(b) or b[k] == 0x0A):
            raise ChybaZdroja('%s: prvok nezaberá celé riadky, odstránenie by poškodilo súbor (riadok %d)'
                              % (self.nazov, b.count(b'\n', 0, od) + 1))
        return self._nahrad(self._zaciatok_riadku(od), min(k + 1, len(b)))

    def odstran_prvok_zoznamu(self, uzol_zoznamu, index):
        """Odstráni prvok z literálu zoznamu: celé riadky, ak prvok začína a končí riadok; inak čiarku a medzeru okolo neho."""
        prvky = uzol_zoznamu.elts
        od, do = self.rozsah(prvky[index])
        k = do
        while k < len(self._b) and self._b[k] in b' \t':
            k += 1
        if self._na_zaciatku_riadku(od) and (self._b[k:k + 1] in (b',', b'\n') or k >= len(self._b)):
            return self.odstran_riadkovy_prvok(od, do)
        return self.odstran_inline_prvok(uzol_zoznamu, index)

    def odstran_inline_prvok(self, uzol_zoznamu, index):
        """Odstráni prvok z jednoriadkového (alebo zalomeného) zoznamu `[a, b, c]` aj s čiarkou, ktorá k nemu patrí."""
        prvky = uzol_zoznamu.elts
        od, do = self.rozsah(prvky[index])
        if len(prvky) == 1:
            return self._nahrad(od, do)
        if index + 1 < len(prvky):
            return self._nahrad(od, self.rozsah(prvky[index + 1])[0])
        return self._nahrad(self.rozsah(prvky[index - 1])[1], do)

    def riadky_prvku(self, uzol_zoznamu, index):
        """Text celých riadkov prvku zoznamu (od začiatku riadka po koniec riadka s čiarkou), napr. na jeho presun inam."""
        od, do = self.rozsah(uzol_zoznamu.elts[index])
        b = self._b
        koniec = b.find(b'\n', do)
        if not self._na_zaciatku_riadku(od) or koniec < 0 or b[do:koniec].strip(b' \t') not in (b'', b','):
            raise ChybaZdroja('%s: prvok %d nezaberá celé riadky' % (self.nazov, index))
        return b[self._zaciatok_riadku(od):koniec + 1].decode('utf-8')

    def odstran_kw(self, volanie, meno):
        """Odstráni kľúčové slovo z volania `dict(...)` aj s čiarkou, ktorá k nemu patrí (nie prvé kľúčové slovo `n`)."""
        k = self.kw(volanie, meno)
        if k is None:
            raise ChybaZdroja('%s: kľúčové slovo %s sa nenašlo' % (self.nazov, meno))
        kws = volanie.keywords
        i = kws.index(k)
        if i == 0:
            raise ChybaZdroja('%s: prvé kľúčové slovo %s sa neodstraňuje' % (self.nazov, meno))
        return self._nahrad(self.rozsah(kws[i - 1].value)[1], self.rozsah(k.value)[1])

    # ---------------------------------------------------------------- vloženie
    def vloz_na_koniec_zoznamu(self, uzol_zoznamu, text_prvku):
        """Vloží `text_prvku` (celé riadky, bez koncového riadka, s odsadením a čiarkou) na koniec zoznamu pred riadok so `]`.

        Zoznam musí mať `]` na vlastnom riadku (kanonický tvar súborov so záznamami); inak `ChybaZdroja`.
        """
        b = self._b
        zatvorka = self._poz(uzol_zoznamu.end_lineno, uzol_zoznamu.end_col_offset) - 1
        if b[zatvorka:zatvorka + 1] != b']' or not self._na_zaciatku_riadku(zatvorka):
            raise ChybaZdroja('%s: zoznam nekončí `]` na vlastnom riadku' % self.nazov)
        cast = self
        if uzol_zoznamu.elts:
            posledny_koniec = self.rozsah(uzol_zoznamu.elts[-1])[1]
            medzi = re.sub(rb'#[^\n]*', b'', b[posledny_koniec:zatvorka])  # čiarka v komentári nie je oddeľovač
            if b',' not in medzi:
                cast = self._nahrad(posledny_koniec, posledny_koniec, ',')
                zatvorka += 1
        riadok = cast._zaciatok_riadku(zatvorka)
        return cast._nahrad(riadok, riadok, text_prvku.rstrip('\n') + '\n')

    def vloz_pred_prvok(self, uzol_zoznamu, index, text_prvku):
        """Vloží `text_prvku` (celé riadky s čiarkou) pred prvok `index` zoznamu; prvok musí začínať riadok."""
        od = self.rozsah(uzol_zoznamu.elts[index])[0]
        if not self._na_zaciatku_riadku(od):
            raise ChybaZdroja('%s: prvok %d nezačína riadok' % (self.nazov, index))
        riadok = self._zaciatok_riadku(od)
        return self._nahrad(riadok, riadok, text_prvku.rstrip('\n') + '\n')

    def vloz_za_zaciatok_zoznamu(self, uzol_zoznamu, text_prvku):
        """Vloží `text_prvku` (celé riadky s čiarkou) hneď za riadok s `[` (ako prvý prvok); zoznam musí mať `[` na konci riadka."""
        zatvorka = self._poz(uzol_zoznamu.lineno, uzol_zoznamu.col_offset)
        if self._b[zatvorka:zatvorka + 1] != b'[':
            raise ChybaZdroja('%s: zoznam nezačína `[`' % self.nazov)
        koniec_riadka = self._b.find(b'\n', zatvorka)
        if koniec_riadka < 0 or self._b[zatvorka + 1:koniec_riadka].strip() != b'':
            raise ChybaZdroja('%s: za `[` nasleduje text na tom istom riadku' % self.nazov)
        return self._nahrad(koniec_riadka + 1, koniec_riadka + 1, text_prvku.rstrip('\n') + '\n')

    # ---------------------------------------------------------------- kľúčové slová a reťazce
    def nastav_kw(self, volanie, meno, hodnota_text):
        """Nastaví kľúčové slovo `meno` volania `dict(...)` na `hodnota_text` (zdrojový text hodnoty): zmení existujúce alebo pridá nové."""
        k = self.kw(volanie, meno)
        if k is not None:
            od, do = self.rozsah(k.value)
            return self._nahrad(od, do, hodnota_text)
        if not volanie.keywords:
            raise ChybaZdroja('%s: volanie nemá kľúčové slová' % self.nazov)
        posledne = volanie.keywords[-1]
        koniec = self.rozsah(posledne.value)[1]
        zaciatok = self._poz(posledne.lineno, posledne.col_offset)
        if self._na_zaciatku_riadku(zaciatok):  # viacriadkové volanie: nové kľúčové slovo pod ostatné, rovnako odsadené
            odsadenie = ' ' * (zaciatok - self._zaciatok_riadku(zaciatok))
            return self._nahrad(koniec, koniec, ',\n%s%s=%s' % (odsadenie, meno, hodnota_text))
        return self._nahrad(koniec, koniec, ', %s=%s' % (meno, hodnota_text))

    def pridaj_kusok_retazca(self, uzol_retazca, kusok):
        """Pripojí k reťazcovému literálu (aj zloženému z viacerých riadkov) ďalší literál `'<kusok>'` na novom riadku.

        `kusok` je už hotový text literálu (so zakódovanými apostrofmi); pred ním sa vloží medzera, aby sa vety nezlepili.
        """
        if not (isinstance(uzol_retazca, ast.Constant) and isinstance(uzol_retazca.value, str)):
            raise ChybaZdroja('%s: hodnota nie je reťazec' % self.nazov)
        od, do = self.rozsah(uzol_retazca)
        prvy_riadok = self._zaciatok_riadku(od)
        if uzol_retazca.end_lineno > uzol_retazca.lineno:  # odsadenie druhého riadka literálu, nech v ňom začína akýkoľvek druh úvodzoviek
            druhy = self._poz(uzol_retazca.lineno + 1, 0)
            koniec_riadka = self._b.find(b'\n', druhy)
            riadok = self._b[druhy:koniec_riadka if koniec_riadka >= 0 else len(self._b)]
            odsadenie = riadok[:len(riadok) - len(riadok.lstrip(b' \t'))].decode('utf-8')
        else:
            odsadenie = ' ' * len(self._b[prvy_riadok:od].decode('utf-8'))  # počet znakov, nie bajtov
        return self._nahrad(do, do, "\n%s'%s'" % (odsadenie, ' ' + kusok))
