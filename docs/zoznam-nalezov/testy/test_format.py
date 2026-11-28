# -*- coding: utf-8 -*-
"""Testy vykreslenia záznamov (`zapis_format.py`): text sa musí vrátiť do dát presne taký, aký bol zadaný."""
import ast
import random

import pytest

import zapis_format as fmt
from zapis_format import ChybaVstupu

NEBEZPECNE = ["'", '"', '\\', '\\\\', '|', '%s', '{x}', '{}', 'ľščťžýáíé', '🙂', '`kód`', '#', '(', ')', '\\n', "x\\'y", "'''", '"""',
              '\\x41', 'a' * 150, '[', ']', ',', ';', ':', '->', '${var}', '<b>', '$', '*', '_']


def _vyhodnot(kod):
    """Hodnota literálu (alebo viacerých literálov pod sebou v zátvorke), ako ju prečíta Python."""
    return ast.literal_eval('(' + kod + ')')


def _dict_z_textu(text):
    """Kľúče a hodnoty `dict(...)` zo zapísaného záznamu (názvy konštánt ako text)."""
    uzol = ast.parse('X = [\n' + text + ']\n').body[0].value.elts[0]
    return {k.arg: k.value.id if isinstance(k.value, ast.Name) else ast.literal_eval(k.value) for k in uzol.keywords}


# ---------------------------------------------------------------- vstup
def test_normalizuj_zjednoti_medzery_a_zalomenia():
    """`normalizuj` zjednotí medzery, tabulátory a zalomenia (aj windowsovské) na jednu medzeru a odstráni okrajové medzery."""
    assert fmt.normalizuj('  a \n\t b\r\n  c  ', 'pole') == 'a b c'


@pytest.mark.parametrize('hodnota', [5, None, ['a'], {'a': 1}, True, b'a'])
def test_normalizuj_odmietne_hodnotu_ktora_nie_je_text(hodnota):
    """`normalizuj` odmietne hodnotu, ktorá nie je text (číslo, `None`, zoznam, slovník, `bool`, bajty): `ChybaVstupu` „musí byť
    text“."""
    with pytest.raises(ChybaVstupu, match='pole pole musí byť text'):
        fmt.normalizuj(hodnota, 'pole')


@pytest.mark.parametrize('hodnota', ['', '   ', '\n\t \r\n'])
def test_normalizuj_odmietne_prazdny_text(hodnota):
    """`normalizuj` odmietne prázdny text aj text len z medzier a zalomení: `ChybaVstupu` „je prázdne“."""
    with pytest.raises(ChybaVstupu, match='je prázdne'):
        fmt.normalizuj(hodnota, 'pole')


@pytest.mark.parametrize('znak', ['\x00', '\x07', '\x1b', '\x1f'])
def test_normalizuj_odmietne_riadiace_znaky(znak):
    """`normalizuj` odmietne riadiace znaky (NUL, BEL, ESC, …) vo vnútri textu: `ChybaVstupu` „riadiace znaky“."""
    with pytest.raises(ChybaVstupu, match='riadiace znaky'):
        fmt.normalizuj('a' + znak + 'b', 'pole')


def test_normalizuj_stropuje_dlzku_textu():
    """`normalizuj` prijme text dlhý presne `NAJVIAC_ZNAKOV` a o jeden znak dlhší odmietne (`ChybaVstupu` „skráť ho“)."""
    assert len(fmt.normalizuj('a' * fmt.NAJVIAC_ZNAKOV, 'pole')) == fmt.NAJVIAC_ZNAKOV
    with pytest.raises(ChybaVstupu, match='skráť ho'):
        fmt.normalizuj('a' * (fmt.NAJVIAC_ZNAKOV + 1), 'pole')


# ---------------------------------------------------------------- literály
@pytest.mark.parametrize('text', ["it's", 'a\\b', 'koniec\\', "'", "\\'", 'a|b', 'tab\tvnútri', 'ľščťž 🙂', '"dvojité"', "'''"])
def test_retazec_sa_vrati_do_povodneho_textu(text):
    """`retazec` zakóduje apostrof, obrátenú lomku, úvodzovky, tabulátor, diakritiku aj emoji tak, že Python prečíta presne
    pôvodný text."""
    assert ast.literal_eval(fmt.retazec(text)) == text


