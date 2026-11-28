# -*- coding: utf-8 -*-
"""Testy príkazov skriptu `zapis.py` na kópii skutočných dát: stav, nový nález, hotové, zlúčenie, ručný test, rozhodnutie a zatvorenie.

Fronta, hlavička a suchý beh sú v `test_prikazy_fronta.py`, chybné vstupy v `test_vstupy.py`, vrátenie zmien v `test_transakcia.py`
a celé scenáre v `test_celok.py` a `test_postupnost.py`.
"""
import pytest

from conftest import suhrn
from pomocky import (NEBEZPECNY_TEXT, build, hotove_vstup, nalez_mimo_fronty, nalez_vo_fronte_a_vlne, nezodpovedane_rozhodnutie_v_stav_py,
                     novy_vstup, ok, pridaj_vstup, rozhodnutie_vstup, volny_nalez)


# ---------------------------------------------------------------- stav
def test_stav_vypise_prehlad_a_nic_nezmeni(kopia):
    """`stav` vypíše prehľad (ďalšie voľné číslo nálezu a rozhodnutia, čo vybaviť, frontu a prvú voľnú položku)
    a nezmení ani jeden súbor."""
    u = kopia.udaje()
    pred = kopia.snimka()
    vystup = ok(kopia, 'stav')
    assert 'Ďalšie voľné: nález č. %d, rozhodnutie R%d' % (u['posledne'] + 1, len(u['rozhodnutia']) + 1) in vystup
    assert 'NAJPRV VYBAV' in vystup and 'FRONTA (%d položiek)' % len(u['fronta']) in vystup
    assert 'prvá voľná: č. %s' % u['fronta'][0] in vystup
    assert kopia.snimka() == pred


def test_stav_ukaze_cakanie_na_majitela_a_ako_prva_volna_dalsiu_polozku(kopia):
    """Keď prvá položka fronty čaká na majiteľa, `stav` to uvedie a ako prvú voľnú ukáže druhú položku."""
    u = kopia.udaje()
    prvy, druhy = u['fronta'][:2]
    ok(kopia, 'fronta', 'caka', prvy, '--kto', 'majiteľ', '--text', 'schváliť vzhľad')
    vystup = ok(kopia, 'stav')
    assert '1. č. %s čaká na majiteľa: schváliť vzhľad' % prvy in vystup
    assert 'prvá voľná: č. %s' % druhy in vystup


def test_stav_navrhne_dalsie_cislo_davky_podla_kariet_hotovych_vetiev_a_fronty(kopia):
    """Číslo ďalšej dávky navrhnuté v `stav` rastie podľa najvyššej karty v `karty/`, najvyššej hotovej vetvy aj najvyššej
    dávky vo fronte."""
    def davka():
        """Označenie navrhnutej dávky (napr. `K66`) z výpisu `stav`."""
        return ok(kopia, 'stav').split('dávka ')[1].split('.')[0]
    zaklad = int(davka()[1:])
    (kopia.priecinok / 'karty' / ('K%d.md' % (zaklad + 10))).write_text('karta', encoding='utf-8')
    assert davka() == 'K%d' % (zaklad + 11)
    n = volny_nalez(kopia.udaje())
    ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n, vetva='K%d' % (zaklad + 20))))
    assert davka() == 'K%d' % (zaklad + 21)
    n2 = nalez_mimo_fronty(kopia.udaje(), 1)[0]
    ok(kopia, 'fronta', 'pridaj', '--json', kopia.json('p.json', pridaj_vstup(n2, davka='K%d (agent)' % (zaklad + 30))))
    assert davka() == 'K%d' % (zaklad + 31)


def test_stav_ukaze_polozky_cakajuce_na_zlucenie_a_na_rucny_test(kopia):
    """`stav` uvádza hotovú položku najprv ako čakajúcu na zlúčenie (vetva, PR) a po `zlucene` ako čakajúcu na ručný test."""
    n = volny_nalez(kopia.udaje())
    ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n)))
    assert 'čaká na zlúčenie: č. %d (vetva K64, PR #345)' % n in ok(kopia, 'stav')
    ok(kopia, 'zlucene', '--vetva', 'K64', '--pr', '#345')
    vystup = ok(kopia, 'stav')
    assert 'čaká na ručný test alebo opravu po ňom: č. %d (vetva K64, caka)' % n in vystup
    assert 'čaká na zlúčenie:' not in vystup


