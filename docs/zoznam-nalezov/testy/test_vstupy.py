# -*- coding: utf-8 -*-
"""Testy chybných vstupov skriptu `zapis.py`: každá chyba má vysvetlenie pre agenta, návratový kód 2 a nič sa nezmení.

Druhá polovica súboru vyskúša nezmyselné typy hodnôt v každom poli (zoznam, slovník, číslo, bool, prázdny a obrovský text):
skript nesmie spadnúť s neočakávanou výnimkou, len odmietnuť vstup alebo ho platne spracovať.
"""
import copy

import pytest

import fronta
import model
import stav
import zapis_data
import zapis_operacie as op
from conftest import ZDROJ
from pomocky import otazka_pre_majitela
from zapis_format import ChybaVstupu
from zapis_zdroj import ChybaZdroja


def _zakladne_udaje():
    """Údaje zo skutočných dát (iba na čítanie): balíky, otvorené nálezy, fronta a rozhodnutia."""
    m = model.zostav_model()
    return {'baliky': model.PORADIE_BALIKOV, 'otvorene': sorted(int(i) for i in m.otvorene_id if i.isdigit()),
            'fronta': [z['n'] for z in fronta.FRONTA], 'hotove': [d['n'] for d in stav.DONE_SINCE],
            'zodpovedane': [d['id'] for d in stav.DECISIONS if d.get('odpoved')],
            'nezodpovedane': [d['id'] for d in stav.DECISIONS if not d.get('odpoved')]}


_Z = _zakladne_udaje()
NEZODPOVEDANE = '<id nezodpovedaného rozhodnutia>'  # zástupný text: test zapíše vlastnú otázku a dosadí jej `R<n>` (`_dosad_otazku`)


def _dosad_otazku(kopia, vstup):
    """Ak vstup obsahuje zástupný text, zapíše do kópie vlastnú nezodpovedanú otázku a dosadí jej `R<n>`; testy tak nezávisia od toho,
    či majiteľ v živých dátach nejaké rozhodnutie ešte nezodpovedal."""
    if NEZODPOVEDANE not in vstup.values():
        return vstup
    identifikator = otazka_pre_majitela(kopia)
    return {k: (identifikator if v == NEZODPOVEDANE else v) for k, v in vstup.items()}


def _novy(**zmeny):
    """Platný vstup príkazu `novy` pre skupinu P (prvý balík podľa skutočných dát); `zmeny` prepíšu jednotlivé polia."""
    v = {'skupina': 'P', 'dopad': 'S', 'zlozitost': 'M', 'balik': _Z['baliky']['P'][0], 'kratko': 'krátko', 'co': 'Čo.',
         'poznamka': 'JASNÉ.', 'zdroj': 'test'}
    v.update(zmeny)
    return v


def _hotove(**zmeny):
    """Platný vstup príkazu `hotove` pre prvý otvorený nález (vetva K64, PR #345, čaká na zlúčenie); `zmeny` prepíšu polia."""
    v = {'n': _Z['otvorene'][0], 'vetva': 'K64', 'pr': '#345', 'zlucene': False, 'rucny_test': 'caka', 'text': 'HOTOVÉ test.'}
    v.update(zmeny)
    return v


def _zatvor(**zmeny):
    """Platný vstup príkazu `zatvor` (prvý otvorený nález a posledné zodpovedané rozhodnutie); `zmeny` prepíšu polia."""
    v = {'n': _Z['otvorene'][0], 'rozhodnutie': _Z['zodpovedane'][-1], 'datum': '27. 11. 2026', 'text': 'ZATVORENÉ test.'}
    v.update(zmeny)
    return v


def _volny_mimo_fronty(vynechaj=()):
    """Číslo (ako text) prvého otvoreného nálezu, ktorý nie je vo fronte ani medzi vynechanými (`vynechaj`)."""
    return str(next(n for n in _Z['otvorene'] if str(n) not in _Z['fronta'] and str(n) not in vynechaj))


def _pridaj(**zmeny):
    """Platný vstup príkazu `fronta pridaj` pre nález mimo fronty (dávka K65); `zmeny` prepíšu jednotlivé polia."""
    v = {'n': _volny_mimo_fronty(), 'davka': 'K65', 'co': 'Práca.', 'preco': 'JASNÉ prečo.'}
    v.update(zmeny)
    return v


def _rozhodnutie(**zmeny):
    """Platný vstup príkazu `rozhodnutie` bez odpovede (téma, otázka, odporúčanie, kedy); `zmeny` prepíšu polia."""
    v = {'tema': 'téma', 'otazka': 'otázka?', 'odporucanie': 'odporúčam', 'kedy': 'kedy'}
    v.update(zmeny)
    return v


