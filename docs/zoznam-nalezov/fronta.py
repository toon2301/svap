# -*- coding: utf-8 -*-
"""Poradie prác na nálezoch „po nasadení“ (prvá dávka pre kolegu) a stav ich riešenia.

Poradie je návrh agenta (malé, lokálne zmeny s nízkym rizikom, ktoré nekolidujú s prácou pred nasadením); schvaľuje majiteľ.
Súbor sa upravuje len pri zmene stavu:
- nález je voľný, kým nemá vyplnené `kto`;
- keď ho niekto začne, doplní sa `kto`, `stav` (`STAV_ROZROBENE`) a `od` (dátum);
- keď oprava čaká na zlúčenie, `stav` je `STAV_CAKA`;
- keď je nález hotový, záznam sa odstráni odtiaľto a nález sa presunie do `hotove.DONE_SINCE`.

Kontrola v `model.py` zlyhá, ak záznam odkazuje na nález, ktorý už nie je otvorený alebo nie je zo skupiny PO NASADENÍ, takže
zoznam nemôže ticho zastarať.
"""

STAV_ROZROBENE = 'rozrobené'
STAV_CAKA = 'čaká na zlúčenie'
STAVY = (STAV_ROZROBENE, STAV_CAKA)

# Záznam: dict(n='192', co='krátky popis', preco='prečo je v dávke a v tomto poradí'); pri práci navyše
# kto='kolega', stav=STAV_ROZROBENE, od='3. 11. 2026'. ID je reťazec (číslo nálezu alebo ID z registra, napr. 'APP-05').
FRONTA_PO_NASADENI = []
