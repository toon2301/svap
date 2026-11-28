# -*- coding: utf-8 -*-
"""Testy nových polí zoznamu: stav ručného testu pri hotových položkách (`rucny_test`) a čakanie vo fronte (`caka`, `po`).

Moduly sa importujú priamo z repozitára a dáta sa v pamäti dočasne upravia (`monkeypatch`), takže nič sa nezapisuje na disk.
"""
from pathlib import Path

import pytest

import fronta
import model
import stav
import vystup
from fronta_pravidla import dovod_blokovania, prva_volna

PRIECINOK = Path(__file__).resolve().parent.parent


def _stara_hotova_polozka():
    """Zlúčená hotová položka bez ručného testu (obyčajná stará položka)."""
    for d in stav.DONE_SINCE:
        if d.get('zlucene') and not d.get('rucny_test'):
            return d['n']
    pytest.skip('v dátach nie je zlúčená hotová položka bez ručného testu')


def _uprav_hotovu(monkeypatch, n, **polia):
    """Dočasne (len v pamäti) prepíše polia hotovej položky `n` v `stav.DONE_SINCE`; ostatné položky ostanú."""
    nove = [dict(d, **polia) if d['n'] == n else dict(d) for d in stav.DONE_SINCE]
    monkeypatch.setattr(stav, 'DONE_SINCE', nove)


# ---------------------------------------------------------------- stav ručného testu
def test_zlucena_polozka_s_cakajucim_rucnym_testom_sa_pocita_osobitne_a_ma_znacku(monkeypatch):
    """Zlúčená položka s `rucny_test` „caka“ sa počíta osobitne (nie ako hotová), súčet ostane rovnaký a text má značku
    „ČAKÁ NA RUČNÝ TEST“."""
    p0 = model.zostav_model().pocty
    n = _stara_hotova_polozka()
    _uprav_hotovu(monkeypatch, n, rucny_test='caka')
    m = model.zostav_model()
    assert m.pocty.caka_na_rucny_test == p0.caka_na_rucny_test + 1
    assert m.pocty.hotove == p0.hotove - 1
    assert m.pocty.spolu == p0.spolu  # položka neprepadla ani sa nezdvojila
    assert m.hotove[n].startswith('ČAKÁ NA RUČNÝ TEST. HOTOVÉ')


def test_nepresiel_rucny_test_necha_polozku_neuzavretu_a_ma_vlastnu_znacku(monkeypatch):
    """Položka s ručným testom „neprešiel“ ostáva neuzavretá (počíta sa medzi čakajúce) a má vlastnú značku „RUČNÝ TEST
    NEPREŠIEL“."""
    p0 = model.zostav_model().pocty
    n = _stara_hotova_polozka()
    _uprav_hotovu(monkeypatch, n, rucny_test='neprešiel')
    m = model.zostav_model()
    assert m.pocty.caka_na_rucny_test == p0.caka_na_rucny_test + 1
    assert m.hotove[n].startswith('RUČNÝ TEST NEPREŠIEL. ')


def test_presiel_rucny_test_uzavrie_polozku_bez_znacky(monkeypatch):
    """Položka s ručným testom „prešiel“ je uzavretá: počíta sa ako obyčajná hotová a jej text ostane bez značky."""
    p0 = model.zostav_model().pocty
    n = _stara_hotova_polozka()
    text_pred = model.zostav_model().hotove[n]
    _uprav_hotovu(monkeypatch, n, rucny_test='prešiel')
    m = model.zostav_model()
    assert m.pocty.caka_na_rucny_test == p0.caka_na_rucny_test
    assert m.pocty.hotove == p0.hotove
    assert m.hotove[n] == text_pred


def test_nezlucena_polozka_je_len_v_cakani_na_zlucenie_a_ruzny_test_ju_este_neblokuje(monkeypatch):
    """Nezlúčená položka sa počíta len medzi čakajúce na zlúčenie; čakajúci ručný test ju k čakajúcim na test ešte nepridá."""
    p0 = model.zostav_model().pocty
    n = _stara_hotova_polozka()
    _uprav_hotovu(monkeypatch, n, rucny_test='caka', zlucene=False)
    m = model.zostav_model()
    assert m.pocty.caka_na_zlucenie == p0.caka_na_zlucenie + 1
    assert m.pocty.caka_na_rucny_test == p0.caka_na_rucny_test
    assert not m.hotove[n].startswith('ČAKÁ NA RUČNÝ TEST')


