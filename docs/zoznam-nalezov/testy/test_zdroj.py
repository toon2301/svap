# -*- coding: utf-8 -*-
"""Testy `Zdroj` (presné úpravy zdrojového textu dátových modulov) na vymyslených zdrojoch, bez skutočných dát."""
import ast
import random

import pytest

from zapis_zdroj import ChybaZdroja, Zdroj

RIADKOVY = (
    '# -*- coding: utf-8 -*-\n'
    '"""Ľščťžýáíé: slovenský úvod."""\n'
    'ZOZNAM = [\n'
    "    dict(n=1, text='prvý 🙂'),\n"
    '    # komentár medzi prvkami\n'
    '    dict(n=2,\n'
    "         text='druhý ľščťž'),\n"
    "    dict(n=3, text='tretí'),\n"
    ']\n'
    'OSTATNE = 5\n'
)


def _cisla(zdroj, meno='ZOZNAM'):
    """Hodnoty kľúča `n` všetkých prvkov zoznamu `meno` v poradí, v akom sú v zdroji."""
    return [ast.literal_eval(Zdroj.kw(p, 'n').value) for p in zdroj.priradenie(meno).elts]


def _bez_riadkov(text, od, do):
    """Text bez riadkov [od, do) (číslované od 0): očakávaný výsledok odstránenia prvku, ktorý zaberá celé riadky."""
    riadky = text.splitlines(True)
    return ''.join(riadky[:od] + riadky[do:])


# ---------------------------------------------------------------- vyhľadanie
def test_priradenie_najde_hodnotu_a_neexistujuce_meno_vyhodi_chybu():
    """Priradenie na úrovni modulu sa nájde podľa mena (zoznam aj číslo); neexistujúce meno je `ChybaZdroja`."""
    z = Zdroj(RIADKOVY)
    assert isinstance(z.priradenie('ZOZNAM'), ast.List)
    assert ast.literal_eval(z.priradenie('OSTATNE')) == 5
    with pytest.raises(ChybaZdroja, match='NEEXISTUJE'):
        z.priradenie('NEEXISTUJE')


def test_neplatny_python_vyhodi_chybu_zdroja():
    """Zdroj, ktorý sa nedá rozparsovať (nezatvorená zátvorka), vyhodí `ChybaZdroja` s hláškou „neplatný Python“,
    nie surový `SyntaxError`."""
    with pytest.raises(ChybaZdroja, match='neplatný Python'):
        Zdroj('ZOZNAM = [\n', 'x.py')


def test_zoznamy_prvkov_vrati_len_zoznamy_na_urovni_modulu():
    """`zoznamy_prvkov` vráti len priradenia na úrovni modulu, ktorých hodnotou je zoznam (nie slovník, číslo ani zoznam vo
    funkcii)."""
    z = Zdroj('A = [1]\nB = 2\nC = [3, 4]\nD = {1: 2}\ndef f():\n    E = [5]\n')
    assert [meno for meno, _ in z.zoznamy_prvkov()] == ['A', 'C']


def test_najdi_dict_volanie_podla_kluca_a_volitelne_podla_zoznamu():
    """`najdi_dict_volanie` nájde prvé `dict(kluc=hodnota)` vo všetkých zoznamoch, s `zoznam=` len v tom jednom;
    neexistujúci prvok je `None`."""
    z = Zdroj("A = [dict(n=1, t='a')]\nB = [dict(n=1, t='b'), dict(n=2, t='c')]\n")
    uzol, index, volanie = z.najdi_dict_volanie('n', 1)
    assert Zdroj.hodnota_kw(volanie, 't') == 'a'  # prvý nález v poradí súborov
    uzol, index, volanie = z.najdi_dict_volanie('n', 1, zoznam='B')
    assert (index, Zdroj.hodnota_kw(volanie, 't')) == (0, 'b')
    uzol, index, volanie = z.najdi_dict_volanie('n', 2)
    assert index == 1
    assert z.najdi_dict_volanie('n', 3) is None
    assert z.najdi_dict_volanie('n', 2, zoznam='A') is None


def test_hodnota_kw_vrati_none_pre_chybajuce_a_neliteralne_hodnoty():
    """`hodnota_kw` vráti `None`, keď kľúč chýba alebo hodnota nie je literál (napr. premenná `P`)."""
    z = Zdroj("A = [dict(n=1, bucket=P)]\n")
    volanie = z.priradenie('A').elts[0]
    assert Zdroj.hodnota_kw(volanie, 'n') == 1
    assert Zdroj.hodnota_kw(volanie, 'bucket') is None  # premenná, nie literál
    assert Zdroj.hodnota_kw(volanie, 'chyba') is None


