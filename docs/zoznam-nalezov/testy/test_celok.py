# -*- coding: utf-8 -*-
"""Celkové testy skriptu `zapis.py` na skutočných dátach: uzavretie KAŽDÉHO otvoreného nálezu, výber vzoriek až po kontrolu modelu,
striedanie dvoch agentov, vzorové vstupy a rotácia súborov záznamov."""
import ast
import copy
import json
import re

import pytest

import fronta
import model
import stav
import zapis_data
import zapis_operacie as op
from conftest import ZDROJ, suhrn
from pomocky import otazka_pre_majitela

SABLONY = ZDROJ / 'sablony' / 'zapis'
M = model.zostav_model()
OTVORENE = sorted(int(i) for i in M.otvorene_id if i.isdigit())
ODPOVEDANE = [d['id'] for d in stav.DECISIONS if d.get('odpoved')]


def _nazov_zdroja(n):
    """Súbor, z ktorého sa otvorený nález odstraňuje."""
    return zapis_data.odstran_otvoreny_nalez(zapis_data.Dataset(ZDROJ), n)


ZDROJE_NALEZOV = {n: _nazov_zdroja(n) for n in OTVORENE}


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


def _cielovy_zaznamovy(predpona):
    """Súbor záznamov, do ktorého skript zapíše ďalší záznam (po naplnení súboru aj nový `…_NN.py`), takže testy nepredpokladajú `_01`."""
    return zapis_data.Dataset(ZDROJ).najnovsi_zaznamovy(predpona)


# ---------------------------------------------------------------- pomôcky na porovnanie zdrojov
def _cisla_prvkov(text):
    """Hodnoty `n` všetkých `dict(n=…)` v zoznamoch na úrovni modulu (v poradí) a kľúče slovníka `ORIG_OPEN`."""
    vysledok = []
    for uzol in ast.parse(text).body:
        if not isinstance(uzol, ast.Assign):
            continue
        if isinstance(uzol.value, ast.List):
            for prvok in uzol.value.elts:
                if isinstance(prvok, ast.Call) and isinstance(prvok.func, ast.Name) and prvok.func.id == 'dict':
                    for k in prvok.keywords:
                        if k.arg == 'n' and isinstance(k.value, ast.Constant):
                            vysledok.append(k.value.value)
        elif isinstance(uzol.value, ast.Dict) and any(getattr(c, 'id', None) == 'ORIG_OPEN' for c in uzol.targets):
            vysledok += [k.value for k in uzol.value.keys if isinstance(k, ast.Constant)]
    return vysledok


def _zmazany_blok(stary, novy):
    """Riadky, ktoré z `stary` zmizli, ak `novy` vznikol vyhodením jedného súvislého bloku riadkov; inak zlyhá."""
    s, n = stary.splitlines(True), novy.splitlines(True)
    zaciatok = 0
    while zaciatok < len(n) and s[zaciatok] == n[zaciatok]:
        zaciatok += 1
    koniec = 0
    while koniec < len(n) - zaciatok and s[len(s) - 1 - koniec] == n[len(n) - 1 - koniec]:
        koniec += 1
    assert s[:zaciatok] + s[len(s) - koniec:] == n, 'text nevznikol vyhodením jedného bloku riadkov'
    return s[zaciatok:len(s) - koniec]


def _je_jeden_prvok(blok, n):
    """Je blok riadkov presne jeden prvok zoznamu `dict(n=<n>, …)` alebo jedna položka slovníka `<n>: (…)`?"""
    for obal in ('X = [\n%s\n]\n', 'ORIG_OPEN = {\n%s\n}\n'):
        try:
            if _cisla_prvkov(obal % blok) == [n]:
                return True
        except SyntaxError:
            continue
    return False


