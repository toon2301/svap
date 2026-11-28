# -*- coding: utf-8 -*-
"""Operácie skriptu `zapis.py`: každá zmení `Dataset` v pamäti a vráti správy pre agenta (zápis na disk a kontrolu robí transakcia).

Operácie pred zmenou overia vstup a stav zoznamu (nález je otvorený, balík existuje, poradie fronty drží závislosti, …) a pri
chybe vyhodia `ChybaVstupu` so slovenským popisom; potom sa nič nezapíše. Konečné slovo má vždy celý model (`model.zostav_model`),
ktorý transakcia spustí po zápise. Kontext (`Kontext`) sa načíta raz pred zmenami, takže číslo nového nálezu, rozhodnutia a pod.
sú vždy ďalšie voľné.
"""
from types import SimpleNamespace

import zapis_data as data
import zapis_format as fmt
from konstanty import RUCNY_CAKA, RUCNY_NEPRESIEL, RUCNY_NEUZAVRETE, RUCNY_PRESIEL, RUCNY_STAVY
from zapis_format import ChybaVstupu, normalizuj
from zapis_zdroj import ChybaZdroja, Zdroj

PRIPONA_PRECO = ('JASNÉ', 'NEJASNÉ')


def nacitaj_kontext():
    """Načíta model zoznamu (a tým overí, že dáta sú v poriadku) a vráti údaje, ktoré operácie potrebujú."""
    import fronta
    import model
    import stav
    m = model.zostav_model()
    return SimpleNamespace(
        model=model, m=m, posledne_cislo=m.posledne_cislo, otvorene_id=set(m.otvorene_id),
        n_rozhodnuti=len(stav.DECISIONS), rozhodnutia={d['id'] for d in stav.DECISIONS},
        rozhodnutia_s_odpovedou={d['id'] for d in stav.DECISIONS if d.get('odpoved')},
        fronta=[dict(z) for z in fronta.FRONTA], hotove=[dict(d) for d in stav.DONE_SINCE],
        id_registra=model.id_z_registra(), baliky=model.PORADIE_BALIKOV)


# ---------------------------------------------------------------- vstup
def over_kluce(v, povinne, volitelne=()):
    """Overí, že vstup je slovník s povinnými poľami a bez neznámych (preklep v názve poľa by sa inak ticho stratil)."""
    if not isinstance(v, dict):
        raise ChybaVstupu('vstup musí byť JSON objekt (slovník)')
    chyba = [k for k in povinne if k not in v]
    if chyba:
        raise ChybaVstupu('chýbajú polia: %s' % ', '.join(chyba))
    neznami = sorted(set(v) - set(povinne) - set(volitelne))
    if neznami:
        raise ChybaVstupu('neznáme polia: %s (povolené: %s)' % (', '.join(neznami), ', '.join(list(povinne) + list(volitelne))))


def _text(v, pole):
    return normalizuj(v[pole], pole)


def _kratky(v, pole, najviac=200):
    t = normalizuj(v[pole], pole)
    if len(t) > najviac:
        raise ChybaVstupu('pole %s má %d znakov (najviac %d)' % (pole, len(t), najviac))
    return t


def normalizuj_volitelne(text, pole, najviac):
    """Voliteľný krátky text z príkazového riadka: `None` ostane `None`, inak sa zjednotí a skontroluje dĺžka."""
    if text is None:
        return None
    cisty = normalizuj(text, pole)
    if len(cisty) > najviac:
        raise ChybaVstupu('pole %s má %d znakov (najviac %d)' % (pole, len(cisty), najviac))
    return cisty


def _prefix(text, prefix, pole):
    if not text.startswith(prefix):
        raise ChybaVstupu('pole %s musí začínať slovom %s' % (pole, prefix))