# ---------------------------------------------------------------- odstránenie prvku zoznamu
@pytest.mark.parametrize('index, od, do', [(0, 3, 4), (1, 5, 7), (2, 7, 8)])
def test_odstranenie_riadkoveho_prvku_zmaze_len_jeho_riadky(index, od, do):
    """Odstránenie prvku (aj viacriadkového) zmaže presne jeho riadky; komentár medzi prvkami a zvyšok modulu ostanú
    a pôvodný `Zdroj` sa nezmení."""
    z = Zdroj(RIADKOVY)
    novy = z.odstran_prvok_zoznamu(z.priradenie('ZOZNAM'), index)
    assert novy.text == _bez_riadkov(RIADKOVY, od, do)
    assert z.text == RIADKOVY  # pôvodný zdroj ostáva nemenný
    assert _cisla(novy) == [c for i, c in enumerate([1, 2, 3]) if i != index]
    assert 'komentár medzi prvkami' in novy.text and 'OSTATNE = 5' in novy.text


def test_odstranenie_posledneho_prvku_bez_koncovej_ciarky_necha_platny_zoznam():
    """Po odstránení posledného prvku bez koncovej čiarky ostane zoznam platný (čiarka predchádzajúceho prvku môže ostať)."""
    text = "ZOZNAM = [\n    dict(n=1, text='a'),\n    dict(n=2, text='b')\n]\n"
    z = Zdroj(text)
    novy = z.odstran_prvok_zoznamu(z.priradenie('ZOZNAM'), 1)
    assert novy.text == "ZOZNAM = [\n    dict(n=1, text='a'),\n]\n"
    novy = z.odstran_prvok_zoznamu(z.priradenie('ZOZNAM'), 0)
    assert novy.text == "ZOZNAM = [\n    dict(n=2, text='b')\n]\n"


def test_odstranenie_jedineho_prvku_necha_prazdny_zoznam_na_riadkoch():
    """Po odstránení jediného prvku ostane prázdny zoznam na riadkoch (`ZOZNAM = [` a `]`), nie `[]` na jednom riadku."""
    z = Zdroj("ZOZNAM = [\n    dict(n=1),\n]\n")
    novy = z.odstran_prvok_zoznamu(z.priradenie('ZOZNAM'), 0)
    assert novy.text == 'ZOZNAM = [\n]\n'
    assert novy.priradenie('ZOZNAM').elts == []


def test_odstranenie_prvku_za_dlhymi_riadkami_s_viacbajtovymi_znakmi_trafi_spravne_miesto():
    """Prvky za riadkami s diakritikou a emoji sa odstránia na správnom mieste: polohy z `ast` sú v bajtoch, nie v znakoch."""
    text = ("ZOZNAM = [\n"
            "    dict(n=1, text='ľščťžýáíéúôäň 🙂 ľščťžýáíéúôäň 🙂',\n"
            "         poznamka='ďalší 🙂 riadok'),\n"
            "    dict(n=2, text='ľščťž 🙂'), \n"
            "    dict(n=3, text='🙂🙂🙂'),\n"
            "]\n")
    z = Zdroj(text)
    for index, ostanu in ((0, [2, 3]), (1, [1, 3]), (2, [1, 2])):
        assert _cisla(z.odstran_prvok_zoznamu(z.priradenie('ZOZNAM'), index)) == ostanu


def test_prvok_s_komentarom_na_tom_istom_riadku_sa_neodstrani_a_vyhodi_chybu():
    """Prvok s komentárom za sebou na tom istom riadku sa neodstráni (komentár by osirel): `ChybaZdroja` „nezaberá celé
    riadky“."""
    z = Zdroj("ZOZNAM = [\n    dict(n=1),  # poznámka\n    dict(n=2),\n]\n")
    with pytest.raises(ChybaZdroja, match='nezaberá celé riadky'):
        z.odstran_prvok_zoznamu(z.priradenie('ZOZNAM'), 0)