class _BezPoloziek(ast.NodeTransformer):
    """Odstráni ID zo zoznamov v `polozky=…` (ostatné ostane nedotknuté)."""

    def __init__(self, identifikator):
        """Zapamätá ID, ktoré sa má odstrániť zo zoznamov `polozky`."""
        self.identifikator = identifikator

    def visit_keyword(self, uzol):
        """V kľúčovom slove `polozky` (aj v častiach súčtu zoznamov) vyhodí z každého zoznamu hľadané ID; ostatné kľúče nechá."""
        if uzol.arg == 'polozky':
            for zoznam in (u for u in ast.walk(uzol.value) if isinstance(u, ast.List)):  # aj časti súčtu `[…] + […]`
                zoznam.elts = [e for e in zoznam.elts if not (isinstance(e, ast.Constant) and e.value == self.identifikator)]
        return self.generic_visit(uzol)


def _over_uzavretie(zmeny, n, zaznamovy_subor):
    """Zmeny po uzavretí nálezu `n`: zo zdroja zmizol presne jeho prvok, z fronty a vĺn presne jeho ID a pribudol jeden záznam."""
    zdroj_nalezu = ZDROJE_NALEZOV[n]
    ocakavane = {zdroj_nalezu, zaznamovy_subor}
    if str(n) in [z['n'] for z in fronta.FRONTA]:
        ocakavane.add('fronta.py')
    if any(str(n) in v.get('polozky', []) for v in stav.PORADIE):
        ocakavane.add('stav.py')
    assert set(zmeny) == ocakavane, 'zmenili sa iné súbory, než sa čakalo'

    stary, novy = zmeny[zdroj_nalezu]
    assert _cisla_prvkov(novy) == [c for c in _cisla_prvkov(stary) if c != n]
    assert _je_jeden_prvok(''.join(_zmazany_blok(stary, novy)), n), 'vyhodený blok nie je presne nález %d' % n

    if 'fronta.py' in zmeny:
        stary, novy = zmeny['fronta.py']
        assert _cisla_prvkov(novy) == [c for c in _cisla_prvkov(stary) if c != str(n)]
        assert "n='%d'" % n in ''.join(_zmazany_blok(stary, novy))
    if 'stav.py' in zmeny:
        stary, novy = zmeny['stav.py']
        ocakavany_strom = _BezPoloziek(str(n)).visit(ast.parse(stary))
        assert ast.dump(ocakavany_strom) == ast.dump(ast.parse(novy))

    stary, novy = zmeny[zaznamovy_subor]
    assert _cisla_prvkov(novy) == _cisla_prvkov(stary or '') + [n]


# ---------------------------------------------------------------- každý otvorený nález
def test_vychodzi_stav_kopie_je_platny(kopia):
    """Východiskový stav kópie dát prejde kontrolou `build.py --check`."""
    kod, vystup = kopia.build_check()
    assert kod == 0, vystup


def test_otvorene_nalezy_su_najdene_v_zdrojoch_a_pocet_zodpoveda_skupinam():
    """Každý otvorený nález sa nájde v niektorom zo zdrojov nálezov (`polozky_povodne`, `polozky_nove*`, `zaznamy_nove_NN`)
    a ich počet sa zhoduje so súčtom nálezov v skupinách."""
    assert len(OTVORENE) == sum(M.pocty.nalezy.values())
    assert set(ZDROJE_NALEZOV.values()) <= {'polozky_povodne.py'} | {f.name for f in ZDROJ.glob('polozky_nove*.py')} | {
        f.name for f in ZDROJ.glob('zaznamy_nove_[0-9][0-9].py')}


@pytest.mark.parametrize('n', OTVORENE, ids=['n%d' % n for n in OTVORENE])
def test_otvoreny_nalez_sa_da_presunut_do_hotovych_bez_poskodenia_zdrojov(kontext0, n):
    """Každý otvorený nález (jeden test na nález) sa dá presunúť do hotových tak, že zo zdroja zmizne presne jeho prvok,
    zo fronty a vĺn presne jeho ID a pribudne jeden záznam."""
    ds = zapis_data.Dataset(ZDROJ)
    op.hotove(ds, _kontext(kontext0), {'n': n, 'vetva': 'K64', 'zlucene': False, 'rucny_test': 'caka', 'text': 'HOTOVÉ test.'})
    _over_uzavretie(ds.zmeny(), n, _cielovy_zaznamovy('zaznamy_hotove'))


