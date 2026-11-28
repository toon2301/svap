# -*- coding: utf-8 -*-
"""Testy zápisu „všetko alebo nič“: kontrola modelu po zápise, vrátenie zmien pri chybe a suchý beh v dočasnej kópii."""
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

import zapis_data
import zapis_operacie as op
import zapis_transakcia as tr
from zapis_zdroj import Zdroj

PRAZDNE_HOTOVE = '# -*- coding: utf-8 -*-\nDONE_SINCE_ZAZNAMY = [\n]\nDONE_PR_TABLE_CASTOCNE_ZAZNAMY = [\n]\n'


def _pokaz_frontu(ds):
    """Zmena, ktorú model odmietne: `preco` prvého záznamu fronty nezačína slovom JASNÉ ani NEJASNÉ."""
    z = ds.zdroj('fronta.py')
    pokazene = re.sub(r"preco='(NE)?JASNÉ", "preco='ZLE", z.text, count=1)
    assert pokazene != z.text
    ds.nastav('fronta.py', Zdroj(pokazene, 'fronta.py'))


def _zmen_tri_subory(kopia):
    """`Dataset` s tromi zmenenými súbormi (len komentár na konci, model ho prijme)."""
    ds = zapis_data.Dataset(kopia.priecinok)
    for nazov in ('fronta.py', 'konstanty.py', 'stav.py'):
        ds.nastav(nazov, Zdroj(ds.zdroj(nazov).text + '\n# zmena\n', nazov))
    return ds


def _neobnovene(pred, po):
    """Názvy súborov, ktorých obsah v snímke `po` nie je taký ako v snímke `pred` (neobnovené po chybe)."""
    return sorted(n for n in pred if po.get(n) != pred[n])


def test_zmena_ktoru_model_odmietne_sa_vrati_aj_s_novym_suborom(kopia):
    """Zmena, ktorú model po zápise odmietne (pokazený `preco` vo fronte), sa celá vráti: všetky súbory sú ako predtým
    a novozaložený súbor záznamov zmizne."""
    ds = zapis_data.Dataset(kopia.priecinok)
    _pokaz_frontu(ds)
    ds.vytvor('zaznamy_hotove_99.py', PRAZDNE_HOTOVE)
    pred = kopia.snimka()
    with pytest.raises(tr.ChybaKontroly, match='JASNÉ'):
        tr.vykonaj(ds)
    assert kopia.snimka() == pred
    assert not (kopia.priecinok / 'zaznamy_hotove_99.py').exists()
    assert kopia.build_check()[0] == 0


def test_zoznam_nalezov_sa_obnovi_aj_ked_ho_generator_stihol_prepisat(kopia, monkeypatch):
    """Ak generátor pri neúspešnej kontrole stihol prepísať `ZOZNAM.md`, vráti sa aj ten (rovnako ako zmenený dátový súbor)."""
    ds = zapis_data.Dataset(kopia.priecinok)
    ds.nastav('fronta.py', Zdroj(ds.zdroj('fronta.py').text + '\n# zmena\n', 'fronta.py'))
    pred = kopia.text('ZOZNAM.md')

    def pokazeny_build(priecinok, argumenty=()):
        """Náhrada `spusti_build`: prepíše `ZOZNAM.md` poškodeným textom a ohlási zlyhanie (kód 1)."""
        (priecinok / 'ZOZNAM.md').write_text('POŠKODENÝ VÝSTUP', encoding='utf-8')
        return 1, 'generátor zlyhal'

    monkeypatch.setattr(tr, 'spusti_build', pokazeny_build)
    with pytest.raises(tr.ChybaKontroly, match='generátor zlyhal'):
        tr.vykonaj(ds)
    assert kopia.text('ZOZNAM.md') == pred
    assert '# zmena' not in kopia.text('fronta.py')