def _bez(vstup, *kluce):
    """Kópia vstupu bez zadaných kľúčov (na vyskúšanie chýbajúceho povinného poľa)."""
    return {k: v for k, v in vstup.items() if k not in kluce}


def _zlyha(kopia, argumenty, ocakavane, kod=2):
    """Spustí `zapis.py` s `argumentmi` a overí, že skončí návratovým kódom `kod` a vysvetlením s textom `ocakavane`,
    bez `Traceback` a bez zmeny súborov."""
    pred = kopia.snimka()
    navrat, vystup = kopia.zapis(*argumenty)
    assert navrat == kod, vystup
    assert ocakavane in vystup, vystup
    assert 'Traceback' not in vystup
    assert kopia.snimka() == pred, 'po chybe sa zmenil súbor'


_FRONTA = {'davka': 'K65', 'co': 'Práca.', 'preco': 'JASNÉ prečo.'}
_INY_BALIK = next((b for b in _Z['baliky']['A'] if b not in _Z['baliky']['P']), 'Iný balík, ktorý v skupine P nie je')

# (popis, vstup, očakávaný text chyby)
PRIPADY_NOVY = [
    ('chýba pole co', _bez(_novy(), 'co'), 'chýbajú polia: co'),
    ('chýbajú dve polia', _bez(_novy(), 'co', 'zdroj'), 'chýbajú polia: co, zdroj'),
    ('preklep v názve poľa', dict(_novy(), zdrojj='x'), 'neznáme polia: zdrojj'),
    ('skupina X', _novy(skupina='X'), 'pole skupina'),
    ('dopad Q', _novy(dopad='Q'), 'pole dopad'),
    ('zlozitost XL', _novy(zlozitost='XL'), 'pole zlozitost'),
    ('balík neexistuje', _novy(balik='Neexistujúci balík'), 'balík'),
    ('balík z inej skupiny', _novy(balik=_INY_BALIK), 'nie je v skupine P'),
    ('prázdne kratko', _novy(kratko='  \n '), 'pole kratko je prázdne'),
    ('dlhé kratko', _novy(kratko='x' * 201), 'pole kratko má 201 znakov (najviac 200)'),
    ('co nie je text', _novy(co=5), 'pole co musí byť text'),
    ('riadiaci znak v poznámke', _novy(poznamka='a\x00b'), 'riadiace znaky'),
    ('neznáme rozhodnutie', _novy(rozhodnutie='R99999'), 'neexistuje'),
    ('rozhodnutie nie je text', _novy(rozhodnutie=5), 'neexistuje'),
    ('fronta nie je objekt', _novy(fronta=[1]), 'pole fronta musí byť objekt'),
    ('fronta s číslom nálezu', _novy(fronta=dict(_FRONTA, n='5')), 'nepíš n'),
    ('fronta bez preco', _novy(fronta=_bez(_FRONTA, 'preco')), 'chýbajú polia: preco'),
    ('preco bez JASNÉ alebo NEJASNÉ', _novy(fronta=dict(_FRONTA, preco='asi')), 'JASNÉ alebo NEJASNÉ'),
    ('poradie 0', _novy(fronta=dict(_FRONTA, poradie=0)), 'pole poradie musí byť číslo od 1 do'),
    ('poradie za koncom', _novy(fronta=dict(_FRONTA, poradie=999)), 'pole poradie musí byť číslo od 1 do'),
    ('poradie true', _novy(fronta=dict(_FRONTA, poradie=True)), 'pole poradie musí byť číslo od 1 do'),
    ('závislosť na neznámom ID', _novy(fronta=dict(_FRONTA, po=['ZZZ'])), "`po` odkazuje na neznáme ID 'ZZZ'"),
    ('závislosť nie je zoznam', _novy(fronta=dict(_FRONTA, po='380')), 'pole po musí byť zoznam'),
    ('čakanie nie je dvojica', _novy(fronta=dict(_FRONTA, caka='majiteľ')), 'pole caka musí byť dvojica'),
    ('čakanie na neznámeho', _novy(fronta=dict(_FRONTA, caka=['niekto', 'x'])), 'poradie fronty by porušilo pravidlá'),
]