# ---------------------------------------------------------------- novy
def test_novy_nalez_dostane_dalsie_cislo_a_zoznam_sa_zostavi(kopia):
    """`novy` pridelí ďalšie voľné číslo a zapíše nález do cieľového súboru záznamov; zoznam sa zostaví (nález je v tabuľke aj
    medzi
    otvorenými) a počty „spolu“ a „pred“ vzrastú o jeden."""
    u = kopia.udaje()
    pred = build(kopia)
    cielovy = kopia.zaznamovy('zaznamy_nove')  # súbor, do ktorého skript zapíše ďalší záznam (po rotácii nie vždy `_01`)
    vystup = ok(kopia, 'novy', '--json', kopia.json('n.json', novy_vstup(u, co='jedinečný popis nálezu 7q')))
    assert '=> Pridelené číslo nálezu: %d' % (u['posledne'] + 1) in vystup
    assert 'Zmenené súbory: %s.' % cielovy in vystup
    po = suhrn(vystup)
    assert (po['spolu'], po['pred']) == (pred['spolu'] + 1, pred['pred'] + 1)
    assert kopia.build_check()[0] == 0
    assert '| %d | jedinečný popis nálezu 7q' % (u['posledne'] + 1) in kopia.text('ZOZNAM.md')
    assert kopia.udaje()['otvorene'][-1] == u['posledne'] + 1


def test_dva_nove_nalezy_za_sebou_dostanu_po_sebe_iduce_cisla(kopia):
    """Dve samostatné spustenia `novy` dostanú po sebe idúce čísla."""
    u = kopia.udaje()
    prvy = ok(kopia, 'novy', '--json', kopia.json('a.json', novy_vstup(u, kratko='prvý nový')))
    druhy = ok(kopia, 'novy', '--json', kopia.json('b.json', novy_vstup(u, kratko='druhý nový')))
    assert '=> Pridelené číslo nálezu: %d' % (u['posledne'] + 1) in prvy
    assert '=> Pridelené číslo nálezu: %d' % (u['posledne'] + 2) in druhy
    assert kopia.udaje()['posledne'] == u['posledne'] + 2


@pytest.mark.parametrize('skupina, kluc', [('H', 'hned'), ('P', 'pred'), ('A', 'po')])
def test_novy_nalez_pribudne_v_zadanej_skupine(kopia, skupina, kluc):
    """Nový nález pribudne len v zadanej skupine (H, P alebo A); počty ostatných skupín sa nezmenia."""
    u = kopia.udaje()
    pred = build(kopia)
    po = suhrn(ok(kopia, 'novy', '--json', kopia.json('n.json', novy_vstup(u, skupina))))
    assert po[kluc] == pred[kluc] + 1
    assert {k: v for k, v in po.items() if k not in (kluc, 'spolu')} == {k: v for k, v in pred.items() if k not in (kluc, 'spolu')}


def test_novy_nalez_s_frontou_sa_vlozi_na_zadane_poradie_a_bez_poradia_na_koniec(kopia):
    """Nález zadaný s poľom `fronta` sa vloží do fronty na zadané poradie, bez poradia na koniec; dáta ostanú platné."""
    u = kopia.udaje()
    fronta = {'davka': 'K65', 'co': 'Práca na novom náleze.', 'preco': 'JASNÉ (nový nález).', 'poradie': 2}
    ok(kopia, 'novy', '--json', kopia.json('a.json', novy_vstup(u, fronta=fronta)))
    nova = u['posledne'] + 1
    assert kopia.udaje()['fronta'] == u['fronta'][:1] + [str(nova)] + u['fronta'][1:]
    del fronta['poradie']
    ok(kopia, 'novy', '--json', kopia.json('b.json', novy_vstup(u, fronta=fronta)))
    assert kopia.udaje()['fronta'][-1] == str(nova + 1)
    assert kopia.build_check()[0] == 0