@pytest.mark.parametrize('n', OTVORENE, ids=['n%d' % n for n in OTVORENE])
def test_otvoreny_nalez_sa_da_zatvorit_rozhodnutim_bez_poskodenia_zdrojov(kontext0, n):
    """Každý otvorený nález (jeden test na nález) sa dá zatvoriť rozhodnutím tak, že zo zdroja zmizne presne jeho prvok,
    zo fronty a vĺn presne jeho ID a pribudne jeden záznam zatvoreného."""
    ds = zapis_data.Dataset(ZDROJ)
    op.zatvor(ds, _kontext(kontext0), {'n': n, 'rozhodnutie': ODPOVEDANE[-1], 'datum': '27. 11. 2026', 'text': 'ZATVORENÉ test.'})
    _over_uzavretie(ds.zmeny(), n, _cielovy_zaznamovy('zaznamy_zatvorene'))


class _PridajOdpoved(ast.NodeTransformer):
    """Doplní do `dict(id='<id>', …)` kľúče `odpoved` a `datum` (ostatné ostane nedotknuté)."""

    def __init__(self, identifikator, odpoved, datum):
        """Zapamätá `id` rozhodnutia a odpoveď s dátumom, ktoré sa majú doplniť."""
        self.identifikator, self.odpoved, self.datum = identifikator, odpoved, datum

    def visit_Call(self, uzol):
        """Do volania `dict(id=<id>, …)` pridá kľúče `odpoved` a `datum`; ostatné volania nechá."""
        if isinstance(uzol.func, ast.Name) and uzol.func.id == 'dict' and any(
                k.arg == 'id' and isinstance(k.value, ast.Constant) and k.value.value == self.identifikator for k in uzol.keywords):
            uzol.keywords += [ast.keyword(arg='odpoved', value=ast.Constant(self.odpoved)), ast.keyword(arg='datum', value=ast.Constant(self.datum))]
        return self.generic_visit(uzol)


NEZODPOVEDANE = [d['id'] for d in stav.DECISIONS if not d.get('odpoved')]


@pytest.mark.parametrize('identifikator', NEZODPOVEDANE)
def test_kazde_nezodpovedane_rozhodnutie_sa_da_zodpovedat_bez_poskodenia_zdrojov(kontext0, identifikator):
    """Každé rozhodnutie bez odpovede (jeden test na rozhodnutie) sa dá zodpovedať tak, že sa zmení jediný súbor
    a pribudnú presne kľúče `odpoved` a `datum`."""
    ds = zapis_data.Dataset(ZDROJ)
    op.rozhodnutie(ds, _kontext(kontext0), {'id': identifikator, 'odpoved': "Majiteľ: súhlas, it's | ok.", 'datum': '27. 11. 2026'})
    zmeny = ds.zmeny()
    assert len(zmeny) == 1, 'odpoveď má zmeniť jediný súbor'
    stary, novy = next(iter(zmeny.values()))
    ocakavany = _PridajOdpoved(identifikator, "Majiteľ: súhlas, it's | ok.", '27. 11. 2026').visit(ast.parse(stary))
    assert ast.dump(ocakavany) == ast.dump(ast.parse(novy))
    assert novy.count('\n') >= stary.count('\n') + 2


# ---------------------------------------------------------------- vzorka cez celý zápis s kontrolou modelu
def _vzorka():
    """Prvý a posledný nález z každého súboru, z ktorého sa nálezy odstraňujú."""
    podla_suboru = {}
    for n, nazov in ZDROJE_NALEZOV.items():
        podla_suboru.setdefault(nazov, []).append(n)
    return sorted({n for cisla in podla_suboru.values() for n in (min(cisla), max(cisla))})