PRIPADY_HOTOVE = [
    ('chýba text', _bez(_hotove(), 'text'), 'chýbajú polia: text'),
    ('n ako text', _hotove(n=str(_Z['otvorene'][0])), 'celé číslo'),
    ('n true', _hotove(n=True), 'celé číslo'),
    ('n desatinné', _hotove(n=3.5), 'celé číslo'),
    ('n z registra', _hotove(n='OW-11'), 'register ID sa zatvára ručne'),
    ('n neexistuje', _hotove(n=99999), 'nie je otvorený'),
    ('n je už hotový', _hotove(n=_Z['hotove'][0]), 'nie je otvorený'),
    ('text bez HOTOVÉ', _hotove(text='Opravené.'), 'musí začínať slovom HOTOVÉ'),
    ('zlucene nie je bool', _hotove(zlucene='áno'), 'true alebo false'),
    ('zlucene ako číslo', _hotove(zlucene=1), 'true alebo false'),
    ('neznámy ručný test', _hotove(rucny_test='asi'), 'rucny_test'),
    ('dlhá vetva', _hotove(vetva='K' * 61), 'najviac 60'),
    ('dlhé pr', _hotove(pr='#' * 21), 'najviac 20'),
    ('cast_pr nie je zoznam', _hotove(cast_pr='x'), 'pole cast_pr musí byť zoznam'),
    ('cast_pr bez textu', _hotove(cast_pr=[{'pr': '#1', 'vetva': 'K1'}]), 'chýbajú polia: text'),
    ('cast_pr položka nie je objekt', _hotove(cast_pr=['x']), 'vstup musí byť JSON objekt'),
    ('neznáme pole', dict(_hotove(), vetvaa='K1'), 'neznáme polia: vetvaa'),
]

PRIPADY_ZATVOR = [
    ('chýba dátum', _bez(_zatvor(), 'datum'), 'chýbajú polia: datum'),
    ('n nie je otvorený', _zatvor(n=_Z['hotove'][0]), 'nie je otvorený'),
    ('neznáme rozhodnutie', _zatvor(rozhodnutie='R99999'), 'neexistuje alebo nemá odpoveď'),
    ('rozhodnutie bez odpovede', _zatvor(rozhodnutie=NEZODPOVEDANE), 'neexistuje alebo nemá odpoveď'),
    ('rozhodnutie nie je text', _zatvor(rozhodnutie=['R1']), 'neexistuje alebo nemá odpoveď'),
    ('text bez ZATVORENÉ', _zatvor(text='Zatvorené.'), 'musí začínať slovom ZATVORENÉ'),
    ('prázdny dátum', _zatvor(datum=' '), 'pole datum je prázdne'),
    ('n z registra', _zatvor(n='OW-11'), 'register ID sa zatvára ručne'),
]

PRIPADY_ROZHODNUTIE = [
    ('chýba téma', _bez(_rozhodnutie(), 'tema'), 'chýbajú polia: tema'),
    ('odpoveď bez dátumu', _rozhodnutie(odpoved='áno'), 'odpoved a datum sa vypĺňajú spolu'),
    ('dátum bez odpovede', _rozhodnutie(datum='1. 1. 2027'), 'odpoved a datum sa vypĺňajú spolu'),
    ('neznáme pole', _rozhodnutie(poznamka='x'), 'neznáme polia: poznamka'),
    ('otázka nie je text', _rozhodnutie(otazka=[1]), 'pole otazka musí byť text'),
]

PRIPADY_ODPOVED = [
    ('neexistujúce rozhodnutie', {'id': 'R99999', 'odpoved': 'áno', 'datum': '1. 1. 2027'}, 'neexistuje (R1 až R'),
    ('id nie je text', {'id': 5, 'odpoved': 'áno', 'datum': '1. 1. 2027'}, 'neexistuje (R1 až R'),
    ('rozhodnutie už má odpoveď', {'id': _Z['zodpovedane'][0], 'odpoved': 'áno', 'datum': '1. 1. 2027'}, 'už má odpoveď'),
    ('chýba dátum', {'id': NEZODPOVEDANE, 'odpoved': 'áno'}, 'chýbajú polia: datum'),
    ('chýba odpoveď', {'id': NEZODPOVEDANE, 'datum': '1. 1. 2027'}, 'chýbajú polia: odpoved'),
    ('okrem odpovede aj téma', {'id': NEZODPOVEDANE, 'tema': 'x', 'odpoved': 'áno', 'datum': '1. 1. 2027'}, 'neznáme polia: tema'),
    ('prázdna odpoveď', {'id': NEZODPOVEDANE, 'odpoved': '  ', 'datum': '1. 1. 2027'}, 'pole odpoved je prázdne'),
    ('dlhý dátum', {'id': NEZODPOVEDANE, 'odpoved': 'áno', 'datum': 'd' * 41}, 'najviac 40'),
]

PRIPADY_ZMENA = [
    ('chýba text', {'datum': '1. 1. 2027'}, 'chýbajú polia: text'),
    ('kod nie je text', {'datum': '1. 1. 2027', 'text': 'x', 'kod': 5}, 'pole kod musí byť text'),
    ('prázdny dátum', {'datum': '', 'text': 'x'}, 'pole datum je prázdne'),
    ('dlhý dátum', {'datum': 'd' * 41, 'text': 'x'}, 'najviac 40'),
]