def test_prerusenie_pocas_zapisu_vrati_aj_uz_zapisane_subory(kopia, monkeypatch):
    """Prerušenie (`KeyboardInterrupt`) pri zápise druhého zo troch súborov vráti aj už zapísaný prvý súbor; všetko je ako
    predtým."""
    ds = _zmen_tri_subory(kopia)
    pred = kopia.snimka()
    povodny_zapis, volania = tr._zapis, []

    def prerusovany(cesta, text):
        """Náhrada `_zapis`: druhé volanie sa preruší `KeyboardInterrupt`, ostatné zapíšu normálne."""
        volania.append(cesta)
        if len(volania) == 2:
            raise KeyboardInterrupt
        povodny_zapis(cesta, text)

    monkeypatch.setattr(tr, '_zapis', prerusovany)
    with pytest.raises(KeyboardInterrupt):
        tr.vykonaj(ds)
    monkeypatch.setattr(tr, '_zapis', povodny_zapis)
    assert kopia.snimka() == pred


def test_prerusenie_po_skrateni_suboru_vrati_povodny_obsah_aj_tohto_suboru(kopia, monkeypatch):
    """Prerušenie, keď sa druhý súbor už začal prepisovať (je skrátený), vráti aj jeho pôvodný obsah; nález bota (PR 345):
    súbor s prerušeným zápisom nesmie vypadnúť z obnovy."""
    ds = _zmen_tri_subory(kopia)
    pred = kopia.snimka()
    povodny_zapis, volania = tr._zapis, []

    def trhajuci(cesta, text):
        """Náhrada `_zapis`: pri druhom volaní súbor skráti a zápis preruší; ostatné volania zapíšu normálne."""
        volania.append(cesta)
        if len(volania) == 2:  # súbor sa už začal prepisovať (je skrátený) a zápis padne: dnes by ostal poškodený
            cesta.write_text(text[:20], encoding='utf-8')
            raise KeyboardInterrupt
        povodny_zapis(cesta, text)

    monkeypatch.setattr(tr, '_zapis', trhajuci)
    with pytest.raises(KeyboardInterrupt):
        tr.vykonaj(ds)
    monkeypatch.setattr(tr, '_zapis', povodny_zapis)
    assert kopia.snimka() == pred


def test_zapis_cez_docasny_subor_pri_chybe_necha_povodny_subor_a_nezanecha_docasny(kopia, monkeypatch):
    """Zápis ide cez dočasný súbor: ak zlyhá nahradenie cieľa, pôvodný súbor ostane nedotknutý a dočasný súbor sa zmaže."""
    cesta = kopia.priecinok / 'fronta.py'
    pred = cesta.read_bytes()

    def zle_nahradenie(zdroj, ciel):
        """Náhrada `os.replace`: vždy zlyhá s `OSError` „disk plný“."""
        raise OSError('disk plný')

    monkeypatch.setattr(tr.os, 'replace', zle_nahradenie)
    with pytest.raises(OSError, match='disk plný'):
        tr._zapis(cesta, 'NOVÝ OBSAH')
    assert cesta.read_bytes() == pred
    assert not list(kopia.priecinok.glob('*.tmp'))


def test_uspesny_zapis_nezanecha_docasne_subory(kopia):
    """Po úspešnom zápise neostane v priečinku zoznamu žiadny dočasný súbor `*.tmp`."""
    ds = zapis_data.Dataset(kopia.priecinok)
    op.zmena(ds, op.nacitaj_kontext(), {'datum': '27. 11. 2026', 'text': 'Bez zvyškov.'})
    tr.vykonaj(ds)
    assert not list(kopia.priecinok.glob('*.tmp'))


