# -*- coding: utf-8 -*-
"""Vykreslenie nových záznamov zoznamu nálezov ako zdrojový text (jadro skriptu `zapis.py`).

Tvar zodpovedá existujúcim dátovým súborom (`dict(...)` s kľúčmi pod sebou, dlhé texty zalomené na jednoduché literály). Texty sa
najprv zjednotia (medzery a zalomenia na jednu medzeru) a v literáloch sa zakódujú obrátené lomky a apostrofy, takže apostrof ani
`\\` v texte dáta nepokazia. Vstupy od agenta overuje `over_*`; chyba má vždy slovenský popis, čo je zle.
"""

SIRKA = 118  # približná šírka zalomeného literálu
NAJVIAC_ZNAKOV = 20000  # strop na jedno textové pole (poistka proti omylom, napr. vloženému súboru)

# Hodnoty zo vstupu (JSON) -> názvy konštánt z `konstanty.py`, ako ich používajú dátové súbory.
SKUPINY = {'H': 'H', 'P': 'P', 'A': 'A'}
DOPADY = {'V': 'V', 'S': 'S_', 'N': 'N'}
ZLOZITOSTI = {'S': 'ES', 'M': 'EM', 'L': 'EL'}


class ChybaVstupu(Exception):
    """Vstup od agenta (JSON alebo argument) je neplatný; správa je určená agentovi a hovorí, čo opraviť."""


def normalizuj(text, pole):
    """Zjednotí medzery a zalomenia v texte pola `pole`; odmietne prázdny, príliš dlhý text a riadiace znaky."""
    if not isinstance(text, str):
        raise ChybaVstupu('pole %s musí byť text' % pole)
    if any(ord(c) < 32 and c not in '\n\r\t' for c in text):
        raise ChybaVstupu('pole %s obsahuje riadiace znaky' % pole)
    cisty = ' '.join(text.split())
    if not cisty:
        raise ChybaVstupu('pole %s je prázdne' % pole)
    if len(cisty) > NAJVIAC_ZNAKOV:
        raise ChybaVstupu('pole %s má %d znakov (najviac %d); skráť ho' % (pole, len(cisty), NAJVIAC_ZNAKOV))
    return cisty


def _kodovanie(kus):
    """Zakóduje text do tela jednoduchého literálu."""
    return kus.replace('\\', '\\\\').replace("'", "\\'")


def retazec(text):
    """Krátky text ako jeden jednoduchý literál na jednom riadku (napr. dátum, číslo PR, názov balíka)."""
    return "'" + _kodovanie(text) + "'"


def literal(text, odsadenie):
    """Dlhý text ako jeden alebo viac literálov pod sebou; prvý bez odsadenia (pokračuje za `kluc=`), ďalšie so `odsadenie` medzerami."""
    kusy, aktualny = [], ''
    for slovo in text.split(' '):
        if aktualny and len(aktualny) + 1 + len(slovo) > SIRKA:
            kusy.append(aktualny + ' ')
            aktualny = slovo
        else:
            aktualny = aktualny + ' ' + slovo if aktualny else slovo
    kusy.append(aktualny)
    return ("'" + _kodovanie(kusy[0]) + "'") + ''.join('\n' + ' ' * odsadenie + "'" + _kodovanie(k) + "'" for k in kusy[1:])


def kus_na_pripojenie(text):
    """Telo literálu pre `Zdroj.pridaj_kusok_retazca` (zakódované, bez úvodnej medzery, tú pridá `Zdroj`)."""
    return _kodovanie(text)


def _volba(hodnota, povolene, pole):
    """Prevedie hodnotu poľa `pole` zo vstupu podľa mapy `povolene` na názov používaný v dátových súboroch; neznáma hodnota
    je `ChybaVstupu` s výpisom povolených hodnôt."""
    if not isinstance(hodnota, str) or hodnota not in povolene:
        raise ChybaVstupu('pole %s: %r nie je povolené (povolené: %s)' % (pole, hodnota, ', '.join(sorted(povolene))))
    return povolene[hodnota]