PRIPADY_PRIDAJ = [
    ('n nie je text', _pridaj(n=5), 'pole n musí byť text'),
    ('n už vo fronte', _pridaj(n=_Z['fronta'][0]), 'už vo fronte je'),
    ('n je hotový', _pridaj(n=str(_Z['hotove'][0])), 'nie je otvorený nález'),
    ('n neexistuje', _pridaj(n='99999'), 'nie je otvorený nález'),
    ('chýba davka', _bez(_pridaj(), 'davka'), 'chýbajú polia: davka'),
    ('preco bez JASNÉ', _pridaj(preco='dobrá práca'), 'JASNÉ alebo NEJASNÉ'),
    ('poradie desatinné', _pridaj(poradie=1.5), 'pole poradie musí byť číslo od 1 do'),
    ('po nie je zoznam textov', _pridaj(po=[380]), 'pole po musí byť zoznam ID'),
    ('závislosť sama od seba', _pridaj(po=[_pridaj()['n']]), 'závisí samo od seba'),
    ('závislosť otvorená mimo fronty', _pridaj(po=[_volny_mimo_fronty(vynechaj=(_pridaj()['n'],))]), 'nie je vo fronte skôr'),
    ('caka s tromi prvkami', _pridaj(caka=['majiteľ', 'a', 'b']), 'pole caka musí byť dvojica'),
]


def _parametre(pripady):
    """Prevedie prípady (popis, vstup, očakávaný text chyby) na parametre pytestu; popis slúži ako identifikátor."""
    return [pytest.param(vstup, ocakavane, id=popis) for popis, vstup, ocakavane in pripady]


@pytest.mark.parametrize('vstup, ocakavane', _parametre(PRIPADY_NOVY))
def test_novy_odmietne_neplatny_vstup(kopia, vstup, ocakavane):
    """`novy` odmietne neplatný vstup (chýbajúce alebo neznáme polia, nepovolené voľby, zlé typy, chyby vo `fronta`):
    kód 2, vysvetlenie a žiadna zmena súborov."""
    _zlyha(kopia, ['novy', '--json', kopia.json('v.json', vstup)], ocakavane)


@pytest.mark.parametrize('vstup, ocakavane', _parametre(PRIPADY_HOTOVE))
def test_hotove_odmietne_neplatny_vstup(kopia, vstup, ocakavane):
    """`hotove` odmietne neplatný vstup (číslo nálezu, text bez „HOTOVÉ“, typ `zlucene`, `rucny_test`, `cast_pr`, dĺžky polí):
    kód 2, vysvetlenie a žiadna zmena súborov."""
    _zlyha(kopia, ['hotove', '--json', kopia.json('v.json', vstup)], ocakavane)


@pytest.mark.parametrize('vstup, ocakavane', _parametre(PRIPADY_ZATVOR))
def test_zatvor_odmietne_neplatny_vstup(kopia, vstup, ocakavane):
    """`zatvor` odmietne neplatný vstup (nález nie je otvorený, rozhodnutie neexistuje alebo nemá odpoveď, text bez „ZATVORENÉ“,
    prázdny dátum): kód 2, vysvetlenie a žiadna zmena súborov."""
    _zlyha(kopia, ['zatvor', '--json', kopia.json('v.json', _dosad_otazku(kopia, vstup))], ocakavane)


@pytest.mark.parametrize('vstup, ocakavane', _parametre(PRIPADY_ROZHODNUTIE))
def test_rozhodnutie_odmietne_neplatny_vstup(kopia, vstup, ocakavane):
    """`rozhodnutie` odmietne neplatný vstup (chýbajúce pole, odpoveď bez dátumu a opačne, neznáme pole, netextová otázka):
    kód 2, vysvetlenie a žiadna zmena súborov."""
    _zlyha(kopia, ['rozhodnutie', '--json', kopia.json('v.json', vstup)], ocakavane)


@pytest.mark.parametrize('vstup, ocakavane', _parametre(PRIPADY_ODPOVED))
def test_odpoved_na_rozhodnutie_odmietne_neplatny_vstup(kopia, vstup, ocakavane):
    """Odpoveď na existujúce rozhodnutie (pole `id`) odmietne neexistujúce `id`, už zodpovedané rozhodnutie, chýbajúce alebo
    cudzie
    polia, prázdnu odpoveď a príliš dlhý dátum: kód 2 a žiadna zmena súborov."""
    _zlyha(kopia, ['rozhodnutie', '--json', kopia.json('v.json', _dosad_otazku(kopia, vstup))], ocakavane)


@pytest.mark.parametrize('vstup, ocakavane', _parametre(PRIPADY_ZMENA))
def test_zmena_odmietne_neplatny_vstup(kopia, vstup, ocakavane):
    """`zmena` odmietne neplatný vstup (chýba text, `kod` nie je text, prázdny alebo príliš dlhý dátum): kód 2 a žiadna zmena
    súborov."""
    _zlyha(kopia, ['zmena', '--json', kopia.json('v.json', vstup)], ocakavane)