def test_vzorka_nalezov_zo_vsetkych_zdrojov_prejde_celym_zapisom_s_kontrolou_modelu(kopia):
    """Vzorka (prvý a posledný nález z každého zdroja) prejde striedavo príkazmi `hotove` a `zatvor` s kontrolou modelu:
    počty skupín a hotových sedia a nálezy už nie sú otvorené."""
    vzorka = _vzorka()
    zaklad = suhrn(kopia.spusti('build.py')[1])
    for i, n in enumerate(vzorka):
        if i % 2 == 0:
            vstup = {'n': n, 'vetva': 'K%d' % (70 + i), 'zlucene': True, 'text': 'HOTOVÉ vzorka.'}
            kod, vystup = kopia.zapis('hotove', '--json', kopia.json('v.json', vstup))
        else:
            vstup = {'n': n, 'rozhodnutie': ODPOVEDANE[-1], 'datum': '27. 11. 2026', 'text': 'ZATVORENÉ vzorka.'}
            kod, vystup = kopia.zapis('zatvor', '--json', kopia.json('v.json', vstup))
        assert kod == 0, 'nález %d: %s' % (n, vystup)
    po = suhrn(kopia.spusti('build.py')[1])
    assert po['spolu'] == zaklad['spolu']
    assert po['hotove'] == zaklad['hotove'] + (len(vzorka) + 1) // 2
    assert po['hned'] + po['pred'] + po['po'] == zaklad['hned'] + zaklad['pred'] + zaklad['po'] - len(vzorka)
    assert kopia.build_check()[0] == 0
    assert not set(vzorka) & set(kopia.udaje()['otvorene'])


def test_ten_isty_nalez_sa_neda_uzavriet_dvakrat(kopia):
    """Ten istý nález sa po `hotove` nedá uzavrieť druhýkrát ani ďalším `hotove`, ani `zatvor` (kód 2, nič sa nezmení)."""
    n = OTVORENE[0]
    vstup = kopia.json('h.json', {'n': n, 'vetva': 'K64', 'zlucene': True, 'text': 'HOTOVÉ raz.'})
    assert kopia.zapis('hotove', '--json', vstup)[0] == 0
    zapisane = kopia.snimka()
    kod, vystup = kopia.zapis('hotove', '--json', vstup)
    assert kod == 2 and 'nie je otvorený' in vystup and kopia.snimka() == zapisane
    kod, vystup = kopia.zapis('zatvor', '--json', kopia.json('z.json', {'n': n, 'rozhodnutie': ODPOVEDANE[-1], 'datum': '1. 1. 2027',
                                                                         'text': 'ZATVORENÉ po hotovom.'}))
    assert kod == 2 and kopia.snimka() == zapisane