def test_novy_nalez_s_rozhodnutim_ma_vyplnene_pole_dec(kopia):
    """Nález zadaný s poľom `rozhodnutie` má v dátach `dec` v tvare `ROZHODNUTIE R<n>`."""
    u = kopia.udaje()
    ok(kopia, 'novy', '--json', kopia.json('n.json', novy_vstup(u, rozhodnutie='R84')))
    nalez = kopia.vyhodnot("[d for d in polozky_nove.NEW_ITEMS if d['n'] == %d][0]" % (u['posledne'] + 1), moduly='polozky_nove')
    assert nalez['dec'] == 'ROZHODNUTIE R84'


def test_novy_nalez_s_nebezpecnymi_znakmi_sa_zapise_a_precita_nezmeneny(kopia):
    """Texty nového nálezu s apostrofom, obrátenou lomkou, úvodzovkami, `%s`, `{x}` a emoji sa zapíšu a z dát prečítajú
    nezmenené."""
    u = kopia.udaje()
    vstup = novy_vstup(u, kratko=NEBEZPECNY_TEXT, co='A ' + NEBEZPECNY_TEXT, poznamka='B ' + NEBEZPECNY_TEXT, zdroj='C ' + NEBEZPECNY_TEXT)
    ok(kopia, 'novy', '--json', kopia.json('n.json', vstup))
    nalez = kopia.vyhodnot("[d for d in polozky_nove.NEW_ITEMS if d['n'] == %d][0]" % (u['posledne'] + 1), moduly='polozky_nove')
    assert (nalez['kratko'], nalez['what'], nalez['note'], nalez['src']) == (
        NEBEZPECNY_TEXT, 'A ' + NEBEZPECNY_TEXT, 'B ' + NEBEZPECNY_TEXT, 'C ' + NEBEZPECNY_TEXT)
    assert kopia.build_check()[0] == 0


def test_vstup_z_standardneho_vstupu_funguje_rovnako_ako_zo_suboru(kopia):
    """Vstup JSON zo štandardného vstupu (`--json -`) funguje rovnako ako zo súboru."""
    import json
    u = kopia.udaje()
    vystup = ok(kopia, 'novy', '--json', '-', vstup=json.dumps(novy_vstup(u), ensure_ascii=False))
    assert '=> Pridelené číslo nálezu: %d' % (u['posledne'] + 1) in vystup


def test_poznamky_s_podciarnikom_v_json_sa_ignoruju(kopia):
    """Kľúče začínajúce podčiarkovníkom (poznámky v šablónach) sa vo vstupe aj vo vnorenom `fronta` ignorujú; zápis prejde."""
    u = kopia.udaje()
    vstup = novy_vstup(u, _poznamka='ukážka', fronta={'_x': 1, 'davka': 'K65', 'co': 'c', 'preco': 'JASNÉ p'})
    ok(kopia, 'novy', '--json', kopia.json('n.json', vstup))


# ---------------------------------------------------------------- hotove
def test_hotove_presunie_nalez_z_otvorenych_do_hotovych_a_zachova_ostatne(kopia):
    """`hotove` presunie nález z otvorených do hotových (celkový počet ostane, hotových je o jeden viac, otvorených o jeden menej)
    a ostatné otvorené nálezy ostanú v pôvodnom poradí."""
    u = kopia.udaje()
    n = volny_nalez(u)
    pred = build(kopia)
    vystup = ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n, zlucene=True, rucny_test=None)))
    po = suhrn(vystup)
    assert po['spolu'] == pred['spolu'] and po['hotove'] == pred['hotove'] + 1
    assert po['pred'] + po['po'] + po['hned'] == pred['pred'] + pred['po'] + pred['hned'] - 1
    nove = kopia.udaje()
    assert n not in nove['otvorene'] and n in nove['hotove']
    assert [i for i in u['otvorene'] if i != n] == nove['otvorene']
    assert kopia.build_check()[0] == 0