@pytest.mark.parametrize('vstup, ocakavane', _parametre(PRIPADY_PRIDAJ))
def test_fronta_pridaj_odmietne_neplatny_vstup(kopia, vstup, ocakavane):
    """`fronta pridaj` odmietne neplatný vstup (nález už vo fronte, hotový alebo neexistujúci, `preco` bez JASNÉ alebo NEJASNÉ,
    zlé poradie, závislosti, `caka`): kód 2 a žiadna zmena súborov."""
    _zlyha(kopia, ['fronta', 'pridaj', '--json', kopia.json('v.json', vstup)], ocakavane)


# ---------------------------------------------------------------- argumenty príkazového riadka
def test_zlucenie_a_rucny_test_bez_zodpovedajucej_polozky_su_chyba(kopia):
    """`zlucene` bez hotovej položky vetvy a `rucny-test` bez zlúčenej položky sú chyba s vysvetlením."""
    _zlyha(kopia, ['zlucene', '--vetva', 'K99'], 'nemá žiadnu hotovú položku, ktorá čaká na zlúčenie')
    _zlyha(kopia, ['rucny-test', '--vetva', 'K99', '--vysledok', 'prešiel', '--datum', '1. 1. 2027'],
           'nemá zlúčenú položku, ktorá čaká na ručný test')


def test_zlucenie_s_neplatnymi_doplnkami_je_chyba(kopia):
    """`zlucene` odmietne príliš dlhé `--pr`, prázdny `--cas` a riadiace znaky v `--merge`."""
    n = int(_volny_mimo_fronty())
    kod, vystup = kopia.zapis('hotove', '--json', kopia.json('h.json', _hotove(n=n)))
    assert kod == 0, vystup
    _zlyha(kopia, ['zlucene', '--vetva', 'K64', '--pr', 'x' * 21], 'najviac 20')
    _zlyha(kopia, ['zlucene', '--vetva', 'K64', '--cas', ' '], 'je prázdne')
    _zlyha(kopia, ['zlucene', '--vetva', 'K64', '--merge', 'a\x01b'], 'riadiace znaky')


def test_ruzny_test_s_neplatnym_vysledkom_odmietne_uz_argparse(kopia):
    """`rucny-test` s výsledkom mimo „prešiel“ a „neprešiel“ odmietne už `argparse` (kód 2)."""
    kod, vystup = kopia.zapis('rucny-test', '--vetva', 'K64', '--vysledok', 'asi', '--datum', '1. 1. 2027')
    assert kod == 2 and 'invalid choice' in vystup


@pytest.mark.parametrize('argumenty', [[], ['neznamy'], ['novy'], ['fronta'], ['fronta', 'presun', '1'], ['zlucene'],
                                       ['fronta', 'presun', '1', '--na', 'x']])
def test_chybajuce_alebo_neplatne_argumenty_dostanu_navod_a_kod_2(kopia, argumenty):
    """Chýbajúce alebo neplatné argumenty príkazového riadka dostanú návod („usage“) a kód 2; nič sa nezmení."""
    pred = kopia.snimka()
    kod, vystup = kopia.zapis(*argumenty)
    assert kod == 2 and 'usage:' in vystup
    assert kopia.snimka() == pred


def test_napoveda_funguje_pre_skript_aj_podprikazy(kopia):
    """`--help` funguje pre skript aj pre podpríkazy (kód 0 a „usage“)."""
    for argumenty in (['--help'], ['novy', '--help'], ['fronta', '--help'], ['fronta', 'caka', '--help'], ['rucny-test', '--help']):
        kod, vystup = kopia.zapis(*argumenty)
        assert kod == 0 and 'usage:' in vystup, argumenty