# ---------------------------------------------------------------- striedanie dvoch agentov
def test_dvaja_agenti_striedavo_prejdu_celym_cyklom_dvoch_davok(kopia):
    """Dvaja agenti striedavo prejdú dvoma dávkami: A zapíše nález z mapovania a dokončí prvú položku, B vybaví zlúčenie,
    majiteľ zapíše neúspešný ručný test, B zaradí nález z testu a opraví ďalší; po úspešnom teste sú obe dávky uzavreté
    a `stav` v každom kroku hovorí, čo čaká."""
    u = kopia.udaje()
    prva, druha = u['fronta'][:2]

    # Agent A (štart): nič nečaká, berie prvú voľnú položku fronty
    stav_a = kopia.zapis('stav')[1]
    assert 'nič nečaká na zlúčenie ani na ručný test' in stav_a and 'prvá voľná: č. %s' % prva in stav_a

    # A pri mapovaní nájde nový nález a zaradí ho hneď za svoju položku; prvú dokončí s ručným testom
    novy = kopia.json('n.json', {'skupina': 'P', 'dopad': 'S', 'zlozitost': 'S', 'balik': u['baliky']['P'][0], 'kratko': 'nález z mapovania',
                                 'co': 'Zistené pri mapovaní.', 'poznamka': 'JASNÉ.', 'zdroj': 'mapovanie K64',
                                 'fronta': {'davka': 'K65', 'co': 'Oprava nového nálezu.', 'preco': 'JASNÉ (zistené pri K64).', 'poradie': 2}})
    vystup = kopia.zapis('novy', '--json', novy)[1]
    nova = u['posledne'] + 1
    assert '=> Pridelené číslo nálezu: %d' % nova in vystup
    kod, vystup = kopia.zapis('hotove', '--json', kopia.json('h.json', {
        'n': int(prva), 'vetva': 'K64', 'pr': '#345', 'zlucene': False, 'rucny_test': 'caka', 'text': 'HOTOVÉ (K64, PR #345). Dopad na E2E: žiadny.'}))
    assert kod == 0, vystup
    assert kopia.udaje()['fronta'][:2] == [str(nova), druha]

    # B (po zlúčení vetvy K64): vybaví zlúčenie a vidí, že čaká ručný test
    stav_b = kopia.zapis('stav')[1]
    assert 'čaká na zlúčenie: č. %s (vetva K64, PR #345)' % prva in stav_b
    kod, vystup = kopia.zapis('zlucene', '--vetva', 'K64', '--pr', '#345', '--merge', 'abcd1234', '--cas', '27. 11. 2026 o 12:07 UTC')
    assert kod == 0 and suhrn(vystup)['caka_rucny'] == 1
    assert 'čaká na ručný test alebo opravu po ňom: č. %s (vetva K64, caka)' % prva in kopia.zapis('stav')[1]

    # majiteľ: ručný test neprešiel a odhalil nález, ktorý B zapíše a zaradí na začiatok fronty; dávka ostáva neuzavretá
    kod, vystup = kopia.zapis('rucny-test', '--vetva', 'K64', '--vysledok', 'neprešiel', '--datum', '28. 11. 2026', '--poznamka', 'nález %d' % (nova + 1))
    assert kod == 0 and suhrn(vystup)['caka_rucny'] == 1
    kod, vystup = kopia.zapis('novy', '--json', kopia.json('n2.json', {
        'skupina': 'P', 'dopad': 'S', 'zlozitost': 'S', 'balik': u['baliky']['P'][0], 'kratko': 'z ručného testu', 'co': 'Zistené ručným testom.',
        'poznamka': 'JASNÉ.', 'zdroj': 'ručný test po K64', 'fronta': {'davka': 'K65', 'co': 'Oprava nálezu z testu.', 'preco': 'JASNÉ.', 'poradie': 1}}))
    assert kod == 0 and '=> Pridelené číslo nálezu: %d' % (nova + 1) in vystup
    assert kopia.udaje()['fronta'][0] == str(nova + 1)

    # B berie prvú voľnú položku, majiteľ musí rozhodnúť o druhej: `fronta caka` ju preskočí
    kopia.zapis('fronta', 'caka', str(nova + 1), '--kto', 'majiteľ', '--text', 'schváliť vzhľad opravy')
    stav_b2 = kopia.zapis('stav')[1]
    assert 'prvá voľná: č. %s' % str(nova) in stav_b2 and 'č. %d čaká na majiteľa: schváliť vzhľad opravy' % (nova + 1) in stav_b2

    # B opraví (nova), zapíše hotové s vlastným ručným testom; stav ukáže obe neuzavreté dávky
    kod, vystup = kopia.zapis('hotove', '--json', kopia.json('h2.json', {
        'n': nova, 'vetva': 'K65', 'pr': '#346', 'zlucene': False, 'rucny_test': 'caka', 'text': 'HOTOVÉ (K65, PR #346).'}))
    assert kod == 0, vystup
    kopia.zapis('zlucene', '--vetva', 'K65', '--pr', '#346')

    # A (po zlúčení K65): majiteľ po oprave zopakoval test: prešiel pre obe vetvy, až teraz sú uzavreté
    for vetva in ('K64', 'K65'):
        kod, vystup = kopia.zapis('rucny-test', '--vetva', vetva, '--vysledok', 'prešiel', '--datum', '29. 11. 2026')
        assert kod == 0, vystup
    posledny = suhrn(vystup)
    assert posledny['caka_rucny'] == 0 and posledny['caka_zlucenie'] == 0
    assert 'nič nečaká na zlúčenie ani na ručný test' in kopia.zapis('stav')[1]
    assert kopia.build_check()[0] == 0


