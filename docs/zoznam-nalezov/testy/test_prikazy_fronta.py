# -*- coding: utf-8 -*-
"""Testy príkazov skriptu `zapis.py` na kópii skutočných dát: fronta prác, hlavička a denník zmien a suchý beh (`--na-sucho`)."""
import pytest

from conftest import suhrn
from pomocky import NEBEZPECNY_TEXT, hotove_vstup, nalez_mimo_fronty, novy_vstup, ok, pridaj_vstup, rozhodnutie_vstup, volny_nalez


def test_fronta_pridaj_vlozi_na_zadane_poradie_a_bez_poradia_na_koniec(kopia):
    """`fronta pridaj` vloží záznam na zadané poradie (aj za koniec fronty) a bez poradia na koniec; dáta ostanú platné."""
    u = kopia.udaje()
    a, b, c = nalez_mimo_fronty(u, 3)
    ok(kopia, 'fronta', 'pridaj', '--json', kopia.json('a.json', pridaj_vstup(a, poradie=1)))
    ok(kopia, 'fronta', 'pridaj', '--json', kopia.json('b.json', pridaj_vstup(b)))
    ok(kopia, 'fronta', 'pridaj', '--json', kopia.json('c.json', pridaj_vstup(c, poradie=len(u['fronta']) + 3)))
    assert kopia.udaje()['fronta'] == [str(a)] + u['fronta'] + [str(b), str(c)]
    assert kopia.build_check()[0] == 0


def test_fronta_odstran_vyberie_zaznam_a_nalez_ostane_otvoreny(kopia):
    """`fronta odstran` vyberie záznam z fronty; nález ostáva otvorený (zoznam otvorených nálezov sa nezmení)."""
    u = kopia.udaje()
    n = u['fronta'][2]
    ok(kopia, 'fronta', 'odstran', n)
    nove = kopia.udaje()
    assert nove['fronta'] == [i for i in u['fronta'] if i != n]
    assert nove['otvorene_vsetky'] == u['otvorene_vsetky']


@pytest.mark.parametrize('odkial, kam', [(0, 3), (3, 1), (5, 5), (2, 16)])
def test_fronta_presun_zmeni_poradie_a_ostatne_ostane(kopia, odkial, kam):
    """`fronta presun` presunie záznam na nové poradie (od 1, aj na koniec) a poradie ostatných ostane; ak je fronta v dátach
    kratšia, než parameter vyžaduje, test sa preskočí."""
    u = kopia.udaje()
    if len(u['fronta']) < max(odkial + 1, kam):
        pytest.skip('fronta je kratšia než test vyžaduje')
    n = u['fronta'][odkial]
    ok(kopia, 'fronta', 'presun', n, '--na', kam)
    ocakavane = [i for i in u['fronta'] if i != n]
    ocakavane.insert(kam - 1, n)
    assert kopia.udaje()['fronta'] == ocakavane
    assert kopia.build_check()[0] == 0


def test_fronta_presun_zachova_text_zaznamu_bajt_po_bajte(kopia):
    """Presunutý záznam fronty má po presune nezmenené hodnoty všetkých polí."""
    u = kopia.udaje()
    n = u['fronta'][1]
    pred = kopia.vyhodnot('[z for z in fronta.FRONTA if z["n"] == "%s"][0]' % n)
    ok(kopia, 'fronta', 'presun', n, '--na', 4)
    assert kopia.vyhodnot('[z for z in fronta.FRONTA if z["n"] == "%s"][0]' % n) == pred


def test_fronta_caka_a_volne_vratia_subor_do_povodneho_stavu_bajt_po_bajte(kopia):
    """`fronta caka` zapíše čakanie (aj s apostrofom a zvislítkom) a `fronta volne` ho odstráni tak, že `fronta.py` je znova
    rovnaký
    bajt po bajte; platí pre dva rôzne záznamy."""
    u = kopia.udaje()
    pred = kopia.text('fronta.py')
    for n in (u['fronta'][0], u['fronta'][3]):
        vystup = ok(kopia, 'fronta', 'caka', n, '--kto', 'majiteľ', '--text', "overiť na produkcii: it's | ok")
        assert '%s čaká na majiteľa' % n in vystup
        assert kopia.vyhodnot('[z for z in fronta.FRONTA if z["n"] == "%s"][0]["caka"]' % n) == ['majiteľ', "overiť na produkcii: it's | ok"]
        assert kopia.text('fronta.py') != pred
        assert '%s je opäť voľný' % n in ok(kopia, 'fronta', 'volne', n)
        assert kopia.text('fronta.py') == pred