def test_fronta_prikazy_odmietnu_neznamy_nalez_a_neplatne_hodnoty(kopia):
    """Príkazy `fronta` odmietnu neznámy nález, poradie mimo rozsah, neplatné „kto“, prázdny text, `volne` bez čakania a neplatné
    alebo samoodkazujúce závislosti (aj číslo v nekanonickom tvare)."""
    n = _Z['fronta'][0]
    pocet = len(_Z['fronta'])
    _zlyha(kopia, ['fronta', 'odstran', '99999'], '99999 nie je vo fronte')
    _zlyha(kopia, ['fronta', 'presun', '99999', '--na', '1'], 'nie je vo fronte')
    _zlyha(kopia, ['fronta', 'presun', n, '--na', '0'], 'poradie musí byť číslo od 1 do %d' % pocet)
    _zlyha(kopia, ['fronta', 'presun', n, '--na', str(pocet + 1)], 'poradie musí byť číslo od 1 do')
    _zlyha(kopia, ['fronta', 'caka', '99999', '--kto', 'majiteľ', '--text', 'x'], 'nie je vo fronte')
    _zlyha(kopia, ['fronta', 'caka', n, '--kto', 'niekto', '--text', 'x'], 'kto musí byť jedno z')
    _zlyha(kopia, ['fronta', 'caka', n, '--kto', 'majiteľ', '--text', '  '], 'pole text je prázdne')
    _zlyha(kopia, ['fronta', 'volne', n], 'nečaká (nemá pole caka)')
    _zlyha(kopia, ['fronta', 'volne', '99999'], 'nie je vo fronte')
    _zlyha(kopia, ['fronta', 'po', '99999', '--po', n], 'nie je vo fronte')
    _zlyha(kopia, ['fronta', 'po', n, '--po', 'ZZZ'], "`po` odkazuje na neznáme ID 'ZZZ'")
    _zlyha(kopia, ['fronta', 'po', n, '--po', '0%s' % _Z['fronta'][1]], "`po` odkazuje na neznáme ID '0")  # nekanonický tvar čísla
    _zlyha(kopia, ['fronta', 'po', n, '--po', n], 'závisí samo od seba')


def test_poradie_fronty_nesmie_porusit_zavislosti(kopia):
    """Presun alebo závislosť, ktorá by dala závislosť za závislú položku, je odmietnutá („nie je vo fronte skôr“)."""
    prva, _druha, tretia = _Z['fronta'][:3]
    kod, vystup = kopia.zapis('fronta', 'po', tretia, '--po', prva)
    assert kod == 0, vystup
    _zlyha(kopia, ['fronta', 'presun', tretia, '--na', '1'], 'nie je vo fronte skôr')  # pred svoju závislosť
    _zlyha(kopia, ['fronta', 'po', prva, '--po', tretia], 'nie je vo fronte skôr')  # závislosť na neskoršej položke
    _zlyha(kopia, ['fronta', 'presun', prva, '--na', '5'], 'nie je vo fronte skôr')  # závislosť za závislou položkou


def test_odstranenie_zavislosti_z_fronty_zlyha_a_vrati_vsetko(kopia):
    """Odstránenie záznamu, na ktorý iná položka čaká a ktorý je ešte otvorený, zlyhá až v kontrole modelu (kód 1) a všetko sa
    vráti."""
    prva, druha = _Z['fronta'][:2]
    kod, vystup = kopia.zapis('fronta', 'po', druha, '--po', prva)
    assert kod == 0, vystup
    pred = kopia.snimka()
    kod, vystup = kopia.zapis('fronta', 'odstran', prva)  # závislosť by ostala otvorená a mimo fronty
    assert kod == 1 and 'závislosť %s je ešte otvorená' % prva in vystup
    assert kopia.snimka() == pred


# ---------------------------------------------------------------- JSON súbor
def test_neexistujuci_a_poskodeny_json_su_chyba_vstupu(kopia):
    """Neexistujúci, poškodený a binárny JSON aj priečinok namiesto súboru sú chyba vstupu („vstupný JSON sa nepodarilo
    načítať“)."""
    _zlyha(kopia, ['novy', '--json', str(kopia.koren / 'neexistuje.json')], 'vstupný JSON sa nepodarilo načítať')
    (kopia.koren / 'zly.json').write_text('{"skupina": ', encoding='utf-8')
    _zlyha(kopia, ['novy', '--json', str(kopia.koren / 'zly.json')], 'vstupný JSON sa nepodarilo načítať')
    (kopia.koren / 'binarny.json').write_bytes(b'\xff\xfe\x00\x80')
    _zlyha(kopia, ['novy', '--json', str(kopia.koren / 'binarny.json')], 'vstupný JSON sa nepodarilo načítať')
    _zlyha(kopia, ['novy', '--json', str(kopia.koren)], 'vstupný JSON sa nepodarilo načítať')  # priečinok namiesto súboru


@pytest.mark.parametrize('obsah', ['[]', '"text"', '"id"', '5', 'null', 'true', '0', '1.5'])
@pytest.mark.parametrize('prikaz', [['novy'], ['hotove'], ['zatvor'], ['zmena'], ['rozhodnutie'], ['fronta', 'pridaj']],
                         ids=['novy', 'hotove', 'zatvor', 'zmena', 'rozhodnutie', 'fronta_pridaj'])