def test_chyba_obnovy_nezastavi_obnovu_ostatnych_suborov_a_povie_ktore_zlyhali(kopia, monkeypatch):
    """Ak po neúspešnej kontrole zlyhá obnova jedného súboru, obnovia sa ostatné; `ChybaObnovy` pomenuje neobnovený súbor,
    pôvodnú chybu aj dôvod zlyhania a jeho pôvodný obsah je v zálohe."""
    ds = _zmen_tri_subory(kopia)
    pred = kopia.snimka()
    monkeypatch.setattr(tr, 'spusti_build', lambda *a, **kw: (1, 'build zlyhal'))
    povodny_zapis, volania = tr._zapis, []

    def obnova_zlyha(cesta, text):
        """Náhrada `_zapis`: tri zápisy prejdú, štvrté volanie (prvý pokus o obnovu) zlyhá s `OSError`."""
        volania.append(cesta)
        if len(volania) == 4:  # tri zápisy a prvý pokus o obnovu
            raise OSError('disk plný')
        povodny_zapis(cesta, text)

    monkeypatch.setattr(tr, '_zapis', obnova_zlyha)
    with pytest.raises(tr.ChybaObnovy) as vynimka:
        tr.vykonaj(ds)
    monkeypatch.setattr(tr, '_zapis', povodny_zapis)
    sprava = str(vynimka.value)
    neobnovene = _neobnovene(pred, kopia.snimka())
    assert len(neobnovene) == 1, 'ostatné súbory sa mali obnoviť aj po chybe pri prvom'
    assert neobnovene[0] in sprava and 'disk plný' in sprava and 'build zlyhal' in sprava and 'NEPODARILO SA VRÁTIŤ' in sprava
    zaloha = Path(re.search(r'uložený v (\S+)\.', sprava).group(1))
    try:
        assert (zaloha / neobnovene[0]).read_bytes() == pred[neobnovene[0]]
    finally:
        shutil.rmtree(zaloha, ignore_errors=True)


def test_chyba_pri_obnove_zoznamu_nezastavi_obnovu_ostatnych_suborov(kopia, monkeypatch):
    """Keď sa nedá obnoviť `ZOZNAM.md`, ostatné súbory sa obnovia; neobnovený je len on a jeho pôvodný obsah je v zálohe."""
    ds = _zmen_tri_subory(kopia)
    pred = kopia.snimka()

    def pokazeny_build(priecinok, argumenty=()):
        """Náhrada `spusti_build`: prepíše `ZOZNAM.md` poškodeným textom a ohlási zlyhanie (kód 1)."""
        (priecinok / 'ZOZNAM.md').write_text('POŠKODENÝ VÝSTUP', encoding='utf-8')
        return 1, 'generátor zlyhal'

    monkeypatch.setattr(tr, 'spusti_build', pokazeny_build)
    povodny_zapis = tr._zapis

    def zoznam_nejde_obnovit(cesta, text):
        """Náhrada `_zapis`: zápis `ZOZNAM.md` zlyhá s `OSError`, ostatné súbory sa zapíšu normálne."""
        if cesta.name == 'ZOZNAM.md':
            raise OSError('zoznam je zamknutý')
        povodny_zapis(cesta, text)

    monkeypatch.setattr(tr, '_zapis', zoznam_nejde_obnovit)
    with pytest.raises(tr.ChybaObnovy) as vynimka:
        tr.vykonaj(ds)
    monkeypatch.setattr(tr, '_zapis', povodny_zapis)
    assert _neobnovene(pred, kopia.snimka()) == ['ZOZNAM.md']
    sprava = str(vynimka.value)
    assert 'ZOZNAM.md' in sprava and 'zoznam je zamknutý' in sprava
    zaloha = Path(re.search(r'uložený v (\S+)\.', sprava).group(1))
    try:
        assert (zaloha / 'ZOZNAM.md').read_bytes() == pred['ZOZNAM.md']
    finally:
        shutil.rmtree(zaloha, ignore_errors=True)


def test_operacia_ktora_nic_nezmenila_je_chyba_kontroly(kopia):
    """Transakcia bez zmeny (prázdny `Dataset`) je `ChybaKontroly` „nič nezmenila“."""
    with pytest.raises(tr.ChybaKontroly, match='nič nezmenila'):
        tr.vykonaj(zapis_data.Dataset(kopia.priecinok))


def test_uspesny_zapis_zapise_zmenene_subory_a_znovu_vygeneruje_zoznam(kopia):
    """Úspešný zápis zmení len dátový súbor a vygenerovaný `ZOZNAM.md`; výstup obsahuje súhrn a `build.py --check` prejde."""
    ds = zapis_data.Dataset(kopia.priecinok)
    op.zmena(ds, op.nacitaj_kontext(), {'datum': '27. 11. 2026', 'text': 'Skúška zápisu.'})
    pred = kopia.snimka()
    vystup = tr.vykonaj(ds)
    po = kopia.snimka()
    assert set(k for k in po if po[k] != pred.get(k)) == {'stav.py', 'ZOZNAM.md'}
    assert 'Nálezy spolu' in vystup
    assert kopia.build_check()[0] == 0