def test_dlhy_text_sa_zalomi_na_viac_literalov_a_vrati_do_povodneho_textu():
    """Dlhý text (120 slov) sa zalomí na viac literálov pod sebou s predpísaným odsadením a Python z nich poskladá pôvodný
    text."""
    text = ' '.join('slovo%d' % i for i in range(120))
    kod = fmt.literal(text, 14)
    riadky = kod.split('\n')
    assert len(riadky) > 3
    assert all(r.startswith(' ' * 14 + "'") for r in riadky[1:])
    assert _vyhodnot(kod) == text


def test_kratky_text_ostane_jednym_literalom_bez_zalomenia():
    """Krátky text ostane jedným literálom bez zalomenia."""
    assert fmt.literal('krátky text', 14) == "'krátky text'"


def test_nahodne_nebezpecne_texty_prejdu_cez_literal_bez_straty():
    """Na 400 náhodných textoch s nebezpečnými znakmi (apostrofy, lomky, úvodzovky, `%s`, `{x}`, emoji, …) `literal` nič nestratí:
    Python prečíta pôvodný text."""
    rng = random.Random(2611)
    for _ in range(400):
        text = ' '.join(rng.choice(NEBEZPECNE) for _ in range(rng.randint(1, 60)))
        odsadenie = rng.choice([6, 14, 20])
        assert _vyhodnot(fmt.literal(text, odsadenie)) == text, text


def test_text_bez_dlhych_slov_nepresiahne_sirku_ani_po_zakodovani_apostrofov():
    """Zalomený literál nepresiahne šírku `SIRKA` (okrem znakov, ktoré pridá kódovanie apostrofov a lomiek) ani pri 300 slovách
    s apostrofmi a lomkami."""
    rng = random.Random(7)
    text = ' '.join(rng.choice(["it's", 'a\\b', 'slovo', 'ľščťž']) for _ in range(300))
    for riadok in fmt.literal(text, 14).split('\n'):
        # telo literálu má najviac SIRKA znakov a koncovú medzeru, ku ktorým pribudnú dve úvodzovky a zakódované znaky
        assert len(riadok.strip()) <= fmt.SIRKA + 1 + 2 + riadok.count("\\'") + riadok.count('\\\\')


# ---------------------------------------------------------------- záznamy
def test_novy_nalez_ma_tvar_dict_a_vsetky_polia_sa_vratia():
    """`nalez` vykreslí `dict(n=…)` s kódmi skupiny, dopadu a zložitosti z `konstanty.py` a všetky zadané polia sa po prečítaní
    vrátia nezmenené (apostrof, obrátená lomka, zvislítko)."""
    text = fmt.nalez(381, 'P', 'S', 'M', 'Vzhľad Nástenky', "krátko 'a'", 'čo \\ sa deje', 'JASNÉ | poznámka', 'ručný test (27. 11. 2026)')
    assert text.startswith('    dict(n=381, bucket=P, imp=S_, eff=EM, pkg=') and text.endswith('),\n')
    d = _dict_z_textu(text)
    assert d == {'n': 381, 'bucket': 'P', 'imp': 'S_', 'eff': 'EM', 'pkg': 'Vzhľad Nástenky', 'kratko': "krátko 'a'",
                 'what': 'čo \\ sa deje', 'note': 'JASNÉ | poznámka', 'dec': None, 'src': 'ručný test (27. 11. 2026)'}


def test_novy_nalez_s_rozhodnutim_ma_dec_s_predponou():
    """Nález viazaný na rozhodnutie má `dec` v tvare `ROZHODNUTIE R<n>`; skupina, dopad a zložitosť sa prevedú na kódy (`H`, `V`,
    `ES`)."""
    d = _dict_z_textu(fmt.nalez(5, 'H', 'V', 'S', 'b', 'k', 'c', 'p', 'z', 'R85'))
    assert (d['bucket'], d['imp'], d['eff'], d['dec']) == ('H', 'V', 'ES', 'ROZHODNUTIE R85')


@pytest.mark.parametrize('pole, hodnota', [('skupina', 'X'), ('dopad', 'Q'), ('zlozitost', 'XL')])
def test_novy_nalez_odmietne_nepovolenu_volbu(pole, hodnota):
    """`nalez` odmietne skupinu, dopad aj zložitosť mimo povolených hodnôt: `ChybaVstupu` s názvom poľa."""
    argumenty = dict(skupina='P', dopad='S', zlozitost='M')
    argumenty[pole] = hodnota
    with pytest.raises(ChybaVstupu, match='pole %s' % pole):
        fmt.nalez(1, argumenty['skupina'], argumenty['dopad'], argumenty['zlozitost'], 'b', 'k', 'c', 'p', 'z')