def test_json_ktory_nie_je_objekt_je_chyba_vstupu_pre_kazdy_prikaz(kopia, prikaz, obsah):
    """JSON, ktorý nie je objekt (zoznam, text, číslo, `null`, `true`), je pri každom príkaze s `--json` chyba „vstup musí byť
    JSON objekt“ (kód 2), nie neočakávaná výnimka (nález bota, PR 345)."""
    (kopia.koren / 'v.json').write_text(obsah, encoding='utf-8')
    _zlyha(kopia, [*prikaz, '--json', str(kopia.koren / 'v.json')], 'vstup musí byť JSON objekt')


def test_hodnota_null_je_ako_vynechane_pole(kopia):
    """Hodnota `null` pri voliteľnom poli je ako vynechané pole; pri povinnom poli je to chyba „chýbajú polia“."""
    kod, vystup = kopia.zapis('--na-sucho', 'novy', '--json', kopia.json('v.json', _novy(rozhodnutie=None, fronta=None)))
    assert kod == 0, vystup
    _zlyha(kopia, ['novy', '--json', kopia.json('w.json', _novy(co=None))], 'chýbajú polia: co')


def test_skript_odmietne_pracu_nad_datami_so_syntaktickou_chybou(kopia):
    """Dátový súbor so syntaktickou chybou skript odmietne s vysvetlením (kód 2, bez `Traceback`) a nič nezmení."""
    stav_py = kopia.priecinok / 'stav.py'
    stav_py.write_text(stav_py.read_text(encoding='utf-8') + '\nNEPLATNE = (\n', encoding='utf-8')
    pred = kopia.snimka()
    kod, vystup = kopia.zapis('stav')
    assert kod == 2 and 'sa nepodarilo načítať' in vystup and 'Traceback' not in vystup
    assert kopia.snimka() == pred


def test_skript_odmietne_pracu_nad_datami_ktore_model_neprijme(kopia):
    """Dáta, ktoré model neprijme (pokazená fronta), skript odmietne hneď na začiatku („Dáta zoznamu sú už teraz neplatné“, kód 2)
    a nič nezmení."""
    import re
    fronta_py = kopia.priecinok / 'fronta.py'
    text = fronta_py.read_text(encoding='utf-8')
    pokazene = re.sub(r"preco='(NE)?JASNÉ", "preco='ZLE", text, count=1)
    assert pokazene != text
    fronta_py.write_text(pokazene, encoding='utf-8')
    pred = kopia.snimka()
    kod, vystup = kopia.zapis('stav')
    assert kod == 2 and 'Dáta zoznamu sú už teraz neplatné' in vystup
    assert kopia.snimka() == pred


# ---------------------------------------------------------------- nezmyselné typy hodnôt (v pamäti, nič sa nezapisuje)
ODDNE = [True, False, 0, 5, 3.5, [], ['a'], {}, {'a': 1}, '', '   ', 'x' * 30000, '\x00', [None]]
TEXTY = ['', ' ', 'abc', "'", '\\', '"', '🙂', 'x' * 30000, '\x00', '\n', "it's", '{x}', '%s', '1; 2', '-1']


@pytest.fixture(scope='module')
def kontext0():
    """Fixture: kontext zo skutočných dát načítaný raz na modul; operácie ho nemenia (každý pokus dostane kópiu cez
    `_kontext`)."""
    return op.nacitaj_kontext()


def _kontext(k0):
    """Kópia meniteľných častí kontextu (`otvorene_id`, `fronta`, `hotove`, rozhodnutia), aby pokusy neovplyvňovali jeden
    druhý."""
    k = copy.copy(k0)
    k.otvorene_id = set(k0.otvorene_id)
    k.fronta = [dict(z) for z in k0.fronta]
    k.hotove = [dict(d) for d in k0.hotove]
    k.rozhodnutia = set(k0.rozhodnutia)
    k.rozhodnutia_s_odpovedou = set(k0.rozhodnutia_s_odpovedou)
    return k


def _vyskusaj(funkcia, k0, *argumenty):
    """Operácia nad vstupom smie skončiť len `ChybaVstupu` alebo `ChybaZdroja` (vysvetlenie pre agenta); inú výnimku test nepustí."""
    try:
        funkcia(zapis_data.Dataset(ZDROJ), _kontext(k0), *argumenty)
    except (ChybaVstupu, ChybaZdroja):
        pass


def _kazde_pole(vstup):
    """Generuje kópie vstupu, v ktorých je postupne každé pole nahradené každou nezmyselnou hodnotou z `ODDNE`."""
    for pole in vstup:
        for hodnota in ODDNE:
            yield dict(vstup, **{pole: hodnota})