def test_hotove_odstrani_nalez_aj_z_fronty_a_zo_vln(kopia):
    """`hotove` odstráni nález aj z fronty a zo zoznamov nálezov vĺn poradia; ostatné položky ostanú v pôvodnom poradí."""
    u = kopia.udaje()
    n = nalez_vo_fronte_a_vlne(u)
    vystup = ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n)))
    assert 'Odstránený z fronty prác.' in vystup and 'vĺn poradia' in vystup
    nove = kopia.udaje()
    assert str(n) not in nove['fronta'] and str(n) not in nove['vo_vlnach']
    assert [i for i in u['fronta'] if i != str(n)] == nove['fronta']
    assert [i for i in u['vo_vlnach'] if i != str(n)] == nove['vo_vlnach']


def test_hotove_s_cakajucim_rucnym_testom_vypise_pokyn_co_po_zlucenii(kopia):
    """`hotove` s ručným testom `caka` vypíše cieľový súbor záznamov a pokyn na `zlucene --vetva …`; položka čaká na zlúčenie."""
    n = volny_nalez(kopia.udaje())
    cielovy = kopia.zaznamovy('zaznamy_hotove')
    vystup = ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n)))
    assert 'zapísaný ako hotový do %s (čaká na ručný test)' % cielovy in vystup
    assert 'zapis.py zlucene --vetva K64' in vystup
    assert suhrn(vystup)['caka_zlucenie'] == 1


def test_hotove_s_castou_pr_prida_riadok_tabulky_pr(kopia):
    """`hotove` s `cast_pr` pridá riadok do tabuľky čiastočných PR (PR, vetva a text s apostrofom a zvislítkom)."""
    n = volny_nalez(kopia.udaje())
    vstup = hotove_vstup(n, zlucene=True, rucny_test=None, cast_pr=[{'pr': '#345', 'vetva': 'K64', 'text': "%d (časť: it's | ok)" % n}])
    ok(kopia, 'hotove', '--json', kopia.json('h.json', vstup))
    assert kopia.vyhodnot('[list(r) for r in stav.DONE_PR_TABLE_CASTOCNE][-1]') == ['#345', 'K64', "%d (časť: it's | ok)" % n]


def test_hotove_zachova_text_s_nebezpecnymi_znakmi(kopia):
    """Text hotovej položky s nebezpečnými znakmi sa v dátach uloží presne."""
    n = volny_nalez(kopia.udaje())
    text = 'HOTOVÉ ' + NEBEZPECNY_TEXT
    ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n, text=text, zlucene=True, rucny_test='prešiel')))
    assert kopia.vyhodnot('[d for d in stav.DONE_SINCE if d["n"] == %d][0]' % n)['text'] == text


def test_nalez_ktoreho_zavislost_sa_dokoncila_je_vo_fronte_volny(kopia):
    """Položka vo fronte závislá (`po`) na inom nálezi čaká, kým je ten otvorený; po jeho `hotove` už `stav` čakanie na dokončenie
    nehlási."""
    u = kopia.udaje()
    pred, nasledny = nalez_mimo_fronty(u, 2)
    ok(kopia, 'fronta', 'pridaj', '--json', kopia.json('p.json', {'n': str(pred), 'davka': 'K65', 'co': 'a', 'preco': 'JASNÉ a'}))
    ok(kopia, 'fronta', 'pridaj', '--json', kopia.json('q.json', {'n': str(nasledny), 'davka': 'K65', 'co': 'b', 'preco': 'JASNÉ b', 'po': [str(pred)]}))
    assert 'čaká na dokončenie: %d' % pred in ok(kopia, 'stav')
    ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(pred, zlucene=True, rucny_test=None)))
    assert 'čaká na dokončenie' not in ok(kopia, 'stav')