def test_dva_prvky_na_jednom_riadku_prvy_sa_neodstrani_a_druhy_ano():
    """Z dvoch prvkov na jednom riadku sa prvý neodstráni (`ChybaZdroja`), druhý (posledný na riadku) áno."""
    z = Zdroj("ZOZNAM = [\n    dict(n=1), dict(n=2),\n    dict(n=3),\n]\n")
    uzol = z.priradenie('ZOZNAM')
    with pytest.raises(ChybaZdroja, match='nezaberá celé riadky'):
        z.odstran_prvok_zoznamu(uzol, 0)
    assert _cisla(z.odstran_prvok_zoznamu(uzol, 1)) == [1, 3]


def test_odstranenie_inline_prvkov_zachova_ciarky_a_viacbajtove_znaky():
    """Odstránenie prvkov z jednoriadkového zoznamu (`odstran_prvok_zoznamu`) zachová čiarky a viacbajtové znaky;
    po odstránení jediného prvku ostane `[]`."""
    z = Zdroj("A = ['á', 'ľ', '🙂']\n")
    uzol = z.priradenie('A')
    assert [z.odstran_prvok_zoznamu(uzol, i).text for i in range(3)] == [
        "A = ['ľ', '🙂']\n", "A = ['á', '🙂']\n", "A = ['á', 'ľ']\n"]
    assert Zdroj("A = ['á']\n").odstran_prvok_zoznamu(Zdroj("A = ['á']\n").priradenie('A'), 0).text == 'A = []\n'


def test_odstranenie_prvku_zo_zalomeneho_inline_zoznamu_ostane_platne():
    """`odstran_inline_prvok` nechá platný zoznam hodnôt aj pri zalomenom zozname (odstránenie prvku z prvého aj z druhého
    riadka)."""
    z = Zdroj("A = dict(polozky=['35', '36',\n                 '37'])\n")
    uzol = z.priradenie('A').keywords[0].value
    novy = z.odstran_inline_prvok(uzol, 1)
    assert ast.literal_eval(novy.priradenie('A').keywords[0].value) == ['35', '37']
    novy = z.odstran_inline_prvok(uzol, 2)
    assert ast.literal_eval(novy.priradenie('A').keywords[0].value) == ['35', '36']


def _nahodny_zoznam(rng):
    """Zoznam `dict(...)` v náhodnom rozložení riadkov; vráti (text, rozsahy riadkov prvkov [od, do))."""
    riadky = ['# -*- coding: utf-8 -*-\n', 'ZOZNAM = [\n']
    rozsahy = []
    pocet = rng.randint(1, 7)
    for i in range(pocet):
        if rng.random() < 0.3:
            riadky.append('    # komentár %d ľščťž 🙂\n' % i)
        od = len(riadky)
        hodnota = rng.choice(["'ľščťž 🙂'", "'obyčajný'", '"it\'s"', "'a|b'", "'x\\\\y'"])
        dalsie = rng.randint(0, 3)
        posledny = i == pocet - 1
        ciarka = '' if posledny and rng.random() < 0.5 else ','
        if dalsie == 0:
            riadky.append('    dict(n=%d, text=%s)%s\n' % (i, hodnota, ciarka))
        else:
            riadky.append('    dict(n=%d, text=%s,\n' % (i, hodnota))
            for j in range(dalsie - 1):
                riadky.append('         k%d=%s,\n' % (j, hodnota))
            riadky.append('         koniec=%d)%s\n' % (i, ciarka))
        rozsahy.append((od, len(riadky)))
    riadky += [']\n', 'OSTATNE = 1\n']
    return ''.join(riadky), rozsahy


def test_nahodne_rozlozenie_riadkov_odstranenie_vzdy_zmaze_presne_jeden_prvok():
    """Na 300 náhodných rozloženiach riadkov (komentáre, viacriadkové prvky, chýbajúca koncová čiarka, apostrofy, viacbajtové
    znaky) odstránenie vždy zmaže presne riadky jedného prvku a zvyšok modulu ostane."""
    rng = random.Random(20261126)
    for _ in range(300):
        text, rozsahy = _nahodny_zoznam(rng)
        z = Zdroj(text)
        index = rng.randrange(len(rozsahy))
        novy = z.odstran_prvok_zoznamu(z.priradenie('ZOZNAM'), index)
        od, do = rozsahy[index]
        assert novy.text == _bez_riadkov(text, od, do), text
        assert _cisla(novy) == [i for i in range(len(rozsahy)) if i != index]
        assert 'OSTATNE = 1' in novy.text


