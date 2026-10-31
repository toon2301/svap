# -*- coding: utf-8 -*-
"""Zostavenie Markdownu zoznamu nálezov z modelu (`model.zostav_model()`).

Všetky texty sú v neutrálnom tvare (používateľ, agent), aby dokument v repozitári dával zmysel aj komukoľvek, kto ho číta
neskôr. Prílohu o hostingu zapisuje `priloha_hosting.py`.
"""
import re
from collections import OrderedDict, defaultdict

import polozky_nove
import register
import stav
from konstanty import A, H, NAZOV_DOPADU, P
from priloha_hosting import priloha_c

TITULY = OrderedDict([
    ('0', '0. Ako to čítať'), ('1', '1. Prehľad v číslach'), ('2', '2. Odporúčané poradie práce'), ('3', '3. HNEĎ'),
    ('4', '4. PRED NASADENÍM'), ('5', '5. PO NASADENÍ'), ('6', '6. Rozhodnutia'), ('7', '7. Hotové'),
    ('8', '8. Zatvorené a informačné (bez akcie)'), ('9', '9. Register: čo je zatvorené a čo čaká na živé overenie'),
    ('10', '10. Ako sa dokument udržiava'), ('11', '11. Zmeny v dokumente'), ('A', 'Príloha A: kontrola úplnosti'),
    ('B', 'Príloha B: zdroje, zistenia a obmedzenia'), ('C', 'Príloha C: kam nasadiť (až keď bude aplikácia hotová)'),
])


class Dokument:
    """Zbiera riadky Markdownu a pomáha so zápisom tabuliek."""

    def __init__(self):
        """Vytvorí prázdny dokument."""
        self.riadky = []

    def w(self, text=''):
        """Pridá jeden riadok."""
        self.riadky.append(text)

    def tabulka(self, hlavicka, riadky):
        """Pridá tabuľku; znak `|` v bunkách sa escapuje a za tabuľkou ostane prázdny riadok."""
        self.w('| ' + ' | '.join(hlavicka) + ' |')
        self.w('| ' + ' | '.join(['---'] * len(hlavicka)) + ' |')
        for r in riadky:
            self.w('| ' + ' | '.join(str(c).replace('|', '\\|') for c in r) + ' |')
        self.w()

    def text(self):
        """Vráti celý dokument ako jeden reťazec ukončený koncom riadku."""
        return '\n'.join(self.riadky) + '\n'


def kotva(nadpis):
    """Kotva nadpisu v štýle GitHubu (malé písmená, bez interpunkcie, medzery na spojovníky, diakritika ostáva)."""
    return re.sub(r'[^\w\s-]', '', nadpis.lower()).strip().replace(' ', '-')


def _odkaz_na_rozhodnutie(rozhodnutie):
    """Vráti text odkazu na rozhodnutie z poznámky (napr. „**Rozhodnutie R3** (časť 6).“) alebo prázdny reťazec."""
    if not rozhodnutie:
        return ''
    kod = rozhodnutie.split()[-1]
    odpovedane = {x['id'] for x in stav.DECISIONS if x.get('odpoved')}
    return f'**Rozhodnutie {kod}** ({"rozhodnuté, " if kod in odpovedane else ""}časť 6).'


def _tabulka_poloziek(d, polozky):
    """Zapíše tabuľku položiek: Č., Čo, Poznámka (aj odkaz na rozhodnutie), Dopad · Zl."""
    riadky = []
    for p in polozky:
        poznamka = ' '.join(x for x in (p['note'] or '', _odkaz_na_rozhodnutie(p['dec'])) if x)
        dopad = NAZOV_DOPADU.get(p['imp'], '–') if p['imp'] else '–'
        riadky.append([p['id'], p['what'], poznamka, f'{dopad} · {p["eff"]}'])
    d.tabulka(['Č.', 'Čo', 'Poznámka / prečo', 'Dopad · Zl.'], riadky)


