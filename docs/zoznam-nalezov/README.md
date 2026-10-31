# Zoznam nálezov

Hlavný zoznam nálezov projektu Svaply je v súbore [`ZOZNAM.md`](ZOZNAM.md). Súbor sa **generuje** z dát v tomto priečinku, preto sa
neupravuje ručne. Generátor pri každom spustení overí úplnosť (čísla nálezov a ID z registra sú práve raz, súčty sedia), takže zoznam
nemôže ticho prestať sedieť.

## Súbory

| Súbor | Obsah |
| --- | --- |
| `ZOZNAM.md` | Generovaný dokument, ktorý sa číta. |
| `povodny_zoznam.json` | Pôvodný zoznam nálezov 1–172 (texty bez úprav). |
| `polozky_povodne.py` | Roztriedenie otvorených položiek 1–172: skupina, dopad, zložitosť, balík, poznámka. |
| `polozky_nove.py` | Nové nálezy od 173. |
| `polozky_priprava.py` | Úlohy na prípravu ostrého nasadenia N1…. Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich sprístupňuje pod pôvodným názvom. |
| `register.py` | Stav ID z `docs/testing/findings-register.md` (otvorené, zatvorené, čaká živé overenie). |
| `stav.py` | Dátum a stav kódu, poradie práce, rozhodnutia, denník zmien. |
| `hotove.py` | Nálezy opravené po prvom vydaní (`DONE_SINCE`), tabuľka PR a popis série Upozornenia. Samostatný súbor, aby žiadny súbor nepresiahol 500 riadkov; `stav.py` ich sprístupňuje pod pôvodnými názvami. |
| `konstanty.py`, `model.py`, `vystup.py`, `priloha_hosting.py`, `build.py` | Generátor (len štandardná knižnica Pythonu). |

## Ako aktualizovať

Po **každom novom nálezi alebo oprave** (v tej istej vetve, v ktorej sa mení kód):

1. **Nový nález:** pridať do `NEW_ITEMS` v `polozky_nove.py` s ďalším voľným číslom (čísla sa nikdy nemenia ani nepoužívajú znova).
   Nové ID v registri treba zaradiť do `register.py`.
2. **Oprava nálezu:** odstrániť ho z `ORIG_OPEN` (`polozky_povodne.py`) alebo `NEW_ITEMS` a pridať do `DONE_SINCE` v `hotove.py`
   (`n`, `text`, `vetva`, `pr` keď je známe, `zlucene=True` po zlúčení PR). Ak ho spomínala vlna v `stav.PORADIE`, upraviť ju.
3. **Odpoveď na rozhodnutie:** vyplniť `odpoved` a `datum` v `stav.DECISIONS`.
4. Posunúť `stav.STAV` (dátum, stav kódu) a doplniť riadok do `stav.ZMENY`.
5. Z koreňa repozitára spustiť `python docs/zoznam-nalezov/build.py` a pridať do commitu aj `ZOZNAM.md`.

Kontrola, či `ZOZNAM.md` zodpovedá dátam (nič nezapíše): `python docs/zoznam-nalezov/build.py --check`.

Podrobný denník položiek OW- / TEST- ostáva v `docs/testing/findings-register.md`.
