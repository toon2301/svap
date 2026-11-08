"""Kontrola zámku závislostí backendu `backend/constraints.txt` (nález 244).

Zámok drží presné verzie všetkých balíkov vrátane tranzitívnych, aby sa build (Railway, Docker, CI) nezmenil bez zmeny
kódu (incident z nálezu 240). Po zmene `requirements.txt` sa ľahko zabudne zámok obnoviť: nový balík potom prichádza bez
pinu aj s tranzitívnymi balíkmi a build sa zase môže ticho rozísť. Skript preto zlyhá, keď:

- riadok zámku nie je presný pin `názov==verzia` (rozsah, URL, doplnok v hranatých zátvorkách, opakovaný balík),
- `requirements*.txt` neodkazuje na zámok riadkom `-c constraints.txt`,
- priama závislosť z `requirements*.txt` v zámku chýba alebo jej pripnutá verzia nevyhovuje požiadavke,
- (s `--installed`) sa nainštalované balíky líšia od zámku: chýbajú v ňom, majú inú verziu alebo sú v ňom navyše.

Končí kódom 1, keď sa našla nezhoda, a kódom 2, keď súbor chýba alebo je poškodený (kontrola sa vtedy nevykonala).
Skript používa štandardnú knižnicu a `packaging` (je v prostredí z `requirements-test.txt`, patrí k pytestu).
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

from packaging.requirements import InvalidRequirement, Requirement

EXIT_OK = 0
EXIT_MISMATCH = 1
EXIT_BAD_INPUT = 2

# Riadok, ktorým requirements súbory načítajú zámok; bez neho by sa pip zámkom neriadil.
LOCK_REFERENCE = "-c constraints.txt"

# Presný pin: názov a verzia bez medzier, rozsahov, doplnkov, URL a komentárov (takto ho vypisuje `pip freeze`).
_PIN = re.compile(
    r"^(?P<name>[A-Za-z0-9][A-Za-z0-9._-]*)==(?P<version>[A-Za-z0-9][A-Za-z0-9.!+_-]*)$"
)


class LockInputError(Exception):
    """Zámok, súbor požiadaviek alebo výpis `pip freeze` chýba, je poškodený alebo má nesprávny tvar."""


def normalize_name(name: str) -> str:
    """Názov balíka v tvare podľa PEP 503 (malé písmená, `-` namiesto `_` a `.`), aby sa `pillow_heif` rovnal `pillow-heif`."""
    return re.sub(r"[-_.]+", "-", name).lower()


def _parse_pins(text: str, label: str) -> dict[str, str]:
    """Načíta riadky `názov==verzia` (prázdne riadky a komentáre preskočí); iný tvar alebo opakovaný balík je chyba vstupu."""
    pins: dict[str, str] = {}
    for number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        match = _PIN.match(line)
        if not match:
            raise LockInputError(
                f"{label}, riadok {number}: nie je presný pin `názov==verzia`: {line}"
            )
        name = normalize_name(match["name"])
        if name in pins:
            raise LockInputError(
                f"{label}, riadok {number}: balík `{name}` je tu viackrát."
            )
        pins[name] = match["version"]
    return pins


def parse_lock(text: str) -> dict[str, str]:
    """Zámok ako slovník normalizovaný názov → pripnutá verzia; prázdny zámok je chyba (nič by nebolo pripnuté)."""
    pins = _parse_pins(text, "zámok")
    if not pins:
        raise LockInputError("zámok neobsahuje žiadny pin.")
    return pins


def parse_freeze(text: str) -> dict[str, str]:
    """Výpis `pip freeze` ako slovník normalizovaný názov → verzia; riadok bez presnej verzie (napr. `-e`, `@ URL`) je chyba."""
    return _parse_pins(text, "pip freeze")


def installed_pins() -> dict[str, str]:
    """Balíky nainštalované v prostredí, v ktorom skript beží (`python -m pip freeze`, bez pip, setuptools a wheel)."""
    result = subprocess.run(
        [sys.executable, "-m", "pip", "freeze"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise LockInputError(f"`pip freeze` zlyhal (kód {result.returncode}).")
    return parse_freeze(result.stdout)


def read_requirements(path: str) -> tuple[list[Requirement], bool]:
    """Priame závislosti zo súboru požiadaviek a údaj, či súbor odkazuje na zámok riadkom `-c constraints.txt`.

    Prázdne riadky, komentáre (aj za medzerou) a voľby pipu (`-r`, `-c`) sa v zozname požiadaviek nezobrazia.
    """
    try:
        text = Path(path).read_text(encoding="utf-8")
    except OSError as exc:
        raise LockInputError(
            f"súbor požiadaviek `{path}` sa nedá prečítať ({exc.__class__.__name__})."
        ) from exc
    requirements: list[Requirement] = []
    references_lock = False
    for number, raw in enumerate(text.splitlines(), start=1):
        line = raw.split(" #", 1)[0].strip()
        if not line or line.startswith("#"):
            continue
        if line == LOCK_REFERENCE:
            references_lock = True
            continue
        if line.startswith("-"):
            continue
        try:
            requirements.append(Requirement(line))
        except InvalidRequirement as exc:
            raise LockInputError(
                f"`{path}`, riadok {number}: neplatná požiadavka: {line}"
            ) from exc
    return requirements, references_lock


def check_requirements(
    requirements: list[Requirement], lock: dict[str, str]
) -> list[str]:
    """Nezhody medzi priamymi závislosťami a zámkom: balík bez pinu alebo pin, ktorý požiadavke nevyhovuje."""
    problems = []
    for requirement in requirements:
        name = normalize_name(requirement.name)
        version = lock.get(name)
        if version is None:
            problems.append(
                f"priama závislosť `{requirement.name}` nie je v zámku (obnov zámok podľa jeho hlavičky)"
            )
        elif not requirement.specifier.contains(version, prereleases=True):
            problems.append(
                f"zámok pripína `{requirement.name}=={version}`, požiadavka je `{requirement.name}{requirement.specifier}`"
            )
    return problems


def compare_installed(installed: dict[str, str], lock: dict[str, str]) -> list[str]:
    """Nezhody medzi nainštalovanými balíkmi a zámkom: nepripnutý balík, iná verzia a balík v zámku navyše."""
    problems = []
    for name in sorted(installed):
        if name not in lock:
            problems.append(f"nainštalovaný `{name}=={installed[name]}` chýba v zámku")
        elif installed[name] != lock[name]:
            problems.append(
                f"`{name}`: zámok má {lock[name]}, nainštalované je {installed[name]}"
            )
    for name in sorted(set(lock) - set(installed)):
        problems.append(
            f"zámok obsahuje `{name}=={lock[name]}`, no balík nie je nainštalovaný"
        )
    return problems


def build_parser() -> argparse.ArgumentParser:
    """Argumenty príkazového riadka: súbor zámku, súbory požiadaviek a prepínač kontroly nainštalovaných balíkov."""
    parser = argparse.ArgumentParser(
        description="Kontrola zámku závislostí backendu (nález 244)."
    )
    parser.add_argument(
        "--lock", required=True, help="súbor zámku (backend/constraints.txt)"
    )
    parser.add_argument(
        "--requirements",
        nargs="*",
        default=[],
        help="súbory requirements, ktoré musia odkazovať na zámok",
    )
    parser.add_argument(
        "--installed",
        action="store_true",
        help="porovnať aj nainštalované balíky (pip freeze) so zámkom",
    )
    return parser


def run_checks(args: argparse.Namespace) -> list[str]:
    """Spustí všetky kontroly podľa argumentov a vráti zoznam nezhôd; chybu vstupu hlási výnimkou `LockInputError`."""
    try:
        lock = parse_lock(Path(args.lock).read_text(encoding="utf-8"))
    except OSError as exc:
        raise LockInputError(
            f"súbor zámku `{args.lock}` sa nedá prečítať ({exc.__class__.__name__})."
        ) from exc
    problems: list[str] = []
    for path in args.requirements:
        requirements, references_lock = read_requirements(path)
        if not references_lock:
            problems.append(
                f"`{path}` neodkazuje na zámok (chýba riadok `{LOCK_REFERENCE}`)"
            )
        problems += check_requirements(requirements, lock)
    if args.installed:
        problems += compare_installed(installed_pins(), lock)
    return problems


def main(argv: list[str] | None = None) -> int:
    """Vstupný bod: vypíše výsledok kontroly a vráti kód ukončenia (0 v poriadku, 1 nezhoda, 2 chyba vstupu)."""
    args = build_parser().parse_args(argv)
    try:
        problems = run_checks(args)
    except LockInputError as exc:
        print(f"Kontrola zámku sa nevykonala: {exc}", file=sys.stderr)
        return EXIT_BAD_INPUT
    if problems:
        print(f"Zámok závislostí nesedí ({len(problems)} nezhôd):")
        for problem in problems:
            print(f"  - {problem}")
        print(
            "Obnov backend/constraints.txt podľa postupu v jeho hlavičke a spusti celú sadu testov."
        )
        return EXIT_MISMATCH
    print("Zámok závislostí sedí.")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