def _skupina_balikov(d, baliky):
    """Zapíše podnadpis a tabuľku pre každý balík skupiny."""
    for balik, polozky in baliky:
        d.w(f'### {balik}')
        d.w()
        _tabulka_poloziek(d, polozky)


def _kratko(riadok):
    """Krátky názov položky do časti „V skratke“: `kratko`, inak začiatok popisu."""
    return riadok.get('kratko') or (riadok['what'][:60].rstrip() + '…')


def _riadkov(n):
    """Správny slovenský tvar počtu riadkov: 1 riadok, 2–4 riadky, inak riadkov."""
    if n == 1:
        return '1 riadok'
    return f'{n} riadky' if 2 <= n <= 4 else f'{n} riadkov'


def _hned(m):
    """Vráti riadky skupiny HNEĎ zoradené podľa čísla (nálezy pred ID z registra a úlohami)."""
    riadky = [r for _b, rows in m.skupiny[H] for r in rows]
    return sorted(riadky, key=lambda r: (not r['id'].isdigit(), int(r['id']) if r['id'].isdigit() else 0, r['id']))


def _uvod(d, m):
    """Zapíše nadpis, hlavičku (dátum, stav kódu) a úvodné odseky."""
    p = m.pocty
    d.w('# Svaply – zoznam nálezov, plán opráv a príprava nasadenia')
    d.w()
    d.w('> Hlavný zoznam nálezov projektu. Súbor je **generovaný** z dát v tomto priečinku (`build.py`) a neupravuje sa ručne: pozri časť 10.')
    d.w()
    d.w(f'Posledná aktualizácia: **{stav.STAV["datum"]}**. Stav kódu: {stav.STAV["kod"]}; register: {stav.STAV["register"]}. '
        'Zlučuje tri zdroje: (1) pôvodný zoznam 1–172 (viedol sa v samostatnej konverzácii), (2) nálezy z práce na vetvách od 127 '
        f'(čísla 173–{m.posledne_cislo}) a (3) evidenciu OW- / TEST- / APP- / TECH- z `docs/testing/findings-register.md`, ktorá ostáva podrobným denníkom '
        'týchto položiek. Súčasťou sú aj kontroly z 26. 10. 2026 (`pip-audit`, `npm audit`, prehľad repozitára a nasadzovacích súborov).')
    d.w()
    d.w('**Dôležité:** roztriedenie na HNEĎ / PRED NASADENÍM / PO NASADENÍ je návrh agenta; nič sa neopravuje bez výberu používateľa. '
        f'Čísla nálezov sú stabilné, nikdy sa nemenia ani nepoužívajú znova; nový nález dostane číslo {m.posledne_cislo + 1}. '
        f'Aktuálne je v zozname {p.spolu} nálezov.')
    d.w()