# ---------------------------------------------------------------- zlúčenie a ručný test
def test_zlucenie_a_ruzny_test_prejdu_cely_cyklus_v_pocitadlach_aj_v_texte(kopia):
    """Celý cyklus: hotové čaká na zlúčenie, `zlucene` ho presunie medzi čakajúce na ručný test, `neprešiel` ho nechá čakať
    a `prešiel` ho uzavrie; počítadlá aj text záznamu (zlúčené, test neprešiel, test prešiel v tomto poradí) sedia."""
    n = volny_nalez(kopia.udaje())
    zaklad = build(kopia)
    s = suhrn(ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n, pr=None))))
    assert (s['caka_zlucenie'], s['caka_rucny'], s['hotove']) == (1, 0, zaklad['hotove'])
    s = suhrn(ok(kopia, 'zlucene', '--vetva', 'K64', '--pr', '#345', '--merge', 'abcd1234', '--cas', '27. 11. 2026 o 12:07 UTC'))
    assert (s['caka_zlucenie'], s['caka_rucny'], s['hotove']) == (0, 1, zaklad['hotove'])
    s = suhrn(ok(kopia, 'rucny-test', '--vetva', 'K64', '--vysledok', 'neprešiel', '--datum', '28. 11. 2026', '--poznamka', 'nález 383'))
    assert (s['caka_rucny'], s['hotove']) == (1, zaklad['hotove'])
    assert 'RUČNÝ TEST NEPREŠIEL. ' in kopia.text('ZOZNAM.md')
    s = suhrn(ok(kopia, 'rucny-test', '--vetva', 'K64', '--vysledok', 'prešiel', '--datum', '29. 11. 2026'))
    assert (s['caka_zlucenie'], s['caka_rucny'], s['hotove']) == (0, 0, zaklad['hotove'] + 1)
    zapis = kopia.vyhodnot('[d for d in stav.DONE_SINCE if d["n"] == %d][0]' % n)
    assert (zapis['pr'], zapis['zlucene'], zapis['rucny_test']) == ('#345', True, 'prešiel')
    for ocakavane in ('ZLÚČENÉ (PR #345, 27. 11. 2026 o 12:07 UTC, merge `abcd1234`).',
                      'RUČNÝ TEST MAJITEĽA (28. 11. 2026): neprešiel. nález 383',
                      'RUČNÝ TEST MAJITEĽA (29. 11. 2026): prešiel.'):
        assert ocakavane in zapis['text']
    assert zapis['text'].index('ZLÚČENÉ') < zapis['text'].index('neprešiel') < zapis['text'].index(': prešiel.')
    assert kopia.build_check()[0] == 0


def test_zlucenie_bez_doplnkov_pripise_len_zlucene_a_ponecha_pr(kopia):
    """`zlucene` bez `--pr`, `--merge` a `--cas` pripíše len „ZLÚČENÉ.“ a ponechá PR zapísané pri hotovom."""
    n = volny_nalez(kopia.udaje())
    ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n, rucny_test=None)))
    ok(kopia, 'zlucene', '--vetva', 'K64')
    zapis = kopia.vyhodnot('[d for d in stav.DONE_SINCE if d["n"] == %d][0]' % n)
    assert zapis['zlucene'] is True and zapis['pr'] == '#345' and zapis['text'].endswith('ZLÚČENÉ.')


def test_zlucenie_vyplni_pr_aj_ked_pri_hotovom_zapise_chybalo(kopia):
    """`zlucene --pr` doplní číslo PR, aj keď pri `hotove` chýbalo."""
    n = volny_nalez(kopia.udaje())
    ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n, pr=None, rucny_test=None)))
    ok(kopia, 'zlucene', '--vetva', 'K64', '--pr', '#350')
    assert kopia.vyhodnot('[d for d in stav.DONE_SINCE if d["n"] == %d][0]' % n)['pr'] == '#350'


def test_zlucenie_vetvy_oznaci_vsetky_jej_nezlucene_polozky(kopia):
    """`zlucene` označí všetky nezlúčené hotové položky vetvy a ručný test „prešiel“ uzavrie obe naraz."""
    a, b = nalez_mimo_fronty(kopia.udaje(), 2)
    for n in (a, b):
        ok(kopia, 'hotove', '--json', kopia.json('h%d.json' % n, hotove_vstup(n, vetva='K70')))
    vystup = ok(kopia, 'zlucene', '--vetva', 'K70', '--pr', '#360')
    assert 'č. %d označený' % a in vystup and 'č. %d označený' % b in vystup
    s = suhrn(vystup)
    assert (s['caka_zlucenie'], s['caka_rucny']) == (0, 2)
    ok(kopia, 'rucny-test', '--vetva', 'K70', '--vysledok', 'prešiel', '--datum', '1. 12. 2026')
    assert build(kopia)['caka_rucny'] == 0