def test_fronta_caka_pre_codexa_a_zmena_textu_cakania(kopia):
    """`fronta caka` nastaví čakanie na Codexa (viditeľné vo `stav`) a opakovaný príkaz čakanie prepíše (kto aj text) bez
    duplicity."""
    n = kopia.udaje()['fronta'][0]
    ok(kopia, 'fronta', 'caka', n, '--kto', 'Codex', '--text', 'upraviť E2E')
    assert 'čaká na Codexa: upraviť E2E' in ok(kopia, 'stav')
    ok(kopia, 'fronta', 'caka', n, '--kto', 'majiteľ', '--text', 'schváliť vzhľad')
    assert kopia.vyhodnot('[z for z in fronta.FRONTA if z["n"] == "%s"][0]["caka"]' % n) == ['majiteľ', 'schváliť vzhľad']
    assert kopia.text('fronta.py').count("'schváliť vzhľad'") == 1


def test_fronta_po_nastavi_a_zrusi_zavislosti_bajt_po_bajte(kopia):
    """`fronta po` nastaví závislosť (vo `stav` sa objaví „čaká na dokončenie“); tá istá s nadbytočnými medzerami je „Bez zmeny“
    a prázdne `--po` ju zruší tak, že je `fronta.py` rovnaký bajt po bajte."""
    u = kopia.udaje()
    prva, druha = u['fronta'][:2]
    pred = kopia.text('fronta.py')
    ok(kopia, 'fronta', 'po', druha, '--po', prva)
    assert kopia.vyhodnot('[z for z in fronta.FRONTA if z["n"] == "%s"][0]["po"]' % druha) == [prva]
    assert 'čaká na dokončenie: %s' % prva in ok(kopia, 'stav')
    zapisane = kopia.snimka()
    vystup = ok(kopia, 'fronta', 'po', druha, '--po', '%s, %s' % (prva, ' '))  # tá istá závislosť s nadbytočnými medzerami
    assert 'Bez zmeny' in vystup and kopia.snimka() == zapisane
    ok(kopia, 'fronta', 'po', druha, '--po', '')
    assert kopia.text('fronta.py') == pred


def test_fronta_po_viac_zavislosti_a_kombinacia_s_cakanim(kopia):
    """Viac závislostí v `--po` sa zapíše ako zoznam a dá sa skombinovať s `caka`; `volne` potom odstráni kľúč `caka`;
    dáta ostanú platné."""
    u = kopia.udaje()
    a, b, c = u['fronta'][:3]
    ok(kopia, 'fronta', 'po', c, '--po', '%s,%s' % (a, b))
    ok(kopia, 'fronta', 'caka', c, '--kto', 'majiteľ', '--text', 'schváliť')
    z = kopia.vyhodnot('[z for z in fronta.FRONTA if z["n"] == "%s"][0]' % c)
    assert z['po'] == [a, b] and z['caka'] == ['majiteľ', 'schváliť']
    ok(kopia, 'fronta', 'volne', c)
    assert 'caka' not in kopia.vyhodnot('[z for z in fronta.FRONTA if z["n"] == "%s"][0]' % c)
    assert kopia.build_check()[0] == 0


# ---------------------------------------------------------------- zmena (hlavička a denník)
def test_zmena_zapise_datum_stav_kodu_a_novy_zaznam_na_zaciatok_dennika(kopia):
    """`zmena` zapíše dátum a stav kódu hlavičky a nový záznam na začiatok denníka (nebezpečné znaky v texte ostanú);
    doterajší prvý záznam je potom druhý."""
    pred = kopia.vyhodnot('[stav.STAV["datum"], stav.STAV["kod"], len(stav.ZMENY), stav.ZMENY[0][0]]')
    ok(kopia, 'zmena', '--json', kopia.json('z.json', {'datum': '27. 11. 2026', 'kod': '`main` `abcd1234` (po PR #345)', 'text': NEBEZPECNY_TEXT}))
    po = kopia.vyhodnot('[stav.STAV["datum"], stav.STAV["kod"], len(stav.ZMENY), stav.ZMENY[0][0], stav.ZMENY[0][1], stav.ZMENY[1][0]]')
    assert po[:2] == ['27. 11. 2026', '`main` `abcd1234` (po PR #345)'] and po[2] == pred[2] + 1
    assert po[3:] == ['27. 11. 2026', NEBEZPECNY_TEXT, pred[3]]
    assert kopia.build_check()[0] == 0


def test_zmena_bez_stavu_kodu_ponecha_povodny_stav_kodu(kopia):
    """`zmena` bez poľa `kod` ponechá pôvodný stav kódu v hlavičke."""
    kod = kopia.vyhodnot('stav.STAV["kod"]')
    ok(kopia, 'zmena', '--json', kopia.json('z.json', {'datum': '27. 11. 2026', 'text': 'Len denník.'}))
    assert kopia.vyhodnot('stav.STAV["kod"]') == kod