def _v_skratke(d, m):
    """Zapíše časť „V skratke“: počty, skupina HNEĎ, rozhodnutia a hosting (všetko dopočítané z dát)."""
    p = m.pocty
    cakaju = f' (z toho {p.caka_na_zlucenie} čaká na zlúčenie)' if p.caka_na_zlucenie else ''
    hned = _hned(m)
    cakajuce = [x for x in stav.DECISIONS if not x.get('odpoved')]
    hosting = next(x for x in stav.DECISIONS if x['id'] == 'R1')
    d.w('## V skratke')
    d.w()
    d.w(f'- Nálezy 1–{m.posledne_cislo}: hotové {p.hotove + p.caka_na_zlucenie}{cakaju}, zatvorené {p.zatvorene}, informačné {p.info}; '
        f'otvorené: **HNEĎ {p.nalezy[H]}**, **PRED NASADENÍM {p.nalezy[P]}**, **PO NASADENÍ {p.nalezy[A]}**.')
    dnes = p.povodne_otvorene_dnes
    d.w(f'- Z pôvodných {p.povodne_otvorene} otvorených položiek je dnes otvorených {sum(dnes.values())} '
        f'({dnes[P]} pred nasadením, {dnes[A]} po nasadení, {dnes[H]} hneď). Pri vzniku dokumentu (26. 10. 2026) nebola žiadna z nich kritická.')
    if hned:
        d.w('- **Hneď** (časť 3): ' + '; '.join(f'{r["id"]} – {_kratko(r)}' for r in hned) + '.')
    else:
        d.w('- **Hneď** (časť 3): nič nie je otvorené.')
    d.w(f'- **Pred nasadením** (časť 4): {p.nalezy[P]} nálezov, {p.registrove[P]} ID z registra a {p.uloh[P]} úloh na prípravu nasadenia. '
        'Odporúčané poradie je v časti 2.')
    d.w(f'- **Po nasadení** (časť 5): {p.nalezy[A]} nálezov a {p.registrove[A]} ID z registra (upratovanie, mikrovýkon, kozmetika, väčšie funkcie).')
    d.w(f'- **Rozhodnutia** (časť 6): čaká {len(cakajuce)} z {len(stav.DECISIONS)}; každé má v stĺpci „Kedy“ uvedené, od akej práce je potrebné.')
    if hosting.get('odpoved'):
        d.w(f'- **Hosting**: rozhodnuté (R1): {hosting["odpoved"]}')
    else:
        d.w('- **Hosting** nového servera sa rieši až keď bude aplikácia hotová (Railway ostáva na testy); odporúčanie je v prílohe C.')
    d.w()
    d.w('## Obsah')
    d.w()
    d.w('- [V skratke](#v-skratke)')
    for t in TITULY.values():
        d.w(f'- [{t}](#{kotva(t)})')
    d.w()


def _ako_citat(d):
    """Zapíše časť 0: význam skupín, legenda stĺpcov a pravidlá práce."""
    d.w('## ' + TITULY['0'])
    d.w()
    d.tabulka(['Skupina', 'Význam', 'Kritérium'], [
        ['**HNEĎ**', 'Riešiť teraz, ešte pred ďalšou funkčnou prácou.',
         'Bezpečnosť, strata alebo poškodenie dát, rozbitý základný tok; alebo vec, ktorá bráni bezpečnému testovaniu; alebo vec, ktorá je '
         'lacná teraz a drahá neskôr (veľké skoky verzií knižníc).'],
        ['**PRED NASADENÍM**', 'Musí byť hotové pred ostrým štartom pre používateľov, nie nutne teraz.',
         'Viditeľné chyby, chyby na iPhone, preklady pre jazyky štartu, spoľahlivosť CI a monitoringu. Príprava servera (úlohy N) sa robí '
         'až keď bude aplikácia hotová.'],
        ['**PO NASADENÍ**', 'Môže počkať aj po štarte.',
         'Kozmetika, upratovanie, mikrovýkon, architektonický dlh, väčšie nové funkcie, okrajové správanie.'],
    ])
    d.w('V tabuľkách je stĺpec **Dopad · Zl.**: dopad je **vysoký** (bezpečnosť, dáta, základný tok), **stredný** (viditeľná chyba, iPhone, jazyk) '
        'alebo **nízky**; zložitosť (**Zl.**) je **S** do pol dňa vrátane testov, **M** 1–2 dni, **L** viac dní alebo viac krokov. Sú to odhady, '
        'nie sľuby. Pri položkách, ktoré čakajú na rozhodnutie používateľa, je odkaz na časť 6. Stĺpec **Čo** je pri číslach 1–172 pôvodný text '
        'zo zoznamu, **Poznámka** pridáva agent.')
    d.w()
    d.w('Pravidlá práce: každá oprava ide na novú očíslovanú vetvu z `main`, najprv mapovanie a plán, kód až po výslovnom „poď na to“ používateľa, '
        'testy + mutačné kontroly, PR otvára používateľ. Registrové pravidlo: bezpečnosť, strata dát, obídenie oprávnení a nefunkčný základný tok '
        'majú prednosť.')
    d.w()