def test_nepresiel_test_sa_da_po_oprave_zopakovat_a_potom_uzavriet(kopia):
    """Ručný test „neprešiel“ nechá dávku neuzavretú a dá sa zapísať opakovane; až „prešiel“ ju uzavrie."""
    n = volny_nalez(kopia.udaje())
    ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n, zlucene=True)))
    vystup = ok(kopia, 'rucny-test', '--vetva', 'K64', '--vysledok', 'neprešiel', '--datum', '1. 12. 2026')
    assert 'Dávka ostáva neuzavretá' in vystup
    assert suhrn(ok(kopia, 'rucny-test', '--vetva', 'K64', '--vysledok', 'neprešiel', '--datum', '2. 12. 2026'))['caka_rucny'] == 1
    assert suhrn(ok(kopia, 'rucny-test', '--vetva', 'K64', '--vysledok', 'prešiel', '--datum', '3. 12. 2026'))['caka_rucny'] == 0


def test_rucny_test_pred_zlucenim_je_chyba_a_nic_nezmeni(kopia):
    """Ručný test pred zlúčením vetvy je chyba (kód 2, „nemá zlúčenú položku…“) a nezmení žiadny súbor."""
    n = volny_nalez(kopia.udaje())
    ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n)))
    pred = kopia.snimka()
    kod, vystup = kopia.zapis('rucny-test', '--vetva', 'K64', '--vysledok', 'prešiel', '--datum', '1. 12. 2026')
    assert kod == 2 and 'nemá zlúčenú položku, ktorá čaká na ručný test' in vystup
    assert kopia.snimka() == pred


def test_druhe_zlucenie_tej_istej_vetvy_je_chyba_a_nic_nezmeni(kopia):
    """Druhé `zlucene` tej istej vetvy je chyba (kód 2) a nezmení žiadny súbor."""
    n = volny_nalez(kopia.udaje())
    ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n)))
    ok(kopia, 'zlucene', '--vetva', 'K64', '--pr', '#345')
    pred = kopia.snimka()
    kod, vystup = kopia.zapis('zlucene', '--vetva', 'K64', '--pr', '#999')
    assert kod == 2 and 'nemá žiadnu hotovú položku, ktorá čaká na zlúčenie' in vystup
    assert kopia.snimka() == pred


def test_ruzny_test_po_uzavreti_dalsi_krat_zapisat_nejde(kopia):
    """Po uzavretí dávky (`prešiel`) sa ďalší výsledok ručného testu zapísať nedá (kód 2); uzavretá dávka sa spätne neotvára."""
    n = volny_nalez(kopia.udaje())
    ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n, zlucene=True)))
    ok(kopia, 'rucny-test', '--vetva', 'K64', '--vysledok', 'prešiel', '--datum', '1. 12. 2026')
    pred = kopia.snimka()
    kod, vystup = kopia.zapis('rucny-test', '--vetva', 'K64', '--vysledok', 'neprešiel', '--datum', '2. 12. 2026')
    assert kod == 2 and kopia.snimka() == pred  # uzavretá dávka sa spätne neotvára


def test_hotove_bez_rucneho_testu_sa_po_zluceni_nepocita_ako_cakajuce(kopia):
    """Hotová položka bez ručného testu sa po zlúčení nepočíta ani ako čakajúca na zlúčenie, ani ako čakajúca na ručný test."""
    n = volny_nalez(kopia.udaje())
    ok(kopia, 'hotove', '--json', kopia.json('h.json', hotove_vstup(n, rucny_test=None)))
    s = suhrn(ok(kopia, 'zlucene', '--vetva', 'K64'))
    assert (s['caka_zlucenie'], s['caka_rucny']) == (0, 0)


