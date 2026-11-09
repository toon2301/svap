# -*- coding: utf-8 -*-
"""Načítanie dát, kontroly úplnosti a zostavenie modelu zoznamu nálezov.

Modul dáta nikdy nemení: načíta ich, overí (každé číslo nálezu 1…N a každé ID z registra je práve raz, balíky a
odkazy na rozhodnutia existujú) a zoskupí podľa skupiny (HNEĎ / PRED / PO) a balíka. Markdown z modelu zostavuje
`vystup.py`.
"""
import json
import re
from collections import defaultdict
from pathlib import Path
from types import SimpleNamespace

import fronta
import polozky_nove
import polozky_povodne
import priloha_nastenka
import register
import stav
import zatvorene_dalsie
from konstanty import A, EL, EM, ES, H, N, P, S_, V

PRIECINOK = Path(__file__).resolve().parent
REGISTER_CESTA = PRIECINOK.parent / 'testing' / 'findings-register.md'
POVODNY_CESTA = PRIECINOK / 'povodny_zoznam.json'

BALIK_PRIPRAVA = 'Príprava ostrého nasadenia (až keď bude aplikácia hotová)'
POSLEDNY_POVODNY = 172

PORADIE_BALIKOV = {
    H: ['Produkčná odolnosť aplikácie', 'Spoľahlivosť CI a testov', 'Bezpečnosť závislostí'],
    P: [
        'Bezpečnosť a produkčná odolnosť', 'Produkčná odolnosť aplikácie', 'Spoľahlivosť CI a testov', 'Navigácia a Späť',
        'Plynulosť prechodov (mobil)', 'Profil a identita', 'Ponuky (úprava a tagy)', 'Zdieľanie a obrázky', 'Vzhľad Nástenky', 'Upozornenia na zmazaný obsah', 'Upozornenia a push', 'Žiadosti',
        'Vyhľadávanie a Sledovania',
        'Preklady a hlášky', 'Súkromie a krajina', 'iPhone a WebSocket', 'iPhone overenia', BALIK_PRIPRAVA,
    ],
    A: [
        'Pravdepodobne už vyriešené', 'Funkcie – väčšie balíky', 'Nástenka a zdieľanie', 'Navigácia – scroll', 'Navigácia – drobnosti',
        'Zvýraznenie ponuky',
        'Údaje a cache', 'Profil a identita', 'Mazanie ponuky', 'Výkon a plynulosť', 'Výkon (memoizácia)', 'Prístupnosť',
        'iPhone overenia', 'iPhone a WebSocket', 'Service worker a PWA', 'Vyhľadávanie a Sledovania', 'Upratovanie a architektúra',
        'Nástroje a testy',
    ],
}

PREFIXY_REGISTRA = 'OW|TEST|APP|TECH|TOOL|ENV|DOC|RET|REG'


def nacitaj_povodny(cesta=POVODNY_CESTA):
    """Načíta pôvodný zoznam 1–172 z JSON a prevedie kľúče (čísla nálezov) na `int`."""
    surove = json.loads(Path(cesta).read_text(encoding='utf-8'))
    vysledok = {'zdroj': surove['zdroj']}
    for skupina in ('hotove', 'zatvorene', 'info', 'otvorene'):
        vysledok[skupina] = {int(k): v for k, v in surove[skupina].items()}
    return vysledok


def id_z_registra(cesta=REGISTER_CESTA):
    """Vráti množinu ID (OW-, TEST-, APP-, …) z riadkov tabuliek v `docs/testing/findings-register.md`."""
    text = Path(cesta).read_text(encoding='utf-8')
    return set(re.findall(r'^\| ((?:%s)-\d+)\b' % PREFIXY_REGISTRA, text, flags=re.M))


def rozbal_id(polozka):
    """Rozbalí ID riadku registra na samostatné ID: `TEST-03/04/09` → TEST-03, TEST-04, TEST-09; `TECH-01…11` → TECH-01…TECH-11."""
    zapis = polozka['id']
    if '/' in zapis:
        prvy, *ostatne = zapis.split('/')
        predpona = prvy.split('-')[0]
        return [prvy] + ['%s-%02d' % (predpona, int(x)) for x in ostatne]
    if '…' in zapis:
        zaciatok, koniec = zapis.split('…')
        predpona, prve = zaciatok.split('-')
        return ['%s-%02d' % (predpona, x) for x in range(int(prve), int(koniec) + 1)]
    return [zapis]