def _prehlad(d, m):
    """Zapíše časť 1: počty nálezov a mimo číslovania (úlohy, register)."""
    p = m.pocty
    d.w('## ' + TITULY['1'])
    d.w()
    d.w(f'Očíslované nálezy 1–{m.posledne_cislo}:')
    d.w()
    hned = ', '.join(r['id'] for r in _hned(m) if r['id'].isdigit()) or '–'
    riadky = [['Hotové (zlúčené do `main`)', p.hotove, 'tabuľka v časti 7']]
    if p.caka_na_zlucenie:
        riadky.append(['Opravené, čaká na zlúčenie', p.caka_na_zlucenie, 'tabuľka v časti 7'])
    riadky += [['Zatvorené rozhodnutím', p.zatvorene, 'časť 8'], ['Informačné bez akcie', p.info, 'časť 8'],
               ['**HNEĎ**', p.nalezy[H], f'časť 3 ({hned})'], ['**PRED NASADENÍM**', p.nalezy[P], 'časť 4'],
               ['**PO NASADENÍ**', p.nalezy[A], 'časť 5'],
               ['**Spolu**', p.spolu, f'172 pôvodných + {m.posledne_cislo - 172} nových (173–{m.posledne_cislo})']]
    d.tabulka(['Skupina', 'Počet', 'Poznámka'], riadky)
    d.w(f'Okrem toho (mimo číslovania 1–{m.posledne_cislo}):')
    d.w()
    d.tabulka(['Zdroj', 'HNEĎ', 'PRED', 'PO', 'Zlúčené, čaká živé overenie (N16)', 'Zatvorené alebo pokryté nálezom'], [
        [f'Úlohy na prípravu nasadenia N1–N{len(polozky_nove.NTASKS)}', p.uloh[H], p.uloh[P], p.uloh[A], '–', '–'],
        [f'Register: {p.register_spolu} ID (OW- / TEST- / APP- / TECH- / TOOL- / ENV- / DOC- / RET- / REG-)', p.registrove[H], p.registrove[P],
         p.registrove[A], len(register.REG_AWAIT_LIVE), len(register.REG_CLOSED) + len(register.REG_MAPPED)],
    ])


def _poradie(d):
    """Zapíše časť 2: odporúčané poradie práce (vlny z `stav.PORADIE`)."""
    d.w('## ' + TITULY['2'])
    d.w()
    d.tabulka(['Vlna', 'Čo', 'Prečo v tomto poradí'], [[f'**{v["vlna"]}**', v['co'], v['preco']] for v in stav.PORADIE])


def _skupiny(d, m):
    """Zapíše časti 3, 4 a 5 (HNEĎ, PRED NASADENÍM, PO NASADENÍ) po balíkoch."""
    p = m.pocty
    d.w('## ' + TITULY['3'])
    d.w()
    hned = [r['id'] for r in _hned(m)]
    d.w(f'{_riadkov(p.riadkov[H])}: {", ".join(hned)}.' if hned else 'Nič nie je otvorené.')
    d.w()
    _skupina_balikov(d, m.skupiny[H])
    d.w('## ' + TITULY['4'])
    d.w()
    d.w(f'{_riadkov(p.riadkov[P])} v {len(m.skupiny[P])} balíkoch (jeden riadok registra môže spájať viac ID). Balík „Príprava ostrého nasadenia“ '
        'sa robí až keď bude aplikácia hotová. Každý balík je jedna alebo dve vetvy z `main` (číslo vetvy sa pridelí pri štarte).')
    d.w()
    _skupina_balikov(d, m.skupiny[P])
    d.w('## ' + TITULY['5'])
    d.w()
    d.w(f'{_riadkov(p.riadkov[A])} v {len(m.skupiny[A])} skupinách. Dopad je všade nízky okrem uvedených výnimiek; poradie podľa potreby po štarte.')
    d.w()
    _skupina_balikov(d, m.skupiny[A])