def test_neznamy_stav_rucneho_testu_zlyha_s_popisom(monkeypatch):
    """Neznáma hodnota `rucny_test` (napr. „asi“) zhodí zostavenie modelu `ValueError` s popisom stavu."""
    _uprav_hotovu(monkeypatch, _stara_hotova_polozka(), rucny_test='asi')
    with pytest.raises(ValueError, match="neznámy stav ručného testu 'asi'"):
        model.zostav_model()


def test_dokument_ukaze_cakajuci_rucny_test_v_sumari_tabulke_prehladu_a_casti_7(monkeypatch):
    """Vygenerovaný dokument ukáže čakajúci ručný test v súhrne, v tabuľke prehľadu aj v časti 7 (zlúčené, čaká na ručný test)."""
    n = _stara_hotova_polozka()
    _uprav_hotovu(monkeypatch, n, rucny_test='caka')
    text = vystup.zostav_dokument(model.zostav_model())
    assert 'čaká na ručný test' in text
    assert 'Zlúčené, čaká na ručný test (alebo ručný test neprešiel)' in text
    assert '| %d | ČAKÁ NA RUČNÝ TEST. ' % n in text


# ---------------------------------------------------------------- pravidlá fronty
def test_volna_polozka_ma_dovod_none_a_cakajuca_ma_vysvetlenie():
    """`dovod_blokovania` vráti `None` pre voľnú položku a vysvetlenie „čaká na majiteľa/Codexa: …“ pre čakajúcu."""
    assert dovod_blokovania({'n': '1'}, {'1'}) is None
    assert dovod_blokovania({'n': '1', 'caka': ('majiteľ', 'schváliť vzhľad')}, {'1'}) == 'čaká na majiteľa: schváliť vzhľad'
    assert dovod_blokovania({'n': '1', 'caka': ('Codex', 'upraviť E2E')}, {'1'}) == 'čaká na Codexa: upraviť E2E'


def test_zavislost_blokuje_len_kym_je_otvorena():
    """Závislosť (`po`) blokuje len kým je otvorená: zatvorené ID sa v dôvode neuvádzajú a bez otvorených závislostí je položka
    voľná."""
    zaznam = {'n': '1', 'po': ['5', '6', '7']}
    assert dovod_blokovania(zaznam, {'1', '5', '7'}) == 'čaká na dokončenie: 5, 7'
    assert dovod_blokovania(zaznam, {'1'}) is None


def test_cakanie_na_majitela_ma_prednost_pred_zavislostou():
    """Ak má položka aj `caka`, aj `po`, dôvodom blokovania je čakanie na majiteľa (má prednosť pred závislosťou)."""
    zaznam = {'n': '1', 'caka': ('majiteľ', 'rozhodnúť'), 'po': ['5']}
    assert dovod_blokovania(zaznam, {'1', '5'}).startswith('čaká na majiteľa')


def test_prva_volna_preskoci_cakajuce_a_zavisle_polozky():
    """`prva_volna` preskočí čakajúce a závislé položky; ak žiadna nie je voľná alebo je fronta prázdna, vráti `None`;
    závislosť na ID, ktoré nie je otvorené, neblokuje."""
    fronta_prac = [{'n': '1', 'caka': ('majiteľ', 'x')}, {'n': '2', 'po': ['3']}, {'n': '3'}, {'n': '4'}]
    otvorene = {'1', '2', '3', '4'}
    assert prva_volna(fronta_prac, otvorene)['n'] == '3'
    assert prva_volna(fronta_prac[:2], otvorene) is None
    assert prva_volna([], otvorene) is None
    assert prva_volna(fronta_prac[1:2], {'2'})['n'] == '2'  # závislosť už nie je otvorená


def _zaznam(n, **polia):
    """Minimálny platný záznam fronty (`n`, `co`, `preco`); `polia` pridajú alebo prepíšu ďalšie polia."""
    return dict({'n': n, 'co': 'čo', 'preco': 'JASNÉ prečo'}, **polia)