def test_novy_nezmyselne_hodnoty_poli_nikdy_neskoncia_neosetrenou_vynimkou(kontext0):
    """Nezmyselné hodnoty (číslo, `bool`, zoznam, slovník, prázdny alebo obrovský text, riadiaci znak) v každom poli `novy` aj vo
    vnorenej `fronta` skončia len `ChybaVstupu` alebo `ChybaZdroja`, nikdy inou výnimkou."""
    fronta_vstup = {'davka': 'K65', 'co': 'x', 'preco': 'JASNÉ y', 'poradie': 1, 'po': ['380'], 'caka': ['majiteľ', 'x']}
    vstup = _novy(rozhodnutie='R84', fronta=fronta_vstup)
    for v in _kazde_pole(vstup):
        _vyskusaj(op.novy, kontext0, v)
    for v in _kazde_pole(fronta_vstup):
        _vyskusaj(op.novy, kontext0, dict(vstup, fronta=v))


def test_hotove_nezmyselne_hodnoty_poli_nikdy_neskoncia_neosetrenou_vynimkou(kontext0):
    """Nezmyselné hodnoty v každom poli `hotove` aj v položke `cast_pr` skončia len `ChybaVstupu` alebo `ChybaZdroja`."""
    cast = {'pr': '#1', 'vetva': 'K1', 'text': 't'}
    vstup = _hotove(cast_pr=[cast])
    for v in _kazde_pole(vstup):
        _vyskusaj(op.hotove, kontext0, v)
    for v in _kazde_pole(cast):
        _vyskusaj(op.hotove, kontext0, dict(vstup, cast_pr=[v]))


@pytest.mark.parametrize('funkcia, vstup', [
    (op.zatvor, _zatvor()),
    (op.rozhodnutie, _rozhodnutie(odpoved='áno', datum='1. 1. 2027')),
    (op.zmena, {'datum': '1. 1. 2027', 'text': 'x', 'kod': 'y'}),
    (op.fronta_pridaj, _pridaj(po=['380'], caka=['Codex', 'x'])),
], ids=['zatvor', 'rozhodnutie', 'zmena', 'fronta_pridaj'])
def test_ostatne_prikazy_s_nezmyselnymi_hodnotami_poli_nikdy_neskoncia_neosetrenou_vynimkou(kontext0, funkcia, vstup):
    """Nezmyselné hodnoty v každom poli príkazov `zatvor`, `rozhodnutie`, `zmena` a `fronta pridaj` skončia len `ChybaVstupu`
    alebo `ChybaZdroja`."""
    for v in _kazde_pole(vstup):
        _vyskusaj(funkcia, kontext0, v)


def test_odpoved_na_rozhodnutie_nezmyselne_hodnoty_poli_nikdy_neskoncia_neosetrenou_vynimkou(kontext0):
    """Nezmyselné hodnoty v poliach odpovede na rozhodnutie (`id`, `odpoved`, `datum`) skončia len `ChybaVstupu` alebo
    `ChybaZdroja`;
    otázka sa pred každým pokusom zapíše v pamäti."""
    otazka = _rozhodnutie()
    vstup = {'id': 'R%d' % (kontext0.n_rozhodnuti + 1), 'odpoved': 'áno', 'datum': '1. 1. 2027'}  # vlastná otázka sa zapíše v pamäti
    for v in _kazde_pole(vstup):
        ds, ctx = zapis_data.Dataset(ZDROJ), _kontext(kontext0)
        op.rozhodnutie(ds, ctx, otazka)
        try:
            op.rozhodnutie(ds, ctx, v)
        except (ChybaVstupu, ChybaZdroja):
            pass


def test_prikazy_s_neobycajnymi_textami_z_prikazoveho_riadka_nikdy_neskoncia_neosetrenou_vynimkou(kontext0):
    """Príkazy s argumentmi z príkazového riadka (`fronta`, `zlucene`, `rucny-test`) s neobyčajnými textami (prázdny, apostrof,
    lomka, emoji, obrovský text, riadiaci znak) a nezmyselnými číslami skončia len `ChybaVstupu` alebo `ChybaZdroja`."""
    n = _Z['fronta'][0]
    for text in TEXTY:
        _vyskusaj(op.fronta_odstran, kontext0, text)
        _vyskusaj(op.fronta_presun, kontext0, text, 1)
        _vyskusaj(op.fronta_caka, kontext0, text, 'majiteľ', 'x')
        _vyskusaj(op.fronta_caka, kontext0, n, text, 'x')
        _vyskusaj(op.fronta_caka, kontext0, n, 'majiteľ', text)
        _vyskusaj(op.fronta_volne, kontext0, text)
        _vyskusaj(op.fronta_po, kontext0, text, [n])
        _vyskusaj(op.fronta_po, kontext0, n, [text])
        _vyskusaj(op.zlucene, kontext0, text, None, None, None)
        _vyskusaj(op.zlucene, kontext0, text, text, text, text)
        _vyskusaj(op.rucny_test, kontext0, text, 'prešiel', text, text)
    for cislo in (-1, 0, 10 ** 12, True):
        _vyskusaj(op.fronta_presun, kontext0, n, cislo)