def _rozhodnutia(d):
    """Zapíše časť 6: čakajúce rozhodnutia s odporúčaním a (ak existujú) už rozhodnuté."""
    d.w('## ' + TITULY['6'])
    d.w()
    d.w('Pri každom čakajúcom rozhodnutí je odporúčanie agenta. Odpovedať stačí číslom, napr. „R2: len slovenčina, R3: súhlasím“. '
        'Bez odpovede používateľa sa nič z toho nerobí.')
    d.w()
    cakajuce = [x for x in stav.DECISIONS if not x.get('odpoved')]
    if cakajuce:
        d.tabulka(['Č.', 'Téma', 'Otázka', 'Odporúčanie', 'Kedy'], [[x['id'], x['tema'], x['otazka'], x['odporucanie'], x['kedy']] for x in cakajuce])
    else:
        d.w('Všetky rozhodnutia sú vybavené.')
        d.w()
    hotove = [x for x in stav.DECISIONS if x.get('odpoved')]
    if hotove:
        d.w('**Rozhodnuté:**')
        d.w()
        d.tabulka(['Č.', 'Téma', 'Odpoveď', 'Dátum'], [[x['id'], x['tema'], x['odpoved'], x.get('datum', '')] for x in hotove])


def _hotove(d, m):
    """Zapíše časť 7: tabuľku PR, popis série Upozornenia a zoznam všetkých hotových položiek."""
    p = m.pocty
    d.w('## ' + TITULY['7'])
    d.w()
    d.w(f'{p.hotove + p.caka_na_zlucenie} položiek. Pri položkách 159–172 a novších platí: opravené a zlúčené (alebo označené ako čakajúce na '
        'zlúčenie); či ich používateľ overil manuálne, zoznam neeviduje.')
    d.w()
    podla_pr = defaultdict(list)
    for x in stav.DONE_SINCE:
        podla_pr[(x.get('pr') or 'PR čaká', x.get('vetva', ''))].append(str(x['n']))
    riadky = list(stav.DONE_PR_TABLE) + [(pr, vetva, ', '.join(cisla)) for (pr, vetva), cisla in podla_pr.items()]
    d.tabulka(['PR', 'Vetva', 'Položky'], riadky)
    d.w(stav.SERIA_UPOZORNENIA)
    d.w()
    d.w('Všetky hotové položky:')
    d.w()
    d.tabulka(['Č.', 'O čom'], [[n, t] for n, t in m.hotove.items()])


def _zatvorene(d, m):
    """Zapíše časť 8: položky zatvorené rozhodnutím a informačné."""
    d.w('## ' + TITULY['8'])
    d.w()
    d.w(f'**Zatvorené rozhodnutím ({m.pocty.zatvorene}):**')
    d.w()
    d.tabulka(['Č.', 'O čom'], [[n, t] for n, t in m.povodny['zatvorene'].items()])
    d.w(f'**Informačné / ponaučenia / účtovanie mutantov ({m.pocty.info}):**')
    d.w()
    d.tabulka(['Č.', 'O čom'], [[n, t] for n, t in m.povodny['info'].items()])