def _chyby_cisel(povodny):
    """Overí, že čísla 1…N sú práve raz (pôvodné + otvorené nové + hotové po vydaní) a že otvorené sú roztriedené."""
    chyby = []
    skupiny = [povodny[k].keys() for k in ('hotove', 'zatvorene', 'info', 'otvorene')]
    vsetky = [n for s in skupiny for n in s]
    if sorted(vsetky) != list(range(1, POSLEDNY_POVODNY + 1)):
        chyby.append('povodny_zoznam.json nemá presne čísla 1–%d raz' % POSLEDNY_POVODNY)

    hotove_po = [d['n'] for d in stav.DONE_SINCE]
    zatvorene_po = [d['n'] for d in zatvorene_dalsie.CLOSED_SINCE]
    otvorene_povodne = set(polozky_povodne.ORIG_OPEN)
    ocakavane = (set(povodny['otvorene']) - {n for n in hotove_po if n <= POSLEDNY_POVODNY}
                 - {n for n in zatvorene_po if n <= POSLEDNY_POVODNY})
    if otvorene_povodne != ocakavane:
        chyby.append('ORIG_OPEN sa nezhoduje s otvorenými z JSON (mínus opravené a zatvorené): chýba %s, navyše %s'
                     % (sorted(ocakavane - otvorene_povodne), sorted(otvorene_povodne - ocakavane)))
    for n in zatvorene_po:
        if n <= POSLEDNY_POVODNY and n not in povodny['otvorene']:
            chyby.append('zatvorený nález %d nebol v pôvodnom zozname otvorený' % n)

    nove = [x['n'] for x in polozky_nove.NEW_ITEMS]
    uzavrete = hotove_po + zatvorene_po
    nove_vsetky = sorted(nove + [n for n in uzavrete if n > POSLEDNY_POVODNY])
    if len(set(nove + uzavrete)) != len(nove + uzavrete):
        chyby.append('číslo nálezu je naraz otvorené, hotové alebo zatvorené, alebo sa opakuje: %s'
                     % sorted({n for n in nove + uzavrete if (nove + uzavrete).count(n) > 1}))
    if nove_vsetky != list(range(POSLEDNY_POVODNY + 1, POSLEDNY_POVODNY + 1 + len(nove_vsetky))):
        chyby.append('nové nálezy nemajú súvislé číslovanie od %d: %s' % (POSLEDNY_POVODNY + 1, nove_vsetky))

    cisla_uloh = [int(t['n'][1:]) for t in polozky_nove.NTASKS]
    if cisla_uloh != list(range(1, len(cisla_uloh) + 1)):
        chyby.append('úlohy N nemajú súvislé číslovanie: %s' % cisla_uloh)
    return chyby


def _chyby_registra(id_registra):
    """Overí, že každé ID z registra je práve v jednej štruktúre (otvorené / čaká živé overenie / zatvorené / pokryté nálezom)."""
    otvorene = []
    for polozka in register.REG_ITEMS:
        polozka['ids'] = rozbal_id(polozka)
        otvorene += polozka['ids']
    zaradene = otvorene + list(register.REG_CLOSED) + list(register.REG_AWAIT_LIVE) + list(register.REG_MAPPED)
    chyby = []
    opakovane = sorted({x for x in zaradene if zaradene.count(x) > 1})
    if opakovane:
        chyby.append('ID z registra je zaradené viackrát: %s' % opakovane)
    if set(zaradene) != id_registra:
        chyby.append('register: bez zaradenia %s, navyše (v registri nie je) %s'
                     % (sorted(id_registra - set(zaradene)), sorted(set(zaradene) - id_registra)))
    return chyby, otvorene


def _chyby_zatvorenych():
    """Overí, že každé zatvorenie rozhodnutím odkazuje na existujúce rozhodnutie s odpoveďou a má text aj dátum."""
    chyby = []
    rozhodnute = {d['id'] for d in stav.DECISIONS if d.get('odpoved')}
    for d in zatvorene_dalsie.CLOSED_SINCE:
        if d['rozhodnutie'] not in rozhodnute:
            chyby.append('zatvorený nález %d: rozhodnutie %s neexistuje alebo ešte nemá odpoveď' % (d['n'], d['rozhodnutie']))
        if not d.get('text') or not d.get('datum'):
            chyby.append('zatvorený nález %d: chýba text alebo dátum' % d['n'])
    return chyby