# ---------------------------------------------------------------- nález
def novy(ds, ctx, v):
    """Pridá nový otvorený nález s ďalším voľným číslom (voliteľne aj do fronty) a vráti správy; číslo je v `ctx.pridelene`."""
    over_kluce(v, ['skupina', 'dopad', 'zlozitost', 'balik', 'kratko', 'co', 'poznamka', 'zdroj'], ['rozhodnutie', 'fronta'])
    skupina, balik = v['skupina'], normalizuj(v['balik'], 'balik')
    if not isinstance(skupina, str) or skupina not in fmt.SKUPINY:
        raise ChybaVstupu('pole skupina: %r nie je povolené (H, P alebo A)' % (skupina,))
    if balik not in ctx.baliky[skupina]:
        raise ChybaVstupu('balík %r nie je v skupine %s; povolené: %s' % (balik, skupina, '; '.join(ctx.baliky[skupina])))
    rozhodnutie = v.get('rozhodnutie')
    if rozhodnutie is not None:
        if not isinstance(rozhodnutie, str) or rozhodnutie not in {'R%d' % i for i in range(1, ctx.n_rozhodnuti + 1)}:
            raise ChybaVstupu('pole rozhodnutie: %r neexistuje (R1 až R%d)' % (rozhodnutie, ctx.n_rozhodnuti))
    n = ctx.posledne_cislo + 1
    text = fmt.nalez(n, skupina, v['dopad'], v['zlozitost'], balik, _kratky(v, 'kratko'), _text(v, 'co'), _text(v, 'poznamka'),
                     _kratky(v, 'zdroj'), rozhodnutie)
    spravy = []
    if 'fronta' in v:
        if not isinstance(v['fronta'], dict):
            raise ChybaVstupu('pole fronta musí byť objekt {davka, co, preco, …}')
        vstup_fronty = dict(v['fronta'])
        if 'n' in vstup_fronty:
            raise ChybaVstupu('v poli fronta nepíš n, číslo nálezu pridelí skript')
        vstup_fronty['n'] = str(n)
        fronta_text, poradie, zaznam_fronty, spravy_fronty = _priprav_frontu(ctx, vstup_fronty, otvorene_navyse={str(n)}, posledne_cislo=n)
    nazov = ds.pridaj_zaznam('zaznamy_nove', text)
    spravy.append('Nový nález č. %d zapísaný do %s (skupina %s, balík %s).' % (n, nazov, skupina, balik))
    ctx.posledne_cislo = n
    ctx.otvorene_id.add(str(n))
    ctx.pridelene = n
    if 'fronta' in v:
        spravy.extend(_vloz_do_fronty(ds, ctx, fronta_text, poradie, zaznam_fronty) + spravy_fronty)
    return spravy


def hotove(ds, ctx, v):
    """Presunie otvorený nález do hotových: odstráni ho zo zdrojov, z fronty a z vĺn a zapíše záznam o oprave."""
    over_kluce(v, ['n', 'vetva', 'zlucene', 'text'], ['pr', 'rucny_test', 'cast_pr'])
    n = v['n']
    _over_otvoreny_cislo(ctx, n)
    vetva = _kratky(v, 'vetva', 60)
    text = _text(v, 'text')
    _prefix(text, 'HOTOVÉ', 'text')
    if not isinstance(v['zlucene'], bool):
        raise ChybaVstupu('pole zlucene musí byť true alebo false')
    pr = v.get('pr')
    if pr is not None:
        pr = _kratky(v, 'pr', 20)
    rucny = v.get('rucny_test')
    if rucny is not None and rucny not in RUCNY_STAVY:
        raise ChybaVstupu('pole rucny_test: %r nie je povolené (caka, prešiel, neprešiel alebo vynechať)' % (rucny,))
    cast_pr = v.get('cast_pr', [])
    if not isinstance(cast_pr, list):
        raise ChybaVstupu('pole cast_pr musí byť zoznam objektov {pr, vetva, text}')
    riadky_pr = []
    for polozka in cast_pr:
        over_kluce(polozka, ['pr', 'vetva', 'text'])
        riadky_pr.append(fmt.cast_pr(_kratky(polozka, 'pr', 60), _kratky(polozka, 'vetva', 60), _text(polozka, 'text')))
    spravy = _odstran_nalez_vsade(ds, n)
    nazov = ds.pridaj_zaznam('zaznamy_hotove', fmt.hotove(n, vetva, pr, v['zlucene'], rucny, text))
    for riadok in riadky_pr:
        ds.pridaj_zaznam('zaznamy_hotove', riadok, 'DONE_PR_TABLE_CASTOCNE_ZAZNAMY')
    spravy.append('Nález č. %d zapísaný ako hotový do %s%s.' % (n, nazov, ' (čaká na ručný test)' if rucny == RUCNY_CAKA else ''))
    if rucny == RUCNY_CAKA and not v['zlucene']:
        spravy.append('Po zlúčení PR spusti: python docs/zoznam-nalezov/zapis.py zlucene --vetva %s --pr <PR>; ručný test zapíš '
                      'príkazom rucny-test.' % vetva)
    _zapamataj_uzavretie(ctx, n)
    ctx.hotove.append({'n': n, 'vetva': vetva, 'pr': pr, 'zlucene': v['zlucene'], **({'rucny_test': rucny} if rucny else {}), 'text': text})
    return spravy