def test_dve_zmeny_za_sebou_su_v_dienniku_najnovsia_hore(kopia):
    """Pri dvoch `zmena` za sebou je v denníku najnovší záznam hore."""
    ok(kopia, 'zmena', '--json', kopia.json('a.json', {'datum': '27. 11. 2026', 'text': 'prvá'}))
    ok(kopia, 'zmena', '--json', kopia.json('b.json', {'datum': '28. 11. 2026', 'text': 'druhá'}))
    assert kopia.vyhodnot('[stav.ZMENY[0][1], stav.ZMENY[1][1]]') == ['druhá', 'prvá']


# ---------------------------------------------------------------- suchý beh
@pytest.mark.parametrize('prikaz', ['novy', 'hotove', 'zatvor', 'rozhodnutie', 'zmena', 'fronta-caka', 'fronta-presun', 'zlucene-bez-hotoveho'])
def test_suchy_beh_nezmeni_ziadny_subor_a_ohlasi_zmenene_subory(kopia, prikaz):
    """Suchý beh (`--na-sucho`) každého príkazu nezmení žiadny súbor a ohlási zmenené súbory; `zlucene` vetvy bez hotovej položky
    skončí chybou (kód 2) a tiež nič nezmení."""
    u = kopia.udaje()
    n = volny_nalez(u)
    pred = kopia.snimka()
    if prikaz == 'novy':
        argumenty = ['novy', '--json', kopia.json('v.json', novy_vstup(u))]
    elif prikaz == 'hotove':
        argumenty = ['hotove', '--json', kopia.json('v.json', hotove_vstup(n))]
    elif prikaz == 'zatvor':
        argumenty = ['zatvor', '--json', kopia.json('v.json', {'n': n, 'rozhodnutie': 'R84', 'datum': '27. 11. 2026', 'text': 'ZATVORENÉ rozhodnutím R84.'})]
    elif prikaz == 'rozhodnutie':
        argumenty = ['rozhodnutie', '--json', kopia.json('v.json', rozhodnutie_vstup())]
    elif prikaz == 'zmena':
        argumenty = ['zmena', '--json', kopia.json('v.json', {'datum': '27. 11. 2026', 'text': 'x'})]
    elif prikaz == 'fronta-caka':
        argumenty = ['fronta', 'caka', u['fronta'][0], '--kto', 'majiteľ', '--text', 'x']
    elif prikaz == 'fronta-presun':
        argumenty = ['fronta', 'presun', u['fronta'][0], '--na', 3]
    else:
        kod, vystup = kopia.zapis('--na-sucho', 'zlucene', '--vetva', 'K99')
        assert kod == 2 and kopia.snimka() == pred
        return
    kod, vystup = kopia.zapis('--na-sucho', *argumenty)
    assert kod == 0, vystup
    assert 'NA SUCHO (nič sa nezapísalo): Zmenené súbory:' in vystup
    assert kopia.snimka() == pred


def test_suchy_beh_vypise_rovnaky_sumar_ako_ostry_zapis(kopia):
    """Súhrn zo suchého behu je rovnaký ako súhrn ostrého zápisu toho istého vstupu."""
    u = kopia.udaje()
    n = volny_nalez(u)
    vstup = kopia.json('v.json', hotove_vstup(n))
    sucho = suhrn(ok(kopia, '--na-sucho', 'hotove', '--json', vstup))
    ostro = suhrn(ok(kopia, 'hotove', '--json', vstup))
    assert sucho == ostro


def test_zapis_ktory_nic_nemeni_je_v_poriadku_a_nic_nezapise(kopia):
    """Príkaz, ktorý by nič nezmenil (presun na to isté poradie, zrušenie neexistujúcich závislostí, rovnaké čakanie s inými
    medzerami), skončí „Bez zmeny“ a nezapíše nič."""
    u = kopia.udaje()
    n = u['fronta'][2]
    pred = kopia.snimka()
    assert 'Bez zmeny' in ok(kopia, 'fronta', 'presun', n, '--na', 3)  # záznam už na tom poradí je
    assert 'Bez zmeny' in ok(kopia, 'fronta', 'po', n, '--po', '')  # nemal žiadne závislosti
    assert kopia.snimka() == pred
    ok(kopia, 'fronta', 'caka', n, '--kto', 'majiteľ', '--text', 'overiť')
    zapisane = kopia.snimka()
    assert 'Bez zmeny' in ok(kopia, 'fronta', 'caka', n, '--kto', 'majiteľ', '--text', '  overiť  ')
    assert kopia.snimka() == zapisane