def test_kazdy_agent_vidi_to_co_zapisal_druhy_aj_po_dalsich_zapisoch(kopia):
    """Zápis druhého agenta sa opiera o stav z disku: čísla nálezov a rozhodnutí sa nikdy neopakujú."""
    u = kopia.udaje()
    vstup = {'skupina': 'A', 'dopad': 'N', 'zlozitost': 'L', 'balik': u['baliky']['A'][0], 'kratko': 'a', 'co': 'b', 'poznamka': 'c', 'zdroj': 'd'}
    cisla = []
    for i in range(3):
        vystup = kopia.zapis('novy', '--json', kopia.json('n%d.json' % i, vstup))[1]
        cisla.append(int(re.search(r'Pridelené číslo nálezu: (\d+)', vystup).group(1)))
        vystup = kopia.zapis('rozhodnutie', '--json', kopia.json('r%d.json' % i, {'tema': 't', 'otazka': 'o?', 'odporucanie': 'od', 'kedy': 'k'}))[1]
    assert cisla == [u['posledne'] + 1, u['posledne'] + 2, u['posledne'] + 3]
    assert kopia.udaje()['rozhodnutia'][-3:] == ['R%d' % (len(u['rozhodnutia']) + i) for i in (1, 2, 3)]


# ---------------------------------------------------------------- vzorové vstupy
def _nacitaj_sablonu(nazov):
    """Načíta vzorový vstup `nazov` zo `sablony/zapis` bez kľúčov začínajúcich podčiarkovníkom (poznámok)."""
    def bez_poznamok(h):
        """Rekurzívne vyhodí zo slovníkov kľúče začínajúce podčiarkovníkom."""
        if isinstance(h, dict):
            return {k: bez_poznamok(v) for k, v in h.items() if not k.startswith('_')}
        return [bez_poznamok(v) for v in h] if isinstance(h, list) else h
    return bez_poznamok(json.loads((SABLONY / nazov).read_text(encoding='utf-8')))


@pytest.mark.parametrize('nazov', sorted(p.name for p in SABLONY.glob('*.json')))
def test_vzorove_vstupy_su_platne_pre_prikaz_na_ktory_su_urcene(kopia, nazov):
    """Každý vzorový vstup (`sablony/zapis/*.json`) je po dosadení čísla otvoreného nálezu alebo nezodpovedaného rozhodnutia
    platný pre svoj príkaz: suchý beh skončí kódom 0 a nič nezmení."""
    nezodpovedane = otazka_pre_majitela(kopia) if nazov == 'rozhodnutie-odpoved.json' else None  # vlastná otázka, nie z živých dát
    u = kopia.udaje()
    volny = next(n for n in u['otvorene'] if str(n) not in u['fronta'])
    vstup = _nacitaj_sablonu(nazov)
    if nazov == 'hotove.json' or nazov == 'zatvor.json':
        vstup['n'] = volny  # vzor ukazuje číslo, ktoré sa časom uzavrie: dosadí sa otvorený nález
    if nazov == 'fronta-pridaj.json':
        vstup['n'] = str(volny)
    if nazov == 'rozhodnutie-odpoved.json':
        vstup['id'] = nezodpovedane  # vzor ukazuje budúce číslo R<n>
    prikaz = {'novy.json': ['novy'], 'hotove.json': ['hotove'], 'zatvor.json': ['zatvor'], 'zmena.json': ['zmena'],
              'rozhodnutie.json': ['rozhodnutie'], 'rozhodnutie-odpoved.json': ['rozhodnutie'],
              'fronta-pridaj.json': ['fronta', 'pridaj']}[nazov]
    pred = kopia.snimka()
    kod, vystup = kopia.zapis('--na-sucho', *prikaz, '--json', kopia.json('v.json', vstup))
    assert kod == 0, vystup
    assert kopia.snimka() == pred


def test_kazda_sablona_ma_prikaz_a_ziadny_prikaz_nema_sablonu_navyse():
    """Zoznam vzorových vstupov je presne taký, aký sa čaká: každý príkaz s JSON vstupom má šablónu a žiadna nie je navyše."""
    assert sorted(p.stem for p in SABLONY.glob('*.json')) == ['fronta-pridaj', 'hotove', 'novy', 'rozhodnutie', 'rozhodnutie-odpoved', 'zatvor', 'zmena']