def zatvor(ds, ctx, v):
    """Zatvorí otvorený nález rozhodnutím majiteľa (nález sa neopravuje); rozhodnutie musí existovať a mať odpoveď."""
    over_kluce(v, ['n', 'rozhodnutie', 'datum', 'text'])
    n = v['n']
    _over_otvoreny_cislo(ctx, n)
    if not isinstance(v['rozhodnutie'], str) or v['rozhodnutie'] not in ctx.rozhodnutia_s_odpovedou:
        raise ChybaVstupu('rozhodnutie %r neexistuje alebo nemá odpoveď; najprv ho zapíš príkazom rozhodnutie (odpoveď na existujúce '
                          'rozhodnutie s poľom id, alebo nové rozhodnutie s odpoveďou)' % (v['rozhodnutie'],))
    text = _text(v, 'text')
    _prefix(text, 'ZATVORENÉ', 'text')
    spravy = _odstran_nalez_vsade(ds, n)
    nazov = ds.pridaj_zaznam('zaznamy_zatvorene', fmt.zatvorene(n, v['rozhodnutie'], _kratky(v, 'datum', 40), text))
    spravy.append('Nález č. %d zapísaný ako zatvorený rozhodnutím %s do %s.' % (n, v['rozhodnutie'], nazov))
    _zapamataj_uzavretie(ctx, n)
    return spravy


def _zapamataj_uzavretie(ctx, n):
    """Kontext po uzavretí nálezu: už nie je otvorený ani vo fronte."""
    ctx.otvorene_id.discard(str(n))
    ctx.fronta = [z for z in ctx.fronta if z['n'] != str(n)]


def _over_otvoreny_cislo(ctx, n):
    if isinstance(n, bool) or not isinstance(n, int):
        raise ChybaVstupu('pole n musí byť celé číslo nálezu (register ID sa zatvára ručne)')
    if str(n) not in ctx.otvorene_id:
        raise ChybaVstupu('nález %d nie je otvorený (je už hotový, zatvorený alebo neexistuje)' % n)


def _odstran_nalez_vsade(ds, n):
    """Odstráni nález zo zdrojov otvorených nálezov, z fronty a zo zoznamov `polozky` vĺn; vráti správy."""
    spravy = []
    try:
        nazov = data.odstran_otvoreny_nalez(ds, n)
    except ChybaZdroja as chyba:
        raise ChybaVstupu(str(chyba)) from chyba
    spravy.append('Nález č. %d odstránený z otvorených (%s).' % (n, nazov))
    if data.odstran_z_fronty(ds, n):
        spravy.append('Odstránený z fronty prác.')
    pocet = data.odstran_z_vln(ds, str(n))
    if pocet:
        spravy.append('Odstránený zo zoznamov %d vĺn poradia (text vlny `co` sa nemení; je to zamrznutý popis).' % pocet)
    return spravy