def _register(d, m):
    """Zapíše časť 9: čo z registra je zatvorené, čaká na živé overenie alebo je pokryté nálezom."""
    p = m.pocty
    d.w('## ' + TITULY['9'])
    d.w()
    d.w(f'Register `docs/testing/findings-register.md` má {p.register_spolu} ID. Otvorené sú v častiach 4 a 5 '
        f'({p.registrove[P]} pred nasadením, {p.registrove[A]} po nasadení). Zvyšok:')
    d.w()
    d.w(f'**Zlúčené do `main`, no register ešte vedie nasadený (živý) retest ({len(register.REG_AWAIT_LIVE)}) – úloha N16:**')
    d.w()
    d.tabulka(['ID', 'Kde je zlúčené'], list(register.REG_AWAIT_LIVE.items()))
    d.w(f'**Zatvorené ({len(register.REG_CLOSED)}):**')
    d.w()
    d.tabulka(['ID', 'Stav'], list(register.REG_CLOSED.items()))
    d.w(f'**Pokryté číslovaným nálezom ({len(register.REG_MAPPED)}):**')
    d.w()
    d.tabulka(['ID', 'Kde'], list(register.REG_MAPPED.items()))
    d.w('Zlúčené PR podľa histórie `main`: #168 (OW-01, OW-02), #172 (OW-10, OW-12, OW-13), #174 (OW-04), #175 (OW-03, OW-15), '
        '#178 (OW-16), #179 (diagnostika OW-18), #183 (OW-18, OW-19), #184 (OW-21, OW-22, OW-24), #185 (OW-23), #186 (OW-20), '
        '#193 (opisy a výsledky vyhľadávania). PR #195 je oprava dekódovania databázovej adresy (dôležité pri novom serveri, N5 / N6).')
    d.w()


def _udrzba(d, m):
    """Zapíše časť 10 (ako sa dokument udržiava) a časť 11 (denník zmien)."""
    d.w('## ' + TITULY['10'])
    d.w()
    d.w('Tento dokument je jediný hlavný zoznam nálezov. Postup pri udržiavaní:')
    d.w()
    d.w('- **Po každom novom nálezi alebo oprave** sa dokument aktualizuje v tej istej vetve, v ktorej sa zmena robí: nález = nový riadok, '
        'oprava = presun do časti 7. Zoznam tak vždy zodpovedá kódu na vetve.')
    d.w(f'- **Čísla:** nový nález dostane ďalšie voľné číslo ({m.posledne_cislo + 1}); čísla sa nikdy nemenia ani nepoužívajú znova. '
        'Úlohy na prípravu nasadenia majú vlastné číslovanie N1…, rozhodnutia R1….')
    d.w('- **Ako:** upraviť dáta (`polozky_nove.py`, `polozky_povodne.py`, `polozky_priprava.py`, `register.py`, `stav.py`, `hotove.py`), spustiť z koreňa repozitára '
        '`python docs/zoznam-nalezov/build.py` a pridať do commitu aj `ZOZNAM.md`. Skript overí úplnosť: čísla nálezov a ID z registra sú práve raz, '
        'súčty sedia, odkazy na rozhodnutia a balíky existujú a vlny v časti 2 nespomínajú hotové položky.')
    d.w('- **Oprava nálezu:** položku odstrániť z `ORIG_OPEN` / `NEW_ITEMS` a pridať do `DONE_SINCE` v `hotove.py` (číslo vetvy, PR keď je známe, '
        '`zlucene=True` po zlúčení). Upraviť aj vlny `stav.PORADIE`, ak ju spomínali.')
    d.w('- **Rozhodnutie:** vyplniť `odpoved` a `datum` v `stav.DECISIONS`.')
    d.w('- **Vždy:** posunúť `stav.STAV` (dátum, stav kódu) a doplniť riadok do `stav.ZMENY`.')
    d.w('- **Kontrola:** `python docs/zoznam-nalezov/build.py --check` skončí chybou, ak sa `ZOZNAM.md` líši od dát.')
    d.w('- Podrobný denník položiek OW- / TEST- ostáva v `docs/testing/findings-register.md`; nové ID, ktoré tam pribudnú, treba zaradiť do '
        '`register.py`, inak skript zlyhá.')
    d.w()
    d.w('## ' + TITULY['11'])
    d.w()
    d.tabulka(['Dátum', 'Zmena'], [list(z) for z in stav.ZMENY])