@pytest.mark.parametrize('caka, chyba', [
    ('majiteľ', 'musí byť dvojica'),
    (('majiteľ',), 'musí byť dvojica'),
    (('niekto', 'x'), 'musí byť dvojica'),
    (('majiteľ', ''), 'musí byť dvojica'),
    (('majiteľ', '   '), 'musí byť dvojica'),
    (('majiteľ', 5), 'musí byť dvojica'),
    (('majiteľ', 'a', 'b'), 'musí byť dvojica'),
])
def test_neplatne_pole_caka_vo_fronte_hlasi_chybu(caka, chyba):
    """Neplatné `caka` (nie dvojica, neznámy „kto“, prázdny alebo netextový popis, tri prvky) je práve jedna chyba „musí byť
    dvojica“."""
    chyby = model._chyby_fronty({'1'}, 10, (), [_zaznam('1', caka=caka)])
    assert len(chyby) == 1 and chyba in chyby[0]


@pytest.mark.parametrize('caka', [('majiteľ', 'overiť'), ('Codex', 'upraviť test'), ['majiteľ', 'overiť']])
def test_platne_pole_caka_vo_fronte_prejde(caka):
    """Platné `caka` (majiteľ alebo Codex s popisom, ako n-tica aj ako zoznam) nevyvolá žiadnu chybu fronty."""
    assert model._chyby_fronty({'1'}, 10, (), [_zaznam('1', caka=caka)]) == []


def test_zavislost_na_inej_polozke_musi_existovat_a_nesmie_byt_sama_sebou():
    """Závislosť `po` musí ukazovať na existujúce ID (neznáme ID, `0` ani nezmyselný text sa neprijmú) a nie na samu seba."""
    assert 'neznáme ID' in model._chyby_fronty({'1'}, 10, (), [_zaznam('1', po=['99'])])[0]
    assert 'neznáme ID' in model._chyby_fronty({'1'}, 10, (), [_zaznam('1', po=['0'])])[0]
    assert 'neznáme ID' in model._chyby_fronty({'1'}, 10, (), [_zaznam('1', po=['XX-1'])])[0]
    assert 'samo od seba' in model._chyby_fronty({'1'}, 10, (), [_zaznam('1', po=['1'])])[0]


@pytest.mark.parametrize('zavislost', ['0380', '00380', '٣٨٠', '²', ' 380', '380 ', '+380', '3.8', '-1', '0', '', 'OW-1x'])
def test_nekanonicke_id_v_po_sa_odmietne_ako_neznamy_namiesto_ticheho_neblokovania(zavislost):
    """Nález bota (PR 345): ID v `po` v nekanonickom tvare (`0380`, iné číslice, medzery, znamienka, …) je „neznáme ID“,
    nie ticho neblokujúca závislosť."""
    chyby = model._chyby_fronty({'380', '1'}, 381, ('OW-11',), [_zaznam('1', po=[zavislost])])
    assert len(chyby) == 1 and 'neznáme ID' in chyby[0]


def test_po_ktore_nie_je_zoznam_textov_je_chyba_a_nepadne():
    """`po`, ktoré nie je zoznam textov (text, číslo, `None`, zoznam čísel, vnorený zoznam), je chyba kontroly fronty
    a nezhodí ju výnimkou."""
    for po in ('380', 380, None, [380], [None], [['380']]):
        chyby = model._chyby_fronty({'380', '1'}, 381, (), [_zaznam('1', po=po)])
        assert chyby and all('`po` musí' in c for c in chyby), (po, chyby)


def test_kanonicke_cislo_v_po_blokuje_otvoreny_nalez_aj_pri_poradi_skor_vo_fronte():
    """Kanonické ID v `po` (`380`) blokuje otvorený nález: pri správnom poradí nie je chyba, závislá položka čaká
    („čaká na dokončenie: 380“) a prvá voľná je tá, na ktorú čaká."""
    fronta_prac = [_zaznam('380'), _zaznam('1', po=['380'])]
    assert model._chyby_fronty({'380', '1'}, 381, (), fronta_prac) == []
    assert dovod_blokovania(fronta_prac[1], {'380', '1'}) == 'čaká na dokončenie: 380'
    assert prva_volna(fronta_prac, {'380', '1'})['n'] == '380'


def test_otvorena_zavislost_musi_byt_vo_fronte_skor_a_hotova_je_vzdy_v_poriadku():
    """Otvorená závislosť musí byť vo fronte skôr („nie je vo fronte skôr“ je chyba); závislosť, ktorá už nie je otvorená,
    je vždy v poriadku."""
    otvorene = {'1', '2'}
    skor = [_zaznam('2'), _zaznam('1', po=['2'])]
    neskor = [_zaznam('1', po=['2']), _zaznam('2')]
    assert model._chyby_fronty(otvorene, 10, (), skor) == []
    chyby = model._chyby_fronty(otvorene, 10, (), neskor)
    assert len(chyby) == 1 and 'nie je vo fronte skôr' in chyby[0]
    assert model._chyby_fronty({'1'}, 10, (), [_zaznam('1', po=['2'])]) == []  # 2 už nie je otvorený (je hotový alebo zatvorený)