# ---------------------------------------------------------------- hotové: zlúčenie a ručný test
def zlucene(ds, ctx, vetva, pr, merge, cas):
    """Označí hotové položky vetvy ako zlúčené (`zlucene=True`), doplní číslo PR a pripojí k textu údaje o zlúčení."""
    ciele = [d for d in ctx.hotove if d.get('vetva') == vetva and not d.get('zlucene')]
    if not ciele:
        raise ChybaVstupu('vetva %r nemá žiadnu hotovú položku, ktorá čaká na zlúčenie' % vetva)
    pr = normalizuj_volitelne(pr, 'pr', 20)
    cas = normalizuj_volitelne(cas, 'cas', 60)
    merge = normalizuj_volitelne(merge, 'merge', 60)
    casti = ['PR ' + pr if pr else None, cas, ('merge `%s`' % merge) if merge else None]
    kusok = 'ZLÚČENÉ (%s).' % ', '.join(c for c in casti if c) if any(casti) else 'ZLÚČENÉ.'
    spravy = []
    for d in ciele:
        _uprav_hotovu(ds, d['n'], {'zlucene': 'True', **({'pr': fmt.retazec(pr)} if pr else {})}, kusok)
        d['zlucene'] = True
        if pr:
            d['pr'] = pr
        spravy.append('Nález č. %d označený ako zlúčený.' % d['n'])
    return spravy


def rucny_test(ds, ctx, vetva, vysledok, datum, poznamka):
    """Zapíše výsledok ručného testu majiteľa k položkám vetvy, ktoré naň čakajú (`caka` alebo `neprešiel`)."""
    if vysledok not in (RUCNY_PRESIEL, RUCNY_NEPRESIEL):
        raise ChybaVstupu('výsledok musí byť prešiel alebo neprešiel')
    ciele = [d for d in ctx.hotove if d.get('vetva') == vetva and d.get('zlucene') and d.get('rucny_test') in RUCNY_NEUZAVRETE]
    if not ciele:
        raise ChybaVstupu('vetva %r nemá zlúčenú položku, ktorá čaká na ručný test' % vetva)
    kusok = 'RUČNÝ TEST MAJITEĽA (%s): %s.' % (normalizuj(datum, 'datum'), vysledok)
    if poznamka:
        kusok += ' ' + normalizuj(poznamka, 'poznamka')
    spravy = []
    for d in ciele:
        _uprav_hotovu(ds, d['n'], {'rucny_test': fmt.retazec(vysledok)}, kusok)
        d['rucny_test'] = vysledok
        spravy.append('Nález č. %d: ručný test %s.' % (d['n'], vysledok))
    if vysledok == RUCNY_NEPRESIEL:
        spravy.append('Dávka ostáva neuzavretá. Zapíš nález (príkaz novy), čo test odhalil, a jeho číslo uveď v poznámke; po oprave test zopakuj.')
    return spravy


def _uprav_hotovu(ds, n, polia, kusok):
    """Nastaví kľúčové slová hotovej položky `n` (hodnoty sú zdrojový text) a pripojí `kusok` k jej textu."""
    najdene = ds.najdi_dict(data.VZORY_HOTOVE, 'n', n)
    if najdene is None:
        raise ChybaVstupu('hotová položka %d sa v súboroch hotových nenašla' % n)
    nazov, zdroj, uzol_zoznamu, index, volanie = najdene
    for meno, hodnota in polia.items():
        zdroj = zdroj.nastav_kw(volanie, meno, hodnota)
        volanie = zdroj.najdi_dict_volanie('n', n)[2]
    text_uzol = Zdroj.kw(volanie, 'text').value
    zdroj = zdroj.pridaj_kusok_retazca(text_uzol, fmt.kus_na_pripojenie(kusok))
    ds.nastav(nazov, zdroj)