def _zastarane_pyc_s_novym_datumom(kopia):
    """Vytvorí `.pyc` a potom zmení dátum hlavičky v `stav.py` na iný text rovnakej dĺžky, pri rovnakom čase úpravy (staré `.pyc`
    by sa tak zdalo platné). Vráti (nový dátum, prostredie bez zákazu zápisu `.pyc`)."""
    env = {k: v for k, v in os.environ.items() if k != 'PYTHONDONTWRITEBYTECODE'}
    beh = subprocess.run([sys.executable, 'build.py'], cwd=str(kopia.priecinok), env=env, capture_output=True, text=True)
    assert beh.returncode == 0 and (kopia.priecinok / '__pycache__').is_dir()
    stav_py = kopia.priecinok / 'stav.py'
    povodny = stav_py.stat()
    text = stav_py.read_text(encoding='utf-8')
    najdene = re.search(r"STAV = dict\(\s*datum='([^']+)'", text)
    stary = najdene.group(1)
    novy = stary[:-1] + ('1' if stary[-1] != '1' else '2')
    nova = text[:najdene.start(1)] + novy + text[najdene.end(1):]
    assert nova != text and len(nova.encode()) == len(text.encode())
    stav_py.write_text(nova, encoding='utf-8')
    os.utime(stav_py, ns=(povodny.st_atime_ns, povodny.st_mtime_ns))
    return novy, env


def test_kontrola_modelu_nevidi_stare_pyc_subory_ani_ked_zdroj_ma_rovnaky_cas_aj_velkost(kopia):
    """Kontrola modelu (`spusti_build`) nepoužije zastarané `.pyc`, ani keď má zmenený zdroj rovnaký čas úpravy aj veľkosť:
    `ZOZNAM.md` obsahuje nový dátum."""
    novy, _env = _zastarane_pyc_s_novym_datumom(kopia)
    kod, vystup = tr.spusti_build(kopia.priecinok)
    assert kod == 0, vystup
    assert novy in kopia.text('ZOZNAM.md')


def test_skript_cita_aktualne_data_aj_ked_stare_pyc_vyzera_platne(kopia):
    """`zapis.py stav` číta aktuálne dáta, aj keď je v priečinku zastarané `.pyc`, ktoré vyzerá platne (rovnaký čas a veľkosť)."""
    novy, env = _zastarane_pyc_s_novym_datumom(kopia)
    beh = subprocess.run([sys.executable, 'zapis.py', 'stav'], cwd=str(kopia.priecinok), env=env, capture_output=True, text=True, encoding='utf-8')
    assert beh.returncode == 0, beh.stdout + beh.stderr
    assert 'Hlavička zoznamu: %s' % novy in beh.stdout


def test_suchy_beh_ma_vlastnu_kopiu_s_registrom_bez_obrazkov_a_testov(kopia):
    """Kópia pre suchý beh obsahuje skripty, `ZOZNAM.md` a register, ale nie obrázky z `navrhy` ani `testy`; `build.py --check`
    v nej prejde a koreň sa dá zmazať."""
    koren, ciel = tr.kopia_na_sucho(kopia.priecinok)
    try:
        assert (ciel / 'build.py').is_file() and (ciel / 'ZOZNAM.md').is_file()
        assert (koren / 'docs' / 'testing' / 'findings-register.md').is_file()
        assert not (ciel / 'navrhy').exists() and not (ciel / 'testy').exists()
        kod, vystup = tr.spusti_build(ciel, ['--check'])
        assert kod == 0, vystup
    finally:
        shutil.rmtree(koren, ignore_errors=True)
    assert not koren.exists()