def _prilohy_ab(d, m):
    """Zapíše prílohy A (kontrola úplnosti) a B (zdroje, zistenia a obmedzenia)."""
    p = m.pocty
    povodne = m.povodny
    d.w('## ' + TITULY['A'])
    d.w()
    d.w('Generátor pri zostavení overil:')
    d.w()
    d.w(f'- pôvodný zoznam má presne čísla 1–172 raz ({len(povodne["hotove"])} + {p.zatvorene} + {p.info} + {p.povodne_otvorene} = 172); '
        'všetky pôvodne otvorené sú buď roztriedené, alebo zapísané ako opravené;')
    d.w(f'- nové nálezy majú súvislé čísla 173–{m.posledne_cislo};')
    d.w(f'- súčet skupín {p.hotove} + {p.caka_na_zlucenie} + {p.zatvorene} + {p.info} + {p.nalezy[H]} + {p.nalezy[P]} + {p.nalezy[A]} = **{p.spolu}**;')
    d.w(f'- všetkých {p.register_spolu} ID z registra je zaradených práve v jednej skupine (otvorené / čaká živé overenie / zatvorené / pokryté '
        'nálezom); žiadne nechýba a žiadne nie je dvakrát;')
    d.w(f'- úlohy N1–N{len(polozky_nove.NTASKS)} a rozhodnutia R1–R{len(stav.DECISIONS)} majú súvislé čísla; vlny v časti 2 spomínajú len otvorené položky.')
    d.w()
    d.w('## ' + TITULY['B'])
    d.w()
    d.w('- **Prečítané pri vzniku (26. 10. 2026):** pôvodný zoznam v plnom rozsahu, register z repozitára (stav 21. 10. + denník do PR #193), '
        'kód a nasadzovacie súbory na `main` (`d4207583`).')
    d.w('- **Spustené 26. 10. 2026:** `pip-audit` na 23 presne pripnutých backendových balíkoch, `npm audit --omit=dev` vo frontende, '
        'hľadanie tajomstiev v sledovaných súboroch a histórii (nič sa nenašlo; je to vzorové hľadanie, nie úplný audit), '
        'bodová kontrola rizík z auditu 2024 v kóde.')
    d.w('- **Zistenia z 26. 10. 2026:** najväčšie riziko pre ostrý štart nie sú staré nálezy, ale zraniteľné knižnice (183, 184), príprava servera '
        '(N1–N16) a veci s dlhou dodacou lehotou mimo kódu (doména a e-mail N2, právne dokumenty N3). Z pôvodných 101 otvorených položiek '
        'nebola žiadna kritická.')
    d.w('- **Neoverené:** obsah starších nálezov zo zoznamu 1–172 sa neprepočítaval v kóde (zdrojom je pôvodný zoznam). '
        'Odhady zložitosti a dopadu sú odhady agenta. Nález 9 (WebSocket bez tokenu) a hodnotenie 180 treba najprv overiť čítaním '
        '`ws_auth.py` a logmi servera. `pip-audit` a `npm audit` počítajú aj aliasy a závislosti, počty záznamov nie sú počty '
        'zneužiteľných chýb. Preklady v angličtine, nemčine a maďarčine mimo profilu a vyhľadávania sa nekontrolovali do hĺbky '
        '(meranie našlo mimo katalógu zručností 39 / 19 / 14 hodnôt zhodných so slovenčinou, časť z nich je legitímna). '
        'Hosting a ceny v prílohe C sú odborný odhad bez živého porovnania cenníkov.')
    d.w('- **Zdroje s dátumom:** pôvodný zoznam 1–172 (26. 10. 2026), register (21. 10. 2026), kód `main` `d4207583`.')
    d.w()


def zostav_dokument(m):
    """Zostaví celý Markdown zoznamu nálezov z modelu `m` a vráti ho ako reťazec."""
    d = Dokument()
    _uvod(d, m)
    _v_skratke(d, m)
    _ako_citat(d)
    _prehlad(d, m)
    _poradie(d)
    _skupiny(d, m)
    _rozhodnutia(d)
    _hotove(d, m)
    _zatvorene(d, m)
    _register(d, m)
    _udrzba(d, m)
    _prilohy_ab(d, m)
    d.w('## ' + TITULY['C'])
    d.w()
    priloha_c(d)
    return d.text()