# ---------------------------------------------------------------- vloženie
def test_vlozenie_na_koniec_zoznamu_pred_zatvorku():
    """Vloženie na koniec zoznamu ide tesne pred zatvárajúcu zátvorku; ostatný text ostane bajt po bajte."""
    z = Zdroj(RIADKOVY)
    novy = z.vloz_na_koniec_zoznamu(z.priradenie('ZOZNAM'), "    dict(n=4, text='štvrtý'),\n")
    assert _cisla(novy) == [1, 2, 3, 4]
    assert novy.text == RIADKOVY.replace("]\nOSTATNE", "    dict(n=4, text='štvrtý'),\n]\nOSTATNE")


def test_vlozenie_na_koniec_dopise_chybajucu_ciarku_za_poslednym_prvkom():
    """Vloženie na koniec doplní chýbajúcu čiarku za posledným existujúcim prvkom."""
    z = Zdroj("ZOZNAM = [\n    dict(n=1)\n]\n")
    novy = z.vloz_na_koniec_zoznamu(z.priradenie('ZOZNAM'), '    dict(n=2),')
    assert novy.text == 'ZOZNAM = [\n    dict(n=1),\n    dict(n=2),\n]\n'


def test_vlozenie_do_prazdneho_zoznamu_na_riadkoch():
    """Do prázdneho zoznamu na riadkoch (`[` a `]` pod sebou) sa nový prvok vloží na vlastný riadok."""
    z = Zdroj('ZOZNAM = [\n]\n')
    novy = z.vloz_na_koniec_zoznamu(z.priradenie('ZOZNAM'), '    dict(n=1),\n')
    assert novy.text == 'ZOZNAM = [\n    dict(n=1),\n]\n'


def test_vlozenie_na_koniec_odmietne_zoznam_so_zatvorkou_na_riadku_s_prvkom():
    """Zoznam so zatvárajúcou zátvorkou na riadku s prvkom (`[dict(n=1)]`) sa na koniec nedopĺňa: `ChybaZdroja`
    „na vlastnom riadku“."""
    z = Zdroj('ZOZNAM = [dict(n=1)]\n')
    with pytest.raises(ChybaZdroja, match='na vlastnom riadku'):
        z.vloz_na_koniec_zoznamu(z.priradenie('ZOZNAM'), '    dict(n=2),\n')


def test_vlozenie_pred_prvok_a_za_zaciatok_zoznamu():
    """`vloz_pred_prvok` vloží prvok pred daný (komentár nad ním ostane nad vloženým prvkom) a `vloz_za_zaciatok_zoznamu`
    ho vloží ako prvý."""
    z = Zdroj(RIADKOVY)
    uzol = z.priradenie('ZOZNAM')
    pred = z.vloz_pred_prvok(uzol, 1, '    dict(n=9),\n')
    assert _cisla(pred) == [1, 9, 2, 3]
    assert pred.text.index('komentár medzi prvkami') < pred.text.index('n=9')  # komentár ostal nad vloženým prvkom
    zaciatok = z.vloz_za_zaciatok_zoznamu(uzol, '    dict(n=0),\n')
    assert _cisla(zaciatok) == [0, 1, 2, 3]


def test_vlozenie_pred_inline_prvok_a_za_zatvorku_s_textom_vyhodi_chybu():
    """Vloženie pred prvok, ktorý nezačína riadok, a za začiatok zoznamu s textom na tom istom riadku je `ChybaZdroja`
    (formát by sa nedal zachovať)."""
    z = Zdroj('A = [dict(n=1), dict(n=2)]\n')
    with pytest.raises(ChybaZdroja, match='nezačína riadok'):
        z.vloz_pred_prvok(z.priradenie('A'), 1, '    dict(n=0),\n')
    with pytest.raises(ChybaZdroja, match='na tom istom riadku'):
        z.vloz_za_zaciatok_zoznamu(z.priradenie('A'), '    dict(n=0),\n')


def test_vlozenie_neplatneho_textu_vyhodi_chybu_a_zdroj_ostane_nezmeneny():
    """Vložený text, po ktorom by modul nebol platný Python, je `ChybaZdroja` a pôvodný `Zdroj` ostane nezmenený."""
    z = Zdroj('ZOZNAM = [\n]\n')
    with pytest.raises(ChybaZdroja, match='neplatný Python'):
        z.vloz_na_koniec_zoznamu(z.priradenie('ZOZNAM'), '    dict(n=,\n')
    assert z.text == 'ZOZNAM = [\n]\n'