# ---------------------------------------------------------------- rotácia súborov záznamov
def _dalsi_subor(nazov):
    """Názov nasledujúceho súboru záznamov: `zaznamy_nove_03.py` -> `zaznamy_nove_04.py`."""
    return '%s%02d.py' % (nazov[:-5], int(nazov[-5:-3]) + 1)


def test_zaznamy_sa_po_naplneni_suboru_zapisuju_do_nasledujuceho_a_vsetky_sa_nacitaju(kopia):
    """Po naplnení súboru nových nálezov (nízky limit cez `ZAPIS_ROTACIA_RIADKOV`) sa ďalšie zapisujú do nasledujúceho
    `zaznamy_nove_NN.py`; všetky sa načítajú a nález zo starého aj z nového súboru sa dá uzavrieť."""
    najnovsi = kopia.posledny_zaznamovy('zaznamy_nove')
    dalsi = _dalsi_subor(najnovsi)
    riadkov = len(kopia.text(najnovsi).splitlines())
    env = {'ZAPIS_ROTACIA_RIADKOV': str(riadkov + 15)}
    u = kopia.udaje()
    vstup = {'skupina': 'P', 'dopad': 'S', 'zlozitost': 'S', 'balik': u['baliky']['P'][0], 'kratko': 'k', 'co': 'Čo.', 'poznamka': 'JASNÉ.', 'zdroj': 'z'}
    vytvorene = []
    for i in range(6):
        kod, vystup = kopia.zapis('novy', '--json', kopia.json('n%d.json' % i, dict(vstup, co='Nález %d.' % i)), env=env)
        assert kod == 0, vystup
        vytvorene.append(u['posledne'] + 1 + i)
        if (kopia.priecinok / dalsi).exists():
            break
    else:
        pytest.fail('nasledujúci súbor záznamov nevznikol')
    assert len(vytvorene) >= 2 and kopia.text(dalsi).count('dict(n=') == 1
    assert len(kopia.text(najnovsi).splitlines()) > riadkov + 15
    assert set(vytvorene) <= set(kopia.udaje()['otvorene']) and kopia.build_check()[0] == 0

    # nález zo staršieho aj z nového súboru sa dá uzavrieť
    for n in (vytvorene[0], vytvorene[-1]):
        kod, vystup = kopia.zapis('hotove', '--json', kopia.json('h.json', {'n': n, 'vetva': 'K64', 'zlucene': True, 'text': 'HOTOVÉ.'}), env=env)
        assert kod == 0, vystup
    assert not {vytvorene[0], vytvorene[-1]} & set(kopia.udaje()['otvorene'])
    assert kopia.build_check()[0] == 0


def test_hotove_zaznamy_sa_po_naplneni_suboru_zapisuju_do_nasledujuceho(kopia):
    """Po naplnení súboru hotových (nízky limit rotácie) sa ďalšie `hotove` zapisujú do nasledujúceho súboru
    a `zlucene` označí položky v oboch súboroch."""
    najnovsi = kopia.posledny_zaznamovy('zaznamy_hotove')
    dalsi = _dalsi_subor(najnovsi)
    riadkov = len(kopia.text(najnovsi).splitlines())
    env = {'ZAPIS_ROTACIA_RIADKOV': str(riadkov + 3)}
    u = kopia.udaje()
    volne = [n for n in u['otvorene'] if str(n) not in u['fronta']][:4]
    for n in volne:
        kod, vystup = kopia.zapis('hotove', '--json', kopia.json('h.json', {'n': n, 'vetva': 'K64', 'zlucene': False, 'text': 'HOTOVÉ.'}), env=env)
        assert kod == 0, vystup
    assert (kopia.priecinok / dalsi).exists()
    kod, vystup = kopia.zapis('zlucene', '--vetva', 'K64', '--pr', '#350', env=env)  # označí položky v oboch súboroch
    assert kod == 0 and suhrn(vystup)['caka_zlucenie'] == 0
    assert all(d['zlucene'] for d in kopia.vyhodnot('[d for d in stav.DONE_SINCE if d["vetva"] == "K64"]'))