# ---------------------------------------------------------------- rozhodnutie a zatvorenie
def test_rozhodnutie_dostane_dalsie_cislo_a_bez_odpovede_caka_na_majitela(kopia):
    """`rozhodnutie` bez odpovede pridelí ďalšie číslo R<n>, uvedie „čaká na odpoveď majiteľa“ a otázka sa objaví vo výpise
    `stav`."""
    u = kopia.udaje()
    nove = 'R%d' % (len(u['rozhodnutia']) + 1)
    vystup = ok(kopia, 'rozhodnutie', '--json', kopia.json('r.json', rozhodnutie_vstup()))
    assert '=> Pridelené rozhodnutie: %s' % nove in vystup and '(čaká na odpoveď majiteľa)' in vystup
    assert '%s (Skúšobná téma)' % nove in ok(kopia, 'stav')
    assert nove not in kopia.udaje()['rozhodnutia_s_odpovedou']


def test_rozhodnutie_s_odpovedou_je_hned_zodpovedane(kopia):
    """Rozhodnutie zapísané s odpoveďou a dátumom je hneď zodpovedané."""
    u = kopia.udaje()
    nove = 'R%d' % (len(u['rozhodnutia']) + 1)
    ok(kopia, 'rozhodnutie', '--json', kopia.json('r.json', rozhodnutie_vstup(odpoved='Majiteľ: áno.', datum='27. 11. 2026')))
    assert nove in kopia.udaje()['rozhodnutia_s_odpovedou']


def test_odpoved_na_zapisanu_otazku_nevytvori_nove_cislo_a_doplni_len_odpoved_a_datum(kopia):
    """Odpoveď na existujúcu otázku (pole `id`) nevytvorí nové číslo: doplní jej `odpoved` a `datum` (aj s apostrofom a
    zvislítkom),
    téma ostane a otázka zmizne zo zoznamu čakajúcich vo `stav`."""
    ok(kopia, 'rozhodnutie', '--json', kopia.json('r.json', rozhodnutie_vstup()))
    pred = kopia.udaje()
    nove = pred['rozhodnutia'][-1]
    assert nove not in pred['rozhodnutia_s_odpovedou'] and '%s (Skúšobná téma)' % nove in ok(kopia, 'stav')
    odpoved = "Majiteľ: áno, it's ok | a"
    vystup = ok(kopia, 'rozhodnutie', '--json', kopia.json('o.json', {'id': nove, 'odpoved': odpoved, 'datum': '27. 11. 2026'}))
    assert 'odpoveď zapísaná' in vystup and 'Pridelené rozhodnutie' not in vystup
    po = kopia.udaje()
    assert po['rozhodnutia'] == pred['rozhodnutia'] and nove in po['rozhodnutia_s_odpovedou']
    zaznam = kopia.vyhodnot("[d for d in stav.DECISIONS if d['id'] == '%s'][0]" % nove)
    assert (zaznam['odpoved'], zaznam['datum'], zaznam['tema']) == (odpoved, '27. 11. 2026', 'Skúšobná téma')
    assert '%s (Skúšobná téma)' % nove not in ok(kopia, 'stav') and kopia.build_check()[0] == 0


def test_odpoved_na_stare_rozhodnutie_zo_stav_py_prida_len_dva_kluce_a_zvysok_ostane(kopia):
    """Odpoveď na rozhodnutie uložené priamo v `stav.py` (R1 až R12) doplní len `odpoved` a `datum` (o dva riadky viac), ostatné
    polia
    ostanú; rozhodnutie sa v kópii najprv „odzodpovedá“, takže test nezávisí od aktuálnych odpovedí majiteľa."""
    stare = nezodpovedane_rozhodnutie_v_stav_py(kopia)
    assert stare not in kopia.udaje()['rozhodnutia_s_odpovedou']
    pred = kopia.vyhodnot("[d for d in stav.DECISIONS if d['id'] == '%s'][0]" % stare)
    riadkov = kopia.text('stav.py').count('\n')
    ok(kopia, 'rozhodnutie', '--json', kopia.json('o.json', {'id': stare, 'odpoved': 'Majiteľ: súhlas.', 'datum': '27. 11. 2026'}))
    po = kopia.vyhodnot("[d for d in stav.DECISIONS if d['id'] == '%s'][0]" % stare)
    assert po == dict(pred, odpoved='Majiteľ: súhlas.', datum='27. 11. 2026')
    assert kopia.text('stav.py').count('\n') == riadkov + 2
    assert stare in kopia.udaje()['rozhodnutia_s_odpovedou'] and kopia.build_check()[0] == 0