@pytest.mark.parametrize('pr, zlucene, rucny', [('#345', False, 'caka'), (None, False, None), ('#7', True, None), ('#8', True, 'prešiel')])
def test_hotova_polozka_ma_len_zadane_polia(pr, zlucene, rucny):
    """Hotová položka (`hotove`) má len zadané polia: `pr` môže byť `None`, `rucny_test` sa nevypíše, keď nie je zadaný;
    text s apostrofom ostane presný."""
    d = _dict_z_textu(fmt.hotove(358, "K64's", pr, zlucene, rucny, "HOTOVÉ: it's | ok"))
    ocakavane = {'n': 358, 'vetva': "K64's", 'pr': pr, 'zlucene': zlucene, 'text': "HOTOVÉ: it's | ok"}
    if rucny is not None:
        ocakavane['rucny_test'] = rucny
    assert d == ocakavane


def test_riadok_tabulky_pr_je_trojica_textov():
    """Riadok tabuľky PR (`cast_pr`) je trojica textov (PR, vetva, text) zapísaná ako n-tica."""
    text = fmt.cast_pr('#345', 'K64', 'časť nálezu 358')
    assert ast.literal_eval(text.strip().rstrip(',')) == ('#345', 'K64', 'časť nálezu 358')


def test_zaznam_fronty_bez_a_s_cakanim_a_zavislostami():
    """Záznam fronty (`fronta`) má bez voliteľných polí len `n`, `davka`, `co`, `preco`; s `caka` a `po` ich vypíše ako n-ticu
    a zoznam."""
    jednoduchy = _dict_z_textu(fmt.fronta('358', 'K65', 'čo', 'JASNÉ prečo'))
    assert jednoduchy == {'n': '358', 'davka': 'K65', 'co': 'čo', 'preco': 'JASNÉ prečo'}
    plny = _dict_z_textu(fmt.fronta('358', 'K65', 'čo', 'NEJASNÉ prečo', ('majiteľ', "overiť 'x'"), ['380', 'OW-11']))
    assert plny['caka'] == ('majiteľ', "overiť 'x'") and plny['po'] == ['380', 'OW-11']


def test_rozhodnutie_s_odpovedou_a_bez_nej():
    """Rozhodnutie (`rozhodnutie`) sa vykreslí bez odpovede aj s odpoveďou a dátumom."""
    otazka = _dict_z_textu(fmt.rozhodnutie('R85', 'téma', 'otázka?', 'odporúčam', 'kedy'))
    assert otazka == {'id': 'R85', 'tema': 'téma', 'otazka': 'otázka?', 'odporucanie': 'odporúčam', 'kedy': 'kedy'}
    odpoved = _dict_z_textu(fmt.rozhodnutie('R85', 'téma', 'otázka?', 'odporúčam', 'kedy', "Majiteľ: áno, it's ok", '27. 11. 2026'))
    assert odpoved['odpoved'] == "Majiteľ: áno, it's ok" and odpoved['datum'] == '27. 11. 2026'


def test_zatvorene_a_zmena_denniku():
    """Zatvorený nález (`zatvorene`) a záznam v denníku zmien (`zmena`) sa vykreslia a vrátia do pôvodných hodnôt."""
    d = _dict_z_textu(fmt.zatvorene(359, 'R84', '27. 11. 2026', 'ZATVORENÉ rozhodnutím R84.'))
    assert d == {'n': 359, 'rozhodnutie': 'R84', 'datum': '27. 11. 2026', 'text': 'ZATVORENÉ rozhodnutím R84.'}
    zmena = ast.literal_eval(fmt.zmena('27. 11. 2026', "text 'x' \\ y").strip().rstrip(','))
    assert zmena == ('27. 11. 2026', "text 'x' \\ y")


def test_vsetky_zaznamy_su_odsadene_a_koncia_ciarkou_a_novym_riadkom():
    """Každý typ záznamu je odsadený o štyri medzery a končí čiarkou a zalomením; neobsahuje tabulátor ani návrat vozíka."""
    texty = [fmt.nalez(1, 'P', 'S', 'S', 'b', 'k', 'c', 'p', 'z'), fmt.hotove(1, 'K1', None, False, None, 'HOTOVÉ'),
             fmt.cast_pr('#1', 'K1', 't'), fmt.fronta('1', 'K1', 'c', 'JASNÉ'), fmt.rozhodnutie('R1', 't', 'o', 'od', 'k'),
             fmt.zatvorene(1, 'R1', 'd', 't'), fmt.zmena('d', 't')]
    for text in texty:
        assert text.startswith('    ') and text.endswith('),\n'), text
        assert '\t' not in text and '\r' not in text