def _chyby_hodnot():
    """Overí povolené hodnoty (skupina, dopad, zložitosť), existenciu balíkov a odkazov na rozhodnutia."""
    chyby = []
    id_rozhodnuti = [d['id'] for d in stav.DECISIONS]
    if id_rozhodnuti != ['R%d' % i for i in range(1, len(id_rozhodnuti) + 1)]:
        chyby.append('rozhodnutia nemajú súvislé číslovanie R1…: %s' % id_rozhodnuti)

    def over(oznacenie, skupina, dopad, zlozitost, balik, rozhodnutie):
        """Overí jednu položku; chyby pridá do zoznamu `chyby`."""
        if skupina not in PORADIE_BALIKOV:
            chyby.append('%s: neznáma skupina %r' % (oznacenie, skupina))
        elif balik not in PORADIE_BALIKOV[skupina]:
            chyby.append('%s: balík %r nie je v poradí pre skupinu %s' % (oznacenie, balik, skupina))
        if dopad not in (V, S_, N, None):
            chyby.append('%s: neznámy dopad %r' % (oznacenie, dopad))
        if zlozitost not in (ES, EM, EL):
            chyby.append('%s: neznáma zložitosť %r' % (oznacenie, zlozitost))
        if rozhodnutie and rozhodnutie.split()[-1] not in id_rozhodnuti:
            chyby.append('%s: odkaz na neexistujúce rozhodnutie %r' % (oznacenie, rozhodnutie))

    for n, (sk, dopad, zl, balik, _poznamka, rozhodnutie) in polozky_povodne.ORIG_OPEN.items():
        over(str(n), sk, dopad, zl, balik, rozhodnutie)
    for x in polozky_nove.NEW_ITEMS:
        over(str(x['n']), x['bucket'], x['imp'], x['eff'], x['pkg'], x['dec'])
    for r in register.REG_ITEMS:
        over(r['id'], r['bucket'], r['imp'], r['eff'], r['pkg'], r['dec'])
    for t in polozky_nove.NTASKS:
        over(t['n'], t['bucket'], None, t['eff'], t.get('pkg', BALIK_PRIPRAVA), None)
    return chyby


def _chyby_poradia(otvorene_id):
    """Overí, že vlny v `stav.PORADIE` spomínajú len položky, ktoré sú ešte otvorené (inak je text zastaraný)."""
    chyby = []
    for vlna in stav.PORADIE:
        for i in vlna['polozky']:
            if i not in otvorene_id:
                chyby.append('stav.PORADIE (%s) spomína %s, ktoré nie je otvorené; uprav alebo odstráň ho' % (vlna['vlna'], i))
    return chyby


def _id_otvorenych(riadky):
    """Povolené ID pre frontu: čísla všetkých otvorených nálezov (HNEĎ, PRED aj PO NASADENÍ) a jednotlivé (rozbalené) ID registra; spoločný názov riadku (`TECH-01…11`) ID nie je."""
    ids = {d['id'] for riadky_skupiny in riadky.values() for _b, _k, d in riadky_skupiny if d['id'].isdigit()}
    for polozka in register.REG_ITEMS:
        ids.update(polozka['ids'])
    return ids


def _chyby_fronty(id_otvorenych):
    """Overí frontu prác pre kolegu: ID sú otvorené nálezy (z ktorejkoľvek skupiny) bez opakovania a stav je vyplnený celý alebo vôbec."""
    chyby = []
    videne = set()
    for z in fronta.FRONTA:
        n = z.get('n')
        if n in videne:
            chyby.append('fronta: %s je v poradí viackrát' % n)
        videne.add(n)
        if n not in id_otvorenych:
            chyby.append('fronta: %s nie je otvorený nález (je hotový, zatvorený alebo neexistuje); odstráň ho z fronta.py' % n)
        if not (z.get('co') and z.get('preco')):
            chyby.append('fronta: %s nemá vyplnené `co` a `preco`' % n)
        elif not z['preco'].startswith(('JASNÉ', 'NEJASNÉ')):
            chyby.append('fronta: %s: `preco` musí začínať slovom JASNÉ alebo NEJASNÉ (README, Postup od K15)' % n)
        vyplnene = [k for k in ('kto', 'stav', 'od') if z.get(k)]
        if vyplnene and len(vyplnene) != 3:
            chyby.append('fronta: %s má vyplnené len %s; stav sa vypĺňa celý (kto, stav, od)' % (n, ', '.join(vyplnene)))
        if z.get('stav') and z['stav'] not in fronta.STAVY:
            chyby.append('fronta: %s má neznámy stav %r' % (n, z['stav']))
    return chyby