# ---------------------------------------------------------------- fronta
def _priprav_frontu(ctx, v, otvorene_navyse=(), posledne_cislo=None):
    """Overí záznam fronty (vrátane poradia a závislostí) a vráti (text záznamu, poradie od 1, správy)."""
    over_kluce(v, ['n', 'davka', 'co', 'preco'], ['poradie', 'caka', 'po'])
    n = v['n']
    if not isinstance(n, str) or not n:
        raise ChybaVstupu('pole n musí byť text (číslo nálezu alebo ID z registra)')
    otvorene = set(ctx.otvorene_id) | set(otvorene_navyse)
    if n not in otvorene:
        raise ChybaVstupu('%s nie je otvorený nález; do fronty patria len otvorené' % n)
    if any(z['n'] == n for z in ctx.fronta):
        raise ChybaVstupu('%s už vo fronte je' % n)
    preco = _text(v, 'preco')
    if not preco.startswith(PRIPONA_PRECO):
        raise ChybaVstupu('pole preco musí začínať slovom JASNÉ alebo NEJASNÉ')
    caka = v.get('caka')
    if caka is not None:
        if not (isinstance(caka, list) and len(caka) == 2 and all(isinstance(c, str) for c in caka)):
            raise ChybaVstupu('pole caka musí byť dvojica [kto, čo presne]')
        caka = (caka[0], normalizuj(caka[1], 'caka'))
    po = v.get('po')
    if po is not None and (not isinstance(po, list) or not all(isinstance(i, str) for i in po)):
        raise ChybaVstupu('pole po musí byť zoznam ID (textov)')
    poradie = v.get('poradie')
    dlzka = len(ctx.fronta)
    if poradie is not None and (isinstance(poradie, bool) or not isinstance(poradie, int) or not 1 <= poradie <= dlzka + 1):
        raise ChybaVstupu('pole poradie musí byť číslo od 1 do %d' % (dlzka + 1))
    poradie = poradie or dlzka + 1
    zaznam = {'n': n, 'co': _text(v, 'co'), 'preco': preco, 'davka': normalizuj(v['davka'], 'davka')}
    if caka:
        zaznam['caka'] = caka
    if po:
        zaznam['po'] = list(po)
    nova = ctx.fronta[:poradie - 1] + [zaznam] + ctx.fronta[poradie - 1:]
    _skontroluj_frontu(ctx, nova, otvorene, posledne_cislo)
    text = fmt.fronta(n, zaznam['davka'], zaznam['co'], preco, caka, po)
    return text, poradie, zaznam, ['Do fronty prác pridaný %s na poradie %d.' % (n, poradie)]


def _skontroluj_frontu(ctx, zaznamy, otvorene, posledne_cislo=None):
    chyby = ctx.model._chyby_fronty(otvorene, posledne_cislo or ctx.posledne_cislo, ctx.id_registra, zaznamy)
    if chyby:
        raise ChybaVstupu('poradie fronty by porušilo pravidlá:\n - ' + '\n - '.join(chyby))


def _vloz_do_fronty(ds, ctx, text, poradie, zaznam):
    """Vloží hotový text záznamu na poradie od 1 (za posledný, ak je poradie za koncom) a zapíše ho aj do kontextu."""
    zdroj = ds.zdroj('fronta.py')
    uzol = zdroj.priradenie('FRONTA')
    if poradie > len(uzol.elts):
        ds.nastav('fronta.py', zdroj.vloz_na_koniec_zoznamu(uzol, text))
    else:
        ds.nastav('fronta.py', zdroj.vloz_pred_prvok(uzol, poradie - 1, text))
    ctx.fronta.insert(poradie - 1, zaznam)
    return []


def fronta_pridaj(ds, ctx, v):
    text, poradie, zaznam, spravy = _priprav_frontu(ctx, v)
    return _vloz_do_fronty(ds, ctx, text, poradie, zaznam) + spravy


def _zaznam_fronty(ds, n):
    zdroj = ds.zdroj('fronta.py')
    najdene = zdroj.najdi_dict_volanie('n', str(n), zoznam='FRONTA')
    if najdene is None:
        raise ChybaVstupu('%s nie je vo fronte' % n)
    return zdroj, najdene


def fronta_odstran(ds, ctx, n):
    _zaznam_fronty(ds, n)
    data.odstran_z_fronty(ds, n)
    ctx.fronta = [z for z in ctx.fronta if z['n'] != str(n)]
    return ['%s odstránený z fronty (nález ostáva otvorený).' % n]