def test_suchy_beh_pri_zlyhani_kopirovania_zmaze_docasny_koren(kopia, monkeypatch):
    """Ak kopírovanie pre suchý beh zlyhá (disk plný), dočasný koreň sa zmaže a chyba sa vyhodí ďalej (nález bota, PR 345)."""
    def docasne():
        """Názvy dočasných koreňov suchého behu (`zapis-na-sucho-*`) v systémovom dočasnom priečinku."""
        return {p.name for p in Path(tempfile.gettempdir()).glob('zapis-na-sucho-*')}

    pred = docasne()

    def zlyhaj(*argumenty, **kw):
        """Náhrada `shutil.copytree`: vždy zlyhá s `OSError` „disk plný“."""
        raise OSError('disk plný')

    monkeypatch.setattr(tr.shutil, 'copytree', zlyhaj)
    with pytest.raises(OSError, match='disk plný'):
        tr.kopia_na_sucho(kopia.priecinok)
    assert docasne() == pred


def test_hlavna_vrati_kod_3_ked_zlyha_priprava_suchehu_behu(kopia, monkeypatch, capsys):
    """Zlyhanie prípravy suchého behu spracuje obsluha chýb v `hlavna`: vypíše „NEOČAKÁVANÁ CHYBA“ a vráti kód 3 (nález bota, PR
    345)."""
    monkeypatch.setattr(sys, 'pycache_prefix', None, raising=False)  # import `zapis` nastavuje vlastnú predponu cache
    import zapis

    def zlyhaj(priecinok):
        """Náhrada `kopia_na_sucho`: vždy zlyhá s `OSError` „disk plný“."""
        raise OSError('disk plný')

    monkeypatch.setattr(zapis.zapis_transakcia, 'kopia_na_sucho', zlyhaj)
    vstup = kopia.json('z.json', {'datum': '27. 11. 2026', 'text': 'x'})
    assert zapis.hlavna(['--na-sucho', 'zmena', '--json', str(vstup)]) == 3
    assert 'NEOČAKÁVANÁ CHYBA' in capsys.readouterr().out


def test_hlavna_pri_chybe_obnovy_vypise_popis_a_vrati_kod_3(kopia, monkeypatch, capsys):
    """Pri `ChybaObnovy` `hlavna` vypíše jej popis (nie tvrdenie, že sa nič nezapísalo) a vráti kód 3."""
    monkeypatch.setattr(sys, 'pycache_prefix', None, raising=False)
    import zapis

    def zlyhaj(ds):
        """Náhrada `vykonaj`: vyhodí `ChybaObnovy`."""
        raise tr.ChybaObnovy('NEPODARILO SA VRÁTIŤ ZMENY (skúška).')

    monkeypatch.setattr(zapis.zapis_transakcia, 'vykonaj', zlyhaj)
    vstup = kopia.json('z.json', {'datum': '27. 11. 2026', 'text': 'x'})
    assert zapis.hlavna(['zmena', '--json', str(vstup)]) == 3
    vystup = capsys.readouterr().out
    assert 'NEPODARILO SA VRÁTIŤ ZMENY' in vystup and 'nič sa nezapísalo' not in vystup


def test_zapisane_subory_maju_lf_a_utf8_bez_bom(kopia):
    """Súbory zapísané skriptom majú zalomenia LF a UTF-8 bez BOM; diakritika a emoji ostanú platné."""
    u = kopia.udaje()
    n = next(n for n in u['otvorene'] if str(n) not in u['fronta'])
    vstupy = [('hotove', {'n': n, 'vetva': 'K64', 'pr': '#1', 'zlucene': False, 'rucny_test': 'caka', 'text': 'HOTOVÉ ľščťž 🙂'}),
              ('zmena', {'datum': '27. 11. 2026', 'text': 'ľščťž 🙂'})]
    for prikaz, vstup in vstupy:
        kod, vystup = kopia.zapis(prikaz, '--json', kopia.json(prikaz + '.json', vstup))
        assert kod == 0, vystup
    for nazov in (kopia.posledny_zaznamovy('zaznamy_hotove'), 'stav.py', 'polozky_povodne.py', 'ZOZNAM.md'):
        data = (kopia.priecinok / nazov).read_bytes()
        assert b'\r' not in data and not data.startswith(b'\xef\xbb\xbf'), nazov
        data.decode('utf-8')