def test_riadky_prvku_vrati_cele_riadky_a_odmietne_inline_prvok():
    """`riadky_prvku` vráti celé riadky prvku (aj viacriadkového) a odmietne prvok, ktorý nezaberá celé riadky."""
    z = Zdroj(RIADKOVY)
    assert z.riadky_prvku(z.priradenie('ZOZNAM'), 1) == "    dict(n=2,\n         text='druhý ľščťž'),\n"
    inline = Zdroj('A = [dict(n=1), dict(n=2)]\n')
    with pytest.raises(ChybaZdroja, match='nezaberá celé riadky'):
        inline.riadky_prvku(inline.priradenie('A'), 1)


# ---------------------------------------------------------------- kľúčové slová
VOLANIA = (
    'FRONTA = [\n'
    "    dict(n='1', davka='K1',\n"
    "         co='ľščťž',\n"
    "         preco='JASNÉ'),\n"
    "    dict(n='2', davka='K2', co='y', preco='JASNÉ'),\n"
    ']\n'
)


def _volanie(zdroj, i):
    """Volanie `dict(...)` na pozícii `i` v zozname `FRONTA` zdroja."""
    return zdroj.priradenie('FRONTA').elts[i]


def test_nastavenie_existujuceho_kluca_zmeni_len_jeho_hodnotu():
    """`nastav_kw` na existujúci kľúč zmení len jeho hodnotu; zvyšok textu ostane bajt po bajte."""
    z = Zdroj(VOLANIA)
    novy = z.nastav_kw(_volanie(z, 0), 'davka', "'K9'")
    assert novy.text == VOLANIA.replace("davka='K1'", "davka='K9'")


def test_pridanie_noveho_kluca_do_viacriadkoveho_volania_ide_na_vlastny_odsadeny_riadok():
    """Nový kľúč sa do viacriadkového volania pridá na vlastný riadok s odsadením ostatných kľúčov, za posledný kľúč."""
    z = Zdroj(VOLANIA)
    novy = z.nastav_kw(_volanie(z, 0), 'po', "['5']")
    assert novy.text == VOLANIA.replace("preco='JASNÉ'),\n    dict(n='2'", "preco='JASNÉ',\n         po=['5']),\n    dict(n='2'")
    assert Zdroj.hodnota_kw(_volanie(novy, 0), 'po') == ['5']


def test_pridanie_noveho_kluca_do_jednoriadkoveho_volania_ide_za_posledny_kluc():
    """Nový kľúč sa do jednoriadkového volania pridá za posledný kľúč na tom istom riadku."""
    z = Zdroj(VOLANIA)
    novy = z.nastav_kw(_volanie(z, 1), 'po', "['5']")
    assert "preco='JASNÉ', po=['5']),\n" in novy.text
    assert Zdroj.hodnota_kw(_volanie(novy, 1), 'po') == ['5']


@pytest.mark.parametrize('index', [0, 1])
def test_pridanie_a_odstranenie_kluca_vrati_povodny_text_bajt_po_bajte(index):
    """Pridanie kľúča a jeho odstránenie vráti pôvodný text bajt po bajte (viacriadkové aj jednoriadkové volanie)."""
    z = Zdroj(VOLANIA)
    s_klucom = z.nastav_kw(_volanie(z, index), 'caka', "('majiteľ', 'overiť')")
    assert s_klucom.text != VOLANIA
    assert s_klucom.odstran_kw(_volanie(s_klucom, index), 'caka').text == VOLANIA


def test_odstranenie_stredneho_kluca_ostatne_ostanu_nedotknute():
    """Odstránenie kľúča uprostred volania (`davka`) zachová ostatné kľúče aj ich poradie."""
    z = Zdroj(VOLANIA)
    novy = z.odstran_kw(_volanie(z, 1), 'davka')
    assert novy.text == VOLANIA.replace("davka='K2', ", '')
    assert [k.arg for k in _volanie(novy, 1).keywords] == ['n', 'co', 'preco']


