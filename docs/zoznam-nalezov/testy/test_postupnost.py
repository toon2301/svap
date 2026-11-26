# -*- coding: utf-8 -*-
"""Testy viacerých operácií po sebe v jednom zápise: každá operácia musí vidieť stav, ktorý zanechala predošlá (poradie fronty,
nové číslo, zlúčená vetva), a výsledok sa zapíše a overí modelom naraz."""
import pytest

import zapis_data
import zapis_operacie as op
import zapis_transakcia as tr


def _novy(u, **zmeny):
    v = {'skupina': 'P', 'dopad': 'S', 'zlozitost': 'S', 'balik': u['baliky']['P'][0], 'kratko': 'k', 'co': 'Čo.', 'poznamka': 'JASNÉ.',
         'zdroj': 'test'}
    v.update(zmeny)
    return v


def _vo_fronte(kopia, n):
    return kopia.vyhodnot('[z for z in fronta.FRONTA if z["n"] == "%s"][0]' % n)


def test_novy_nalez_a_hned_zmeny_jeho_miesta_a_cakania_vo_fronte_v_jednom_zapise(kopia):
    u = kopia.udaje()
    ds, ctx = zapis_data.Dataset(kopia.priecinok), op.nacitaj_kontext()
    op.novy(ds, ctx, _novy(u, fronta={'davka': 'K65', 'co': 'Nová práca.', 'preco': 'JASNÉ (nový nález).', 'poradie': 1}))
    nova = str(ctx.pridelene)
    assert ctx.fronta[0]['n'] == nova
    op.fronta_presun(ds, ctx, nova, 3)
    assert [z['n'] for z in ctx.fronta][2] == nova
    op.fronta_caka(ds, ctx, nova, 'majiteľ', 'overiť')
    op.fronta_po(ds, ctx, nova, [u['fronta'][0]])
    tr.vykonaj(ds)
    ocakavana = list(u['fronta'])
    ocakavana.insert(2, nova)
    assert kopia.udaje()['fronta'] == ocakavana
    zaznam = _vo_fronte(kopia, nova)
    assert zaznam['caka'] == ['majiteľ', 'overiť'] and zaznam['po'] == [u['fronta'][0]]
    assert kopia.build_check()[0] == 0


def test_nalez_zapisany_a_hned_opraveny_v_jednom_zapise_skonci_v_hotovych(kopia):
    u = kopia.udaje()
    ds, ctx = zapis_data.Dataset(kopia.priecinok), op.nacitaj_kontext()
    op.novy(ds, ctx, _novy(u, fronta={'davka': 'K65', 'co': 'Nová práca.', 'preco': 'JASNÉ (nový nález).'}))
    nova = ctx.pridelene
    op.hotove(ds, ctx, {'n': nova, 'vetva': 'K65', 'zlucene': False, 'rucny_test': 'caka', 'text': 'HOTOVÉ hneď.'})
    tr.vykonaj(ds)
    nove = kopia.udaje()
    assert nova not in nove['otvorene'] and nova in nove['hotove'] and str(nova) not in nove['fronta']
    assert nove['posledne'] == u['posledne'] + 1


def test_nalez_zapisany_a_hned_zatvoreny_v_jednom_zapise_skonci_medzi_zatvorenymi(kopia):
    u = kopia.udaje()
    ds, ctx = zapis_data.Dataset(kopia.priecinok), op.nacitaj_kontext()
    op.novy(ds, ctx, _novy(u))
    nova = ctx.pridelene
    op.rozhodnutie(ds, ctx, {'tema': 't', 'otazka': 'o?', 'odporucanie': 'od', 'kedy': 'k', 'odpoved': 'Majiteľ: áno.', 'datum': '1. 12. 2026'})
    op.zatvor(ds, ctx, {'n': nova, 'rozhodnutie': ctx.pridelene_rozhodnutie, 'datum': '1. 12. 2026', 'text': 'ZATVORENÉ hneď.'})
    tr.vykonaj(ds)
    assert nova not in kopia.udaje()['otvorene']
    assert nova in kopia.vyhodnot('[d["n"] for d in zatvorene_dalsie.CLOSED_SINCE]', moduly='zatvorene_dalsie')