def test_zavislost_na_id_z_registra_je_platna_len_ak_register_ma_dane_id():
    """Závislosť na ID z registra (`OW-11`) je platná len vtedy, keď ho register obsahuje; iné ID je „neznáme ID“."""
    assert model._chyby_fronty({'1'}, 10, ('OW-11',), [_zaznam('1', po=['OW-11'])]) == []
    assert 'neznáme ID' in model._chyby_fronty({'1'}, 10, ('OW-11',), [_zaznam('1', po=['OW-12'])])[0]


def test_skutocna_fronta_ma_platne_polia_a_kazde_poradie_je_zlozitelne():
    """Skutočná fronta v dátach nemá žiadnu chybu pravidiel (polia `caka` a `po`, poradie závislostí)."""
    m = model.zostav_model()
    assert model._chyby_fronty(set(m.otvorene_id), m.posledne_cislo, model.id_z_registra()) == []


# ---------------------------------------------------------------- výstup fronty
def _patchni_frontu(monkeypatch, uprav):
    """Dočasne (len v pamäti) nahradí `fronta.FRONTA` kópiou, ktorú upraví `uprav`; vráti upravený zoznam."""
    nova = [dict(z) for z in fronta.FRONTA]
    uprav(nova)
    monkeypatch.setattr(fronta, 'FRONTA', nova)
    return nova


def test_dokument_ukaze_cakanie_na_majitela_a_prvu_volnu_polozku(monkeypatch):
    """Keď prvá položka fronty čaká na majiteľa, dokument ukáže dôvod, počet čakajúcich a ako prvú voľnú druhú položku."""
    nova = _patchni_frontu(monkeypatch, lambda f: f[0].update(caka=('majiteľ', 'overiť na produkcii')))
    text = vystup.zostav_dokument(model.zostav_model())
    assert 'čaká na majiteľa: overiť na produkcii' in text
    assert 'prvý voľný v poradí: č. %s' % nova[1]['n'] in text
    assert ', z toho čaká 1' in text


def test_dokument_pri_samych_cakajucich_polozkach_nema_ziadnu_volnu(monkeypatch):
    """Keď všetky položky fronty čakajú, dokument uvedie „žiadna položka nie je voľná“ a pri každej, na koho čaká."""
    def vsetky(f):
        """Nastaví každému záznamu fronty čakanie na Codexa."""
        for z in f:
            z['caka'] = ('Codex', 'čaká')
    _patchni_frontu(monkeypatch, vsetky)
    text = vystup.zostav_dokument(model.zostav_model())
    assert 'žiadna položka nie je voľná' in text
    assert 'čaká na Codexa: čaká' in text


def test_dokument_pri_zavislosti_na_otvorenej_polozke_uvedie_na_co_caka(monkeypatch):
    """Pri závislosti na otvorenej položke dokument uvedie „čaká na dokončenie“ a číslo, na ktoré sa čaká."""
    def zavislost(f):
        """Presunie druhý záznam fronty na prvé miesto a pôvodne prvému zapíše závislosť na ňom."""
        f.insert(0, f.pop(1))  # druhý nález pôjde prvý a pôvodne prvý na ňom bude závisieť
        f[1]['po'] = [f[0]['n']]
    nova = _patchni_frontu(monkeypatch, zavislost)
    text = vystup.zostav_dokument(model.zostav_model())
    assert 'čaká na dokončenie: %s' % nova[0]['n'] in text


def test_odkazovane_subory_postupu_existuju():
    """Súbory, na ktoré vygenerovaný dokument odkazuje (`POSTUP.md`, `README.md`, `poznamky.md`), existujú, ako aj priečinok
    `sablony`."""
    text = vystup.zostav_dokument(model.zostav_model())
    for nazov in ('POSTUP.md', 'README.md', 'poznamky.md'):
        if '`%s`' % nazov in text:
            assert (PRIECINOK / nazov).is_file(), '%s je v ZOZNAM.md odkazovaný, ale neexistuje' % nazov
    assert (PRIECINOK / 'sablony').is_dir()