# ---------------------------------------------------------------- vykreslenie záznamov
def nalez(n, skupina, dopad, zlozitost, balik, kratko, co, poznamka, zdroj, rozhodnutie=None):
    """Nový otvorený nález (`dict(n=…)` zo `zaznamy_nove_NN.py`)."""
    dec = 'None' if rozhodnutie is None else retazec('ROZHODNUTIE ' + rozhodnutie)
    return ("    dict(n=%d, bucket=%s, imp=%s, eff=%s, pkg=%s,\n" % (
                n, _volba(skupina, SKUPINY, 'skupina'), _volba(dopad, DOPADY, 'dopad'),
                _volba(zlozitost, ZLOZITOSTI, 'zlozitost'), retazec(balik))
            + '         kratko=' + literal(kratko, 16) + ',\n'
            + '         what=' + literal(co, 14) + ',\n'
            + '         note=' + literal(poznamka, 14) + ',\n'
            + '         dec=%s, src=%s),\n' % (dec, retazec(zdroj)))


def hotove(n, vetva, pr, zlucene, rucny_test, text):
    """Hotová položka (`dict(n=…)` zo `zaznamy_hotove_NN.py`)."""
    pole = "n=%d, vetva=%s, pr=%s, zlucene=%s" % (n, retazec(vetva), 'None' if pr is None else retazec(pr), 'True' if zlucene else 'False')
    if rucny_test is not None:
        pole += ', rucny_test=' + retazec(rucny_test)
    return '    dict(%s,\n         text=%s),\n' % (pole, literal(text, 14))


def cast_pr(pr, vetva, text):
    """Riadok tabuľky PR pre PR, v ktorom nález nie je hotový celý (tuple `(PR, vetva, text)`)."""
    return '    (%s, %s, %s),\n' % (retazec(pr), retazec(vetva), literal(text, 8))


def fronta(n, davka, co, preco, caka=None, po=None):
    """Záznam fronty prác (`dict(n='…')` do `fronta.FRONTA`)."""
    text = "    dict(n=%s, davka=%s,\n" % (retazec(n), retazec(davka))
    text += '         co=' + literal(co, 12) + ',\n'
    text += '         preco=' + literal(preco, 15)
    if caka:
        text += ",\n         caka=(%s, %s)" % (retazec(caka[0]), literal(caka[1], 19))
    if po:
        text += ",\n         po=[%s]" % ', '.join(retazec(i) for i in po)
    return text + '),\n'


def rozhodnutie(identifikator, tema, otazka, odporucanie, kedy, odpoved=None, datum=None):
    """Rozhodnutie (`dict(id='R…')` zo `zaznamy_rozhodnutia_NN.py`)."""
    text = "    dict(id=%s, tema=%s,\n" % (retazec(identifikator), literal(tema, 14))
    text += '         otazka=' + literal(otazka, 16) + ',\n'
    text += '         odporucanie=' + literal(odporucanie, 20) + ',\n'
    text += '         kedy=' + literal(kedy, 14)
    if odpoved:
        text += ',\n         odpoved=' + literal(odpoved, 16)
        text += ',\n         datum=' + retazec(datum)
    return text + '),\n'


def zatvorene(n, rozhodnutie_id, datum, text):
    """Nález zatvorený rozhodnutím (`dict(n=…)` zo `zaznamy_zatvorene_NN.py`)."""
    return "    dict(n=%d, rozhodnutie=%s, datum=%s,\n         text=%s),\n" % (n, retazec(rozhodnutie_id), retazec(datum), literal(text, 14))


def zmena(datum, text):
    """Záznam denníka zmien (tuple `(dátum, text)` na začiatok `stav.ZMENY`)."""
    return '    (%s,\n      %s),\n' % (retazec(datum), literal(text, 6))
