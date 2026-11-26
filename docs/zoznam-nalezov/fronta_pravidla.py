# -*- coding: utf-8 -*-
"""Pravidlá fronty prác: ktorú položku možno vziať (voľná) a prečo sa iná vziať nedá.

Záznam fronty (`fronta.FRONTA`) môže mať dve voliteľné polia:
- `caka=('majiteľ', 'čo presne treba')`: položka čaká na rozhodnutie, overenie alebo vzhľad od majiteľa (alebo od Codexa);
- `po=['380']`: položka závisí od iných nálezov a vziať sa dá až po ich dokončení (závislosť musí byť vo fronte skôr).
Agent berie vždy prvú VOĽNÚ položku v poradí (nie slepo prvú). Modul nič nemení ani nenačítava z disku.
"""

from konstanty import KTO_CAKA


def dovod_blokovania(zaznam, otvorene_id):
    """Vráti text, prečo záznam nejde vziať, alebo `None`, ak je voľný.

    `otvorene_id` je množina ID, ktoré sú ešte otvorené: závislosť (`po`) blokuje, len kým je otvorená.
    """
    caka = zaznam.get('caka')
    if caka:
        kto, co = caka
        return 'čaká na %s: %s' % (KTO_CAKA.get(kto, kto), co)
    otvorene = [i for i in zaznam.get('po', ()) if i in otvorene_id]
    if otvorene:
        return 'čaká na dokončenie: %s' % ', '.join(otvorene)
    return None


def prva_volna(zaznamy, otvorene_id):
    """Prvý voľný záznam fronty v poradí, alebo `None`, ak čakajú všetky (alebo je fronta prázdna)."""
    for zaznam in zaznamy:
        if dovod_blokovania(zaznam, otvorene_id) is None:
            return zaznam
    return None