def test_odstranenie_prveho_a_neexistujuceho_kluca_vyhodi_chybu():
    """Prvý kľúč (`n`) sa odstrániť nedá (`ChybaZdroja` „prvé kľúčové slovo“) a neexistujúci kľúč je tiež chyba („sa nenašlo“)."""
    z = Zdroj(VOLANIA)
    with pytest.raises(ChybaZdroja, match='prvé kľúčové slovo'):
        z.odstran_kw(_volanie(z, 0), 'n')
    with pytest.raises(ChybaZdroja, match='sa nenašlo'):
        z.odstran_kw(_volanie(z, 0), 'caka')


def test_nastavenie_kluca_volaniu_bez_klucovych_slov_vyhodi_chybu():
    """Pridanie kľúča do volania bez kľúčových slov (`dict()`) je `ChybaZdroja` „nemá kľúčové slová“."""
    z = Zdroj('A = [dict()]\n')
    with pytest.raises(ChybaZdroja, match='nemá kľúčové slová'):
        z.nastav_kw(z.priradenie('A').elts[0], 'n', '1')


# ---------------------------------------------------------------- pripojenie k reťazcu
def _hodnota(zdroj, meno='X', kluc='text'):
    """Hodnota kľúča `kluc` prvého prvku zoznamu `meno` ako Python hodnota."""
    return Zdroj.hodnota_kw(zdroj.priradenie(meno).elts[0], kluc)


def test_pripojenie_kusku_k_jednoriadkovemu_retazcu_prida_riadok_pod_prvy_literal():
    """Kúsok pripojený k jednoriadkovému reťazcu ide na nový riadok presne pod začiatok prvého literálu;
    výsledná hodnota je pôvodný text a kúsok."""
    z = Zdroj("X = [\n    dict(n=1, text='HOTOVÉ.'),\n]\n")
    uzol = Zdroj.kw(z.priradenie('X').elts[0], 'text').value
    novy = z.pridaj_kusok_retazca(uzol, 'ZLÚČENÉ (PR #5).')
    odsadenie = ' ' * len("    dict(n=1, text=")  # pokračovanie je presne pod začiatkom prvého literálu
    assert novy.text == "X = [\n    dict(n=1, text='HOTOVÉ.'\n" + odsadenie + "' ZLÚČENÉ (PR #5).'),\n]\n"
    assert _hodnota(novy) == 'HOTOVÉ. ZLÚČENÉ (PR #5).'


def test_pripojenie_kusku_k_viacriadkovemu_retazcu_zachova_odsadenie_pokracovania():
    """Kúsok pripojený k viacriadkovému reťazcu zachová odsadenie pokračovacích riadkov."""
    text = "X = [\n    dict(n=1,\n         text='HOTOVÉ prvá časť '\n              'druhá časť.'),\n]\n"
    z = Zdroj(text)
    uzol = Zdroj.kw(z.priradenie('X').elts[0], 'text').value
    novy = z.pridaj_kusok_retazca(uzol, 'ZLÚČENÉ.')
    assert novy.text == text.replace("'druhá časť.'),", "'druhá časť.'\n              ' ZLÚČENÉ.'),")
    assert _hodnota(novy) == 'HOTOVÉ prvá časť druhá časť. ZLÚČENÉ.'


def test_pripojenie_kusku_s_apostrofom_a_obratenou_lomkou_ostane_platne():
    """Kúsok s apostrofom, obrátenou lomkou a zvislítkom (pripravený cez `kus_na_pripojenie`) ostane po pripojení platný
    a zachová presný text."""
    from zapis_format import kus_na_pripojenie
    z = Zdroj("X = [\n    dict(n=1, text='HOTOVÉ.'),\n]\n")
    uzol = Zdroj.kw(z.priradenie('X').elts[0], 'text').value
    novy = z.pridaj_kusok_retazca(uzol, kus_na_pripojenie("test: it's a\\b | c"))
    assert _hodnota(novy) == "HOTOVÉ. test: it's a\\b | c"


def test_pripojenie_kusku_k_hodnote_ktora_nie_je_retazec_vyhodi_chybu():
    """Hodnota, ktorá nie je reťazec (`text=5`), sa nepredlžuje: `ChybaZdroja` „nie je reťazec“."""
    z = Zdroj('X = [dict(n=1, text=5)]\n')
    with pytest.raises(ChybaZdroja, match='nie je reťazec'):
        z.pridaj_kusok_retazca(Zdroj.kw(z.priradenie('X').elts[0], 'text').value, 'a')