def fronta_presun(ds, ctx, n, na):
    """Presunie záznam `n` na poradie `na` (od 1); poradie musí držať závislosti (`po`)."""
    zdroj, (uzol, index, _volanie) = _zaznam_fronty(ds, n)
    if isinstance(na, bool) or not isinstance(na, int) or not 1 <= na <= len(uzol.elts):
        raise ChybaVstupu('poradie musí byť číslo od 1 do %d' % len(uzol.elts))
    nova = ctx.fronta[:]
    nova.insert(na - 1, nova.pop(index))
    _skontroluj_frontu(ctx, nova, ctx.otvorene_id)
    text = zdroj.riadky_prvku(uzol, index)
    data.odstran_z_fronty(ds, n)
    zdroj = ds.zdroj('fronta.py')
    uzol = zdroj.priradenie('FRONTA')
    if na > len(uzol.elts):
        ds.nastav('fronta.py', zdroj.vloz_na_koniec_zoznamu(uzol, text))
    else:
        ds.nastav('fronta.py', zdroj.vloz_pred_prvok(uzol, na - 1, text))
    ctx.fronta = nova
    return ['%s presunutý na poradie %d.' % (n, na)]


def fronta_caka(ds, ctx, n, kto, text):
    """Označí záznam fronty ako čakajúci na majiteľa alebo Codexa (agent ho pri výbere preskočí)."""
    zdroj, (_uzol, _index, volanie) = _zaznam_fronty(ds, n)
    if kto not in ctx.model.KTO_CAKA:
        raise ChybaVstupu('kto musí byť jedno z: %s' % ', '.join(ctx.model.KTO_CAKA))
    popis = normalizuj(text, 'text')
    hodnota = '(%s, %s)' % (fmt.retazec(kto), fmt.literal(popis, 19))
    ds.nastav('fronta.py', zdroj.nastav_kw(volanie, 'caka', hodnota))
    for z in ctx.fronta:
        if z['n'] == str(n):
            z['caka'] = (kto, popis)
    return ['%s čaká na %s: %s' % (n, ctx.model.KTO_CAKA[kto], popis)]


def fronta_volne(ds, ctx, n):
    """Zruší čakanie záznamu fronty (`caka`)."""
    zdroj, (_uzol, _index, volanie) = _zaznam_fronty(ds, n)
    if Zdroj.kw(volanie, 'caka') is None:
        raise ChybaVstupu('%s nečaká (nemá pole caka)' % n)
    ds.nastav('fronta.py', zdroj.odstran_kw(volanie, 'caka'))
    for z in ctx.fronta:
        if z['n'] == str(n):
            z.pop('caka', None)
    return ['%s je opäť voľný.' % n]


def fronta_po(ds, ctx, n, po):
    """Nastaví (alebo zruší, ak je zoznam prázdny) závislosti `po` záznamu fronty; závislosť musí byť vo fronte skôr."""
    zdroj, (_uzol, index, volanie) = _zaznam_fronty(ds, n)
    nova = ctx.fronta[:]
    zaznam = dict(nova[index])
    if po:
        zaznam['po'] = list(po)
    else:
        zaznam.pop('po', None)
    nova[index] = zaznam
    _skontroluj_frontu(ctx, nova, ctx.otvorene_id)
    if Zdroj.kw(volanie, 'po') is not None:
        zdroj = zdroj.odstran_kw(volanie, 'po')
        volanie = zdroj.najdi_dict_volanie('n', str(n), zoznam='FRONTA')[2]
    if po:
        zdroj = zdroj.nastav_kw(volanie, 'po', '[%s]' % ', '.join(fmt.retazec(i) for i in po))
    ds.nastav('fronta.py', zdroj)
    ctx.fronta = nova
    return ['%s: závislosti po = %s.' % (n, ', '.join(po) if po else 'žiadne')]