ODKAZ_V_TEXTE = re.compile(
    r'\b(?:nález|nálezy|rozhodnutie|rozhodnutia)\s+[RN]?\d|\b[RN]\d+\b|\b(?:%s)-\d+' % PREFIXY_REGISTRA, re.IGNORECASE)


def _rozbal_odkaz(odkaz):
    """Rozbalí odkaz z prílohy D na jednotlivé ID: `R13–R19` → R13…R19, `TECH-01…11` → TECH-01…TECH-11, ostatné ostane samo."""
    rozsah = re.fullmatch(r'R(\d+)–R(\d+)', odkaz)
    if rozsah:
        return ['R%d' % i for i in range(int(rozsah.group(1)), int(rozsah.group(2)) + 1)]
    return rozbal_id({'id': odkaz})


def _chyby_prilohy_d(posledne_cislo, id_registra):
    """Overí prílohu D: každé ID z `ids` (aj z rozsahov) existuje a voľný text `kde` neobsahuje odkazy (tie patria len do `ids`)."""
    chyby = []
    id_rozhodnuti = {d['id'] for d in stav.DECISIONS}
    cisla_uloh = {t['n'] for t in polozky_nove.NTASKS}
    for riadok in priloha_nastenka.RIADKY:
        oznacenie = riadok['pdf'][:40]
        for odkaz in riadok['ids']:
            for i in _rozbal_odkaz(odkaz):
                if i.isdigit():
                    existuje = 1 <= int(i) <= posledne_cislo
                elif re.fullmatch(r'R\d+', i):
                    existuje = i in id_rozhodnuti
                elif re.fullmatch(r'N\d+', i):
                    existuje = i in cisla_uloh
                else:
                    existuje = i in id_registra
                if not existuje:
                    chyby.append('príloha D (%s): odkaz na neexistujúce %s' % (oznacenie, i))
        if ODKAZ_V_TEXTE.search(riadok.get('kde', '')):
            chyby.append('príloha D (%s): voľný text `kde` obsahuje odkaz; zapíš ho do `ids`' % oznacenie)
    return chyby


def _pocet_nalezov(riadky_skupiny):
    """Spočíta riadky skupiny, ktoré sú číslovanými nálezmi (nie ID z registra ani úlohy N)."""
    return sum(1 for _b, _k, d in riadky_skupiny if d['id'].isdigit())


def _zoskup(riadky, skupina):
    """Zoradí riadky skupiny podľa balíka (poradie z `PORADIE_BALIKOV`) a v balíku podľa čísla/ID."""
    podla_balika = defaultdict(list)
    for balik, kluc, riadok in riadky:
        podla_balika[balik].append((kluc, riadok))
    return [(b, [r for _, r in sorted(podla_balika[b], key=lambda z: z[0])]) for b in PORADIE_BALIKOV[skupina] if b in podla_balika]