def test_rozhodnutie_zodpovedane_dodatocne_sa_da_pouzit_pri_zatvoreni_nalezu(kopia):
    """Kým otázka nemá odpoveď, `zatvor` s ňou zlyhá (kód 2); po dodatočnej odpovedi (pole `id`) prejde."""
    u = kopia.udaje()
    n = volny_nalez(u)
    ok(kopia, 'rozhodnutie', '--json', kopia.json('r.json', rozhodnutie_vstup()))
    nove = kopia.udaje()['rozhodnutia'][-1]
    zatvor = kopia.json('z.json', {'n': n, 'rozhodnutie': nove, 'datum': '27. 11. 2026', 'text': 'ZATVORENÉ rozhodnutím %s.' % nove})
    kod, vystup = kopia.zapis('zatvor', '--json', zatvor)
    assert kod == 2 and 'odpoveď na existujúce rozhodnutie' in vystup  # kým otázka nemá odpoveď
    ok(kopia, 'rozhodnutie', '--json', kopia.json('o.json', {'id': nove, 'odpoved': 'Majiteľ: zatvoriť.', 'datum': '27. 11. 2026'}))
    ok(kopia, 'zatvor', '--json', zatvor)
    assert n not in kopia.udaje()['otvorene']


def test_zatvorenie_nalezu_rozhodnutim_ho_presunie_medzi_zatvorene(kopia):
    """`zatvor` presunie otvorený nález medzi zatvorené (cieľový súbor záznamov je vo výpise); nález už nie je otvorený
    a dáta ostanú platné."""
    u = kopia.udaje()
    n = volny_nalez(u)
    nove = 'R%d' % (len(u['rozhodnutia']) + 1)
    ok(kopia, 'rozhodnutie', '--json', kopia.json('r.json', rozhodnutie_vstup(odpoved='Majiteľ: nález sa neopravuje.', datum='27. 11. 2026')))
    vstup = {'n': n, 'rozhodnutie': nove, 'datum': '27. 11. 2026', 'text': 'ZATVORENÉ rozhodnutím %s: zámer.' % nove}
    cielovy = kopia.zaznamovy('zaznamy_zatvorene')
    vystup = ok(kopia, 'zatvor', '--json', kopia.json('z.json', vstup))
    assert 'zapísaný ako zatvorený rozhodnutím %s do %s' % (nove, cielovy) in vystup
    assert n not in kopia.udaje()['otvorene']
    zatvorene = kopia.vyhodnot('[d["n"] for d in zatvorene_dalsie.CLOSED_SINCE]', moduly='zatvorene_dalsie')
    assert n in zatvorene
    assert kopia.build_check()[0] == 0


def test_zatvorenie_odstrani_nalez_z_fronty_a_vln(kopia):
    """`zatvor` odstráni nález aj z fronty a zo zoznamov nálezov vĺn poradia."""
    u = kopia.udaje()
    n = nalez_vo_fronte_a_vlne(u)
    nove = 'R%d' % (len(u['rozhodnutia']) + 1)
    ok(kopia, 'rozhodnutie', '--json', kopia.json('r.json', rozhodnutie_vstup(odpoved='Majiteľ: zatvoriť.', datum='27. 11. 2026')))
    ok(kopia, 'zatvor', '--json', kopia.json('z.json', {'n': n, 'rozhodnutie': nove, 'datum': '27. 11. 2026', 'text': 'ZATVORENÉ rozhodnutím %s.' % nove}))
    nove_udaje = kopia.udaje()
    assert str(n) not in nove_udaje['fronta'] and str(n) not in nove_udaje['vo_vlnach']