# ---------------------------------------------------------------- nálezy bota (PR 345): komentáre a úvodzovky
def test_vlozenie_na_koniec_ignoruje_ciarku_v_komentari_za_poslednym_prvkom():
    """Nález bota (PR 345): čiarka v komentári za posledným prvkom nie je oddeľovač; vloženie na koniec doplní skutočnú čiarku
    pred komentár."""
    z = Zdroj('X = [\n    dict(n=1)  # poznámka, pokračovanie\n]\n')
    novy = z.vloz_na_koniec_zoznamu(z.priradenie('X'), '    dict(n=2),\n')
    assert novy.text == 'X = [\n    dict(n=1),  # poznámka, pokračovanie\n    dict(n=2),\n]\n'
    assert _cisla(novy, 'X') == [1, 2]


def test_vlozenie_na_koniec_dopise_ciarku_aj_ked_komentar_je_na_dalsom_riadku():
    """Čiarka v komentári na ďalšom riadku pod posledným prvkom sa tiež ignoruje: chýbajúca čiarka sa doplní za prvok."""
    z = Zdroj('X = [\n    dict(n=1)\n    # komentár, s čiarkou\n]\n')
    novy = z.vloz_na_koniec_zoznamu(z.priradenie('X'), '    dict(n=2),\n')
    assert novy.text == 'X = [\n    dict(n=1),\n    # komentár, s čiarkou\n    dict(n=2),\n]\n'


def test_vlozenie_na_koniec_nepridava_druhu_ciarku_ked_oddelovac_uz_je_a_komentar_ma_dalsiu():
    """Ak oddeľovač za posledným prvkom už je a komentár obsahuje ďalšiu čiarku, druhá čiarka sa nepridá."""
    z = Zdroj('X = [\n    dict(n=1),  # a, b\n]\n')
    novy = z.vloz_na_koniec_zoznamu(z.priradenie('X'), '    dict(n=2),\n')
    assert novy.text == 'X = [\n    dict(n=1),  # a, b\n    dict(n=2),\n]\n'


def test_pripojenie_kusku_k_viacriadkovemu_retazcu_v_dvojitych_uvodzovkach():
    """Nález bota (PR 345): pri pokračovaní reťazca v dvojitých úvodzovkách sa odsadenie berie z druhého riadka,
    nie z hľadania apostrofu."""
    text = 'X = [\n    dict(n=1,\n         text="prvá časť it\'s "\n              "druhá časť"),\n]\n'
    z = Zdroj(text)
    uzol = Zdroj.kw(z.priradenie('X').elts[0], 'text').value
    novy = z.pridaj_kusok_retazca(uzol, 'ZLÚČENÉ.')
    assert novy.text == text.replace('"druhá časť"),', '"druhá časť"\n              \' ZLÚČENÉ.\'),')
    assert _hodnota(novy) == "prvá časť it's druhá časť ZLÚČENÉ."


def test_pripojenie_kusku_zachova_odsadenie_tabulatormi_a_nehlada_uvodzovku_v_texte():
    """Odsadenie tabulátormi sa zachová a úvodzovka vo vnútri textu (`"b ' c"`) odsadenie neovplyvní."""
    text = "X = [\n\tdict(n=1,\n\t     text='a'\n\t\t\t\"b ' c\"),\n]\n"
    z = Zdroj(text)
    uzol = Zdroj.kw(z.priradenie('X').elts[0], 'text').value
    novy = z.pridaj_kusok_retazca(uzol, 'd')
    assert novy.text.splitlines()[-2] == "\t\t\t' d'),"
    assert _hodnota(novy) == "ab ' c d"


def test_pripojenie_kusku_k_jednoriadkovemu_retazcu_odsadi_podla_znakov_nie_bajtov():
    """Pri jednoriadkovom reťazci za znakmi s diakritikou (`ľščťž`) sa odsadenie počíta v znakoch, nie v bajtoch,
    takže pokračovanie sedí pod začiatkom literálu."""
    text = "X = [\n    dict(a='ľščťž', text='HOTOVÉ.'),\n]\n"
    z = Zdroj(text)
    uzol = Zdroj.kw(z.priradenie('X').elts[0], 'text').value
    novy = z.pridaj_kusok_retazca(uzol, 'ZLÚČENÉ.')
    prvy_riadok = text.splitlines()[1]
    odsadenie = len(novy.text.splitlines()[2]) - len(novy.text.splitlines()[2].lstrip(' '))
    assert odsadenie == prvy_riadok.index("'HOTOVÉ.'")