def zostav_model():
    """Načíta všetky dáta, overí ich a vráti model pre `vystup.py`.

    Pri porušení kontrol vyhodí `ValueError` so zoznamom všetkých chýb naraz.
    """
    povodny = nacitaj_povodny()
    id_registra = id_z_registra()
    chyby = _chyby_cisel(povodny) + _chyby_hodnot() + _chyby_zatvorenych()
    chyby_registra, registrove_otvorene = _chyby_registra(id_registra)
    chyby += chyby_registra

    riadky = {H: [], P: [], A: []}
    for n, (sk, dopad, zl, balik, poznamka, rozhodnutie) in polozky_povodne.ORIG_OPEN.items():
        zobraz = sk in (H, P) or n in polozky_povodne.KEEP_NOTE or rozhodnutie
        riadky[sk].append((balik, (0, n), dict(id=str(n), what=povodny['otvorene'][n], note=poznamka if zobraz else '',
                                               imp=dopad, eff=zl, dec=rozhodnutie, kratko=None)))
    for x in polozky_nove.NEW_ITEMS:
        riadky[x['bucket']].append((x['pkg'], (0, x['n']), dict(id=str(x['n']), what=x['what'], note=x['note'], imp=x['imp'],
                                                                 eff=x['eff'], dec=x['dec'], kratko=x.get('kratko'))))
    for r in register.REG_ITEMS:
        riadky[r['bucket']].append((r['pkg'], (1, r['id']), dict(id=r.get('label', r['id']), what=r['what'], note=r['note'],
                                                                  imp=r['imp'], eff=r['eff'], dec=r['dec'], kratko=None)))
    for t in polozky_nove.NTASKS:
        riadky[t['bucket']].append((t.get('pkg', BALIK_PRIPRAVA), (2, int(t['n'][1:])),
                                    dict(id=t['n'], what=t['what'], note=t['note'], imp=None, eff=t['eff'], dec=None, kratko=None)))

    otvorene_id = {d['id'] for sk in riadky.values() for _b, _k, d in sk}
    otvorene_id |= set(registrove_otvorene)
    chyby += _chyby_poradia(otvorene_id)
    chyby += _chyby_fronty(_id_otvorenych(riadky))
    if chyby:
        raise ValueError('\n'.join(' - ' + c for c in chyby))

    hotove = dict(povodny['hotove'])
    hotove.update({d['n']: d['text'] for d in stav.DONE_SINCE})
    cakaju = [d for d in stav.DONE_SINCE if not d.get('zlucene')]
    zatvorene_vsetky = dict(povodny['zatvorene'])
    zatvorene_vsetky.update({d['n']: d['text'] for d in zatvorene_dalsie.CLOSED_SINCE})
    pocty = SimpleNamespace(
        hotove=len(hotove) - len(cakaju), caka_na_zlucenie=len(cakaju), zatvorene=len(zatvorene_vsetky),
        zatvorene_povodne=len(povodny['zatvorene']), info=len(povodny['info']),
        nalezy={sk: _pocet_nalezov(riadky[sk]) for sk in riadky},
        uloh={sk: sum(1 for t in polozky_nove.NTASKS if t['bucket'] == sk) for sk in riadky},
        registrove={sk: sum(len(r['ids']) for r in register.REG_ITEMS if r['bucket'] == sk) for sk in riadky},
        riadkov={sk: len(riadky[sk]) for sk in riadky},
        register_spolu=len(id_registra),
        povodne_otvorene=len(povodny['otvorene']),
        povodne_otvorene_dnes={sk: sum(1 for v in polozky_povodne.ORIG_OPEN.values() if v[0] == sk) for sk in riadky},
    )
    pocty.spolu = pocty.hotove + pocty.caka_na_zlucenie + pocty.zatvorene + pocty.info + sum(pocty.nalezy.values())
    posledne_cislo = (POSLEDNY_POVODNY + len(polozky_nove.NEW_ITEMS) + sum(1 for d in stav.DONE_SINCE if d['n'] > POSLEDNY_POVODNY)
                      + sum(1 for d in zatvorene_dalsie.CLOSED_SINCE if d['n'] > POSLEDNY_POVODNY))
    if pocty.spolu != posledne_cislo:
        raise ValueError('súčet skupín %d sa nerovná poslednému číslu nálezu %d' % (pocty.spolu, posledne_cislo))
    chyby_prilohy = _chyby_prilohy_d(posledne_cislo, id_registra)
    if chyby_prilohy:
        raise ValueError('\n'.join(' - ' + c for c in chyby_prilohy))

    return SimpleNamespace(
        povodny=povodny, hotove=dict(sorted(hotove.items())), zatvorene_vsetky=dict(sorted(zatvorene_vsetky.items())),
        skupiny={sk: _zoskup(riadky[sk], sk) for sk in riadky},
        pocty=pocty, posledne_cislo=posledne_cislo, otvorene_id=otvorene_id,
    )