# ---------------------------------------------------------------- hlavička, denník, rozhodnutia
def zmena(ds, ctx, v):
    """Zapíše dátum a stav kódu do hlavičky (`stav.STAV`) a nový záznam na začiatok denníka zmien (`stav.ZMENY`)."""
    over_kluce(v, ['datum', 'text'], ['kod'])
    datum = _kratky(v, 'datum', 40)
    zdroj = ds.zdroj('stav.py')
    stav_volanie = zdroj.priradenie('STAV')
    zdroj = zdroj.nastav_kw(stav_volanie, 'datum', fmt.retazec(datum))
    if 'kod' in v:
        zdroj = zdroj.nastav_kw(zdroj.priradenie('STAV'), 'kod', fmt.literal(_text(v, 'kod'), 8))
    zdroj = zdroj.vloz_za_zaciatok_zoznamu(zdroj.priradenie('ZMENY'), fmt.zmena(datum, _text(v, 'text')))
    ds.nastav('stav.py', zdroj)
    return ['Denník zmien: nový záznam z %s%s.' % (datum, ' a nový stav kódu v hlavičke' if 'kod' in v else '')]


def _odpoved_na_rozhodnutie(ds, ctx, v):
    """Odpoveď majiteľa na EXISTUJÚCE rozhodnutie `R<n>`: doplní `odpoved` a `datum` do jeho záznamu, nové číslo nevznikne."""
    over_kluce(v, ['id', 'odpoved', 'datum'])
    identifikator = v['id']
    if not isinstance(identifikator, str) or identifikator not in ctx.rozhodnutia:
        raise ChybaVstupu('rozhodnutie %r neexistuje (R1 až R%d)' % (identifikator, ctx.n_rozhodnuti))
    if identifikator in ctx.rozhodnutia_s_odpovedou:
        raise ChybaVstupu('rozhodnutie %s už má odpoveď; zapísaná odpoveď sa týmto príkazom neprepisuje' % identifikator)
    odpoved, datum = _text(v, 'odpoved'), _kratky(v, 'datum', 40)
    najdene = ds.najdi_dict(data.VZORY_ROZHODNUTIA, 'id', identifikator)
    if najdene is None:
        raise ChybaVstupu('záznam rozhodnutia %s sa v zdrojoch nenašiel' % identifikator)
    nazov, zdroj, _uzol, _index, volanie = najdene
    zdroj = zdroj.nastav_kw(volanie, 'odpoved', fmt.literal(odpoved, 16))
    zdroj = zdroj.nastav_kw(zdroj.najdi_dict_volanie('id', identifikator)[2], 'datum', fmt.retazec(datum))
    ds.nastav(nazov, zdroj)
    ctx.rozhodnutia_s_odpovedou.add(identifikator)
    return ['Rozhodnutie %s: odpoveď zapísaná do %s (dátum %s).' % (identifikator, nazov, datum)]


def rozhodnutie(ds, ctx, v):
    """Zapíše rozhodnutie majiteľa (alebo otázku, ak nemá odpoveď) s ďalším voľným číslom R<n>; s poľom `id` zapíše odpoveď na
    už existujúce rozhodnutie (bez nového čísla)."""
    if isinstance(v, dict) and 'id' in v:  # iný ako objektový vstup odmietne `over_kluce` nižšie (kód 2), nepadne
        return _odpoved_na_rozhodnutie(ds, ctx, v)
    over_kluce(v, ['tema', 'otazka', 'odporucanie', 'kedy'], ['odpoved', 'datum'])
    if bool(v.get('odpoved')) != bool(v.get('datum')):
        raise ChybaVstupu('odpoved a datum sa vypĺňajú spolu')
    identifikator = 'R%d' % (ctx.n_rozhodnuti + 1)
    odpoved = _text(v, 'odpoved') if v.get('odpoved') else None
    datum = _kratky(v, 'datum', 40) if v.get('datum') else None
    text = fmt.rozhodnutie(identifikator, _text(v, 'tema'), _text(v, 'otazka'), _text(v, 'odporucanie'), _text(v, 'kedy'), odpoved, datum)
    nazov = ds.pridaj_zaznam('zaznamy_rozhodnutia', text)
    ctx.n_rozhodnuti += 1
    ctx.rozhodnutia.add(identifikator)
    if odpoved:
        ctx.rozhodnutia_s_odpovedou.add(identifikator)
    ctx.pridelene_rozhodnutie = identifikator
    return ['Rozhodnutie %s zapísané do %s%s.' % (identifikator, nazov, '' if odpoved else ' (čaká na odpoveď majiteľa)')]