def test_hotove_zlucenie_a_rucny_test_v_jednom_zapise_vidia_zmeny_predosleho_kroku(kopia):
    u = kopia.udaje()
    n = next(n for n in u['otvorene'] if str(n) not in u['fronta'])
    ds, ctx = zapis_data.Dataset(kopia.priecinok), op.nacitaj_kontext()
    op.hotove(ds, ctx, {'n': n, 'vetva': 'K64', 'zlucene': False, 'rucny_test': 'caka', 'text': 'HOTOVÉ postupne.'})
    op.zlucene(ds, ctx, 'K64', '#345', 'abcd1234', None)
    op.rucny_test(ds, ctx, 'K64', 'neprešiel', '1. 12. 2026', None)
    op.rucny_test(ds, ctx, 'K64', 'prešiel', '2. 12. 2026', 'po oprave')
    with pytest.raises(op.ChybaVstupu, match='nemá zlúčenú položku, ktorá čaká na ručný test'):
        op.rucny_test(ds, ctx, 'K64', 'prešiel', '3. 12. 2026', None)  # uzavretá dávka sa už neotvára
    tr.vykonaj(ds)
    zapis = kopia.vyhodnot('[d for d in stav.DONE_SINCE if d["n"] == %d][0]' % n)
    assert (zapis['pr'], zapis['zlucene'], zapis['rucny_test']) == ('#345', True, 'prešiel')
    assert zapis['text'].index('neprešiel') < zapis['text'].index('po oprave')


def test_odstranenie_a_pridanie_do_fronty_v_jednom_zapise_nezmeni_cudzie_zaznamy(kopia):
    u = kopia.udaje()
    n = next(n for n in u['otvorene'] if str(n) not in u['fronta'])
    ds, ctx = zapis_data.Dataset(kopia.priecinok), op.nacitaj_kontext()
    op.fronta_odstran(ds, ctx, u['fronta'][1])
    op.fronta_pridaj(ds, ctx, {'n': str(n), 'davka': 'K65', 'co': 'c', 'preco': 'JASNÉ p', 'poradie': 2})
    op.fronta_presun(ds, ctx, u['fronta'][0], len(u['fronta']))
    tr.vykonaj(ds)
    ocakavana = [u['fronta'][0]] + [str(n)] + u['fronta'][2:]
    ocakavana = [i for i in ocakavana if i != u['fronta'][0]] + [u['fronta'][0]]
    assert kopia.udaje()['fronta'] == ocakavana


def test_dva_nove_nalezy_a_dve_rozhodnutia_v_jednom_zapise_dostanu_po_sebe_iduce_cisla(kopia):
    u = kopia.udaje()
    ds, ctx = zapis_data.Dataset(kopia.priecinok), op.nacitaj_kontext()
    op.novy(ds, ctx, _novy(u))
    prvy = ctx.pridelene
    op.novy(ds, ctx, _novy(u))
    druhy = ctx.pridelene
    op.rozhodnutie(ds, ctx, {'tema': 't1', 'otazka': 'o?', 'odporucanie': 'od', 'kedy': 'k'})
    r1 = ctx.pridelene_rozhodnutie
    op.rozhodnutie(ds, ctx, {'tema': 't2', 'otazka': 'o?', 'odporucanie': 'od', 'kedy': 'k'})
    r2 = ctx.pridelene_rozhodnutie
    assert (prvy, druhy) == (u['posledne'] + 1, u['posledne'] + 2)
    assert (r1, r2) == ('R%d' % (len(u['rozhodnutia']) + 1), 'R%d' % (len(u['rozhodnutia']) + 2))
    tr.vykonaj(ds)
    nove = kopia.udaje()
    assert nove['posledne'] == u['posledne'] + 2 and nove['rozhodnutia'][-2:] == [r1, r2]


def test_ten_isty_nalez_sa_neda_uzavriet_dvakrat_v_jednom_zapise(kopia):
    u = kopia.udaje()
    n = next(n for n in u['otvorene'] if str(n) not in u['fronta'])
    ds, ctx = zapis_data.Dataset(kopia.priecinok), op.nacitaj_kontext()
    op.hotove(ds, ctx, {'n': n, 'vetva': 'K64', 'zlucene': True, 'text': 'HOTOVÉ raz.'})
    with pytest.raises(op.ChybaVstupu, match='nie je otvorený'):
        op.hotove(ds, ctx, {'n': n, 'vetva': 'K64', 'zlucene': True, 'text': 'HOTOVÉ znova.'})


def test_nalez_vo_fronte_nemozno_pridat_znova_ani_po_odstraneni_a_vrateni_v_jednom_zapise(kopia):
    u = kopia.udaje()
    n = u['fronta'][0]
    ds, ctx = zapis_data.Dataset(kopia.priecinok), op.nacitaj_kontext()
    with pytest.raises(op.ChybaVstupu, match='už vo fronte je'):
        op.fronta_pridaj(ds, ctx, {'n': n, 'davka': 'K1', 'co': 'c', 'preco': 'JASNÉ p'})
    op.fronta_odstran(ds, ctx, n)
    op.fronta_pridaj(ds, ctx, {'n': n, 'davka': 'K1', 'co': 'c', 'preco': 'JASNÉ p', 'poradie': 1})
    with pytest.raises(op.ChybaVstupu, match='už vo fronte je'):
        op.fronta_pridaj(ds, ctx, {'n': n, 'davka': 'K1', 'co': 'c', 'preco': 'JASNÉ p'})
