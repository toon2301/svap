"""Skript `.github/scripts/check_dependency_lock.py` a zámok `backend/constraints.txt` (nález 244).

Zámok drží presné verzie všetkých balíkov, aby sa build na Railway, v Dockeri a v CI nezmenil bez zmeny kódu (incident
z nálezu 240). Testy strážia tri veci: skript rozozná nezhodu zámku s požiadavkami a s nainštalovanými balíkmi (a chýbajúci
alebo poškodený vstup nevydáva za čistý výsledok), skutočný zámok v repozitári sedí s `requirements*.txt` a všetky miesta,
ktoré závislosti inštalujú alebo auditujú (Dockerfile, CI, týždenný audit), zámok naozaj používajú.
"""

import importlib.util
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND = REPO_ROOT / "backend"
SCRIPT = REPO_ROOT / ".github" / "scripts" / "check_dependency_lock.py"
LOCK_FILE = BACKEND / "constraints.txt"
REQUIREMENTS_FILES = [BACKEND / "requirements.txt", BACKEND / "requirements-test.txt"]
DOCKERFILE = BACKEND / "Dockerfile"
CI_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "deploy.yml"
AUDIT_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "dependency-audit.yml"

_spec = importlib.util.spec_from_file_location("check_dependency_lock", SCRIPT)
lock_check = importlib.util.module_from_spec(_spec)
# Modul musí byť v `sys.modules` už pri načítaní (rovnako ako pri skripte auditu).
sys.modules[_spec.name] = lock_check
_spec.loader.exec_module(lock_check)

LOCK_TEXT = """# hlavička zámku
django==5.2.18
pillow_heif==1.8.1

celery==5.7.0
kombu==5.7.0
"""


def write(tmp_path, name, text):
    """Zapíše súbor do dočasného adresára a vráti jeho cestu ako reťazec."""
    path = tmp_path / name
    path.write_text(text, encoding="utf-8")
    return str(path)


def test_parse_lock_reads_pins_and_skips_comments_and_blank_lines():
    """Zámok sa načíta ako normalizovaný názov → verzia; komentáre a prázdne riadky sa preskočia."""
    assert lock_check.parse_lock(LOCK_TEXT) == {
        "django": "5.2.18",
        "pillow-heif": "1.8.1",
        "celery": "5.7.0",
        "kombu": "5.7.0",
    }


@pytest.mark.parametrize(
    "line",
    [
        "django>=5.2",
        "django~=5.2.0",
        "django==5.*",
        "celery[redis]==5.7.0",
        "pkg @ https://example.com/pkg.whl",
        "-e git+https://example.com/pkg.git#egg=pkg",
        "django==5.2.18 # komentár",
        "django == 5.2.18",
        "==5.2.18",
    ],
)
def test_parse_lock_rejects_lines_that_are_not_exact_pins(line):
    """Rozsah, doplnok, URL, editovateľná inštalácia, komentár za pinom ani medzery nie sú presný pin."""
    with pytest.raises(lock_check.LockInputError, match="presný pin"):
        lock_check.parse_lock("django==5.2.18\n" + line + "\n")


def test_parse_lock_rejects_a_package_pinned_twice_even_under_another_spelling():
    """Ten istý balík dvakrát (aj ako `Pillow_Heif` a `pillow-heif`) je chyba: pip by použil prvý alebo hlásil konflikt."""
    with pytest.raises(lock_check.LockInputError, match="viackrát"):
        lock_check.parse_lock("pillow_heif==1.8.1\nPillow-Heif==1.8.1\n")


def test_parse_lock_rejects_a_lock_without_any_pin():
    """Zámok len z komentárov by nič nepripínal, preto je to chyba, nie čistý výsledok."""
    with pytest.raises(lock_check.LockInputError, match="žiadny pin"):
        lock_check.parse_lock("# len hlavička\n\n")


def test_normalize_name_follows_pep_503():
    """Podčiarkovníky, bodky a pomlčky sa zjednotia a veľkosť písmen sa ignoruje."""
    assert lock_check.normalize_name("Zope.Interface") == "zope-interface"
    assert lock_check.normalize_name("pillow_heif") == "pillow-heif"
    assert lock_check.normalize_name("Django") == "django"


def test_read_requirements_returns_direct_dependencies_and_detects_the_lock_reference(
    tmp_path,
):
    """Priame závislosti (aj s doplnkom a rozsahom) sa načítajú, komentáre a voľby nie, odkaz na zámok sa rozpozná."""
    path = write(
        tmp_path,
        "requirements.txt",
        "# komentár\n-c constraints.txt\nDjango==5.2.18\ncelery[redis]>=5.4,<6  # za medzerou\n\n-r iny.txt\n",
    )

    requirements, references_lock = lock_check.read_requirements(path)

    assert references_lock is True
    assert [(r.name, str(r.specifier)) for r in requirements] == [
        ("Django", "==5.2.18"),
        ("celery", "<6,>=5.4"),
    ]


def test_read_requirements_reports_a_missing_lock_reference(tmp_path):
    """Súbor bez riadku `-c constraints.txt` sa pipu nezmení na zámok, preto sa to hlási."""
    _, references_lock = lock_check.read_requirements(
        write(tmp_path, "r.txt", "Django==5.2.18\n")
    )

    assert references_lock is False


def test_read_requirements_rejects_a_missing_file_and_an_invalid_line(tmp_path):
    """Chýbajúci súbor aj nezmyselná požiadavka sú chyba vstupu."""
    with pytest.raises(lock_check.LockInputError, match="nedá prečítať"):
        lock_check.read_requirements(str(tmp_path / "neexistuje.txt"))
    with pytest.raises(lock_check.LockInputError, match="neplatná požiadavka"):
        lock_check.read_requirements(write(tmp_path, "r.txt", "Django==\n"))


def requirement(text):
    """Požiadavka z textu, napr. `celery[redis]>=5.4,<6`."""
    return lock_check.Requirement(text)


def test_check_requirements_accepts_pins_that_satisfy_exact_and_range_requirements():
    """Pin vyhovuje presnej požiadavke aj rozsahu (aj `celery[redis]` sa porovnáva s `celery`)."""
    lock = lock_check.parse_lock(LOCK_TEXT)

    assert (
        lock_check.check_requirements(
            [
                requirement("Django==5.2.18"),
                requirement("celery[redis]>=5.4,<6"),
                requirement("pillow-heif>=1.3,<2"),
            ],
            lock,
        )
        == []
    )


def test_check_requirements_reports_a_dependency_missing_from_the_lock():
    """Nová priama závislosť, ktorú zámok nepozná, sa hlási (nový balík by prišiel nepripnutý)."""
    problems = lock_check.check_requirements(
        [requirement("redis==6.4.0")], lock_check.parse_lock(LOCK_TEXT)
    )

    assert problems == [
        "priama závislosť `redis` nie je v zámku (obnov zámok podľa jeho hlavičky)"
    ]


@pytest.mark.parametrize("specifier", ["==5.2.19", ">=6", "<5"])
def test_check_requirements_reports_a_pin_that_does_not_satisfy_the_requirement(
    specifier,
):
    """Zámok s verziou mimo požiadavky sa hlási aj s oboma verziami."""
    problems = lock_check.check_requirements(
        [requirement("Django" + specifier)], lock_check.parse_lock(LOCK_TEXT)
    )

    assert len(problems) == 1 and "zámok pripína `Django==5.2.18`" in problems[0]


def test_parse_freeze_rejects_lines_without_an_exact_version():
    """Editovateľná alebo URL inštalácia vo výpise `pip freeze` sa nedá porovnať so zámkom, preto je to chyba vstupu."""
    with pytest.raises(lock_check.LockInputError, match="pip freeze"):
        lock_check.parse_freeze(
            "django==5.2.18\n-e git+https://example.com/x.git#egg=x\n"
        )


def test_compare_installed_accepts_an_identical_environment_regardless_of_spelling():
    """Rovnaké balíky a verzie sedia, aj keď sa názov píše inak (`pillow_heif` / `pillow-heif`)."""
    installed = lock_check.parse_freeze(
        "Django==5.2.18\npillow-heif==1.8.1\ncelery==5.7.0\nkombu==5.7.0\n"
    )

    assert (
        lock_check.compare_installed(installed, lock_check.parse_lock(LOCK_TEXT)) == []
    )


def test_compare_installed_reports_unpinned_changed_and_stale_packages():
    """Nepripnutý balík, iná verzia aj balík navyše v zámku sa hlásia samostatne."""
    installed = lock_check.parse_freeze(
        "django==5.2.19\npillow_heif==1.8.1\ncelery==5.7.0\nnovy-balik==1.0\n"
    )

    assert lock_check.compare_installed(
        installed, lock_check.parse_lock(LOCK_TEXT)
    ) == [
        "`django`: zámok má 5.2.18, nainštalované je 5.2.19",
        "nainštalovaný `novy-balik==1.0` chýba v zámku",
        "zámok obsahuje `kombu==5.7.0`, no balík nie je nainštalovaný",
    ]


def make_repo(
    tmp_path,
    lock=LOCK_TEXT,
    requirements="-c constraints.txt\nDjango==5.2.18\ncelery[redis]>=5.4,<6\n",
):
    """Dočasný zámok a súbor požiadaviek; vráti argumenty `--lock` a `--requirements` pre `main`."""
    return [
        "--lock",
        write(tmp_path, "constraints.txt", lock),
        "--requirements",
        write(tmp_path, "requirements.txt", requirements),
    ]


def test_main_succeeds_when_lock_and_requirements_agree(tmp_path, capsys):
    """Zhodný zámok a požiadavky končia kódom 0 a krátkym hlásením."""
    assert lock_check.main(make_repo(tmp_path)) == lock_check.EXIT_OK
    assert capsys.readouterr().out.strip() == "Zámok závislostí sedí."


def test_main_fails_with_a_list_of_problems_and_a_hint(tmp_path, capsys):
    """Nezhoda končí kódom 1, vypíše každý problém a odkáže na postup v hlavičke zámku."""
    argv = make_repo(tmp_path, requirements="Django==5.2.18\nredis==6.4.0\n")

    assert lock_check.main(argv) == lock_check.EXIT_MISMATCH
    out = capsys.readouterr().out
    assert (
        "neodkazuje na zámok" in out
        and "`redis` nie je v zámku" in out
        and "hlavičke" in out
    )


def test_main_compares_installed_packages_only_when_asked(
    tmp_path, monkeypatch, capsys
):
    """Bez `--installed` sa `pip freeze` nevolá; s ním sa nainštalované balíky porovnajú so zámkom."""
    calls = []
    monkeypatch.setattr(
        lock_check,
        "installed_pins",
        lambda: calls.append(1) or {"django": "5.2.18", "novy-balik": "1.0"},
    )
    argv = make_repo(tmp_path)

    assert lock_check.main(argv) == lock_check.EXIT_OK and calls == []
    assert lock_check.main(
        argv + ["--installed"]
    ) == lock_check.EXIT_MISMATCH and calls == [1]
    assert "`novy-balik==1.0` chýba v zámku" in capsys.readouterr().out


@pytest.mark.parametrize("broken", ["lock", "requirements"])
def test_main_treats_a_missing_or_broken_input_as_bad_input_not_as_a_clean_result(
    tmp_path, capsys, broken
):
    """Chýbajúci zámok alebo súbor požiadaviek znamená, že sa nič neoverilo (kód 2), nie že je všetko v poriadku."""
    argv = make_repo(tmp_path)
    argv[argv.index("--lock" if broken == "lock" else "--requirements") + 1] += ".chyba"

    assert lock_check.main(argv) == lock_check.EXIT_BAD_INPUT
    assert "nevykonala" in capsys.readouterr().err


def test_main_treats_a_failing_pip_freeze_as_bad_input(tmp_path, monkeypatch, capsys):
    """Zlyhaný `pip freeze` nesmie skončiť zeleným výsledkom."""

    class Failed:
        """Výsledok neúspešného príkazu."""

        returncode = 3
        stdout = ""

    monkeypatch.setattr(lock_check.subprocess, "run", lambda *a, **k: Failed())

    assert (
        lock_check.main(make_repo(tmp_path) + ["--installed"])
        == lock_check.EXIT_BAD_INPUT
    )
    assert "pip freeze" in capsys.readouterr().err


def test_the_repository_lock_agrees_with_the_requirements_files():
    """Skutočný zámok je platný, odkazujú naň oba súbory požiadaviek a každá priama závislosť má v ňom vyhovujúcu verziu."""
    argv = ["--lock", str(LOCK_FILE), "--requirements", *map(str, REQUIREMENTS_FILES)]

    assert lock_check.main(argv) == lock_check.EXIT_OK


def test_the_repository_lock_header_explains_how_to_regenerate_it():
    """Hlavička zámku hovorí, kedy sa mení a ako sa generuje (bez starého zámku), aby sa postup nestratil."""
    header = "\n".join(
        line
        for line in LOCK_FILE.read_text(encoding="utf-8").splitlines()
        if line.startswith("#")
    )

    assert "Kedy sa mení" in header and "Ako sa generuje" in header
    assert "grep -hv '^-c '" in header and "pip freeze" in header


def test_the_dockerfile_copies_the_lock_before_installing():
    """Obraz kopíruje zámok spolu s požiadavkami pred `pip install`, inak by sa inštalácia ticho nepripla."""
    text = DOCKERFILE.read_text(encoding="utf-8")

    assert "COPY requirements.txt constraints.txt ./" in text
    assert text.index("COPY requirements.txt constraints.txt") < text.index(
        "RUN pip install"
    )


def test_the_ci_workflow_runs_the_lock_check_after_installing_and_caches_by_the_lock():
    """CI po inštalácii porovná prostredie so zámkom a cache závislostí sa viaže aj na zámok (v oboch jobech)."""
    text = CI_WORKFLOW.read_text(encoding="utf-8")

    assert text.count("\n          backend/constraints.txt\n") == 2
    assert re.search(
        r"check_dependency_lock\.py\s+--lock constraints\.txt\s+--requirements requirements\.txt requirements-test\.txt\s+--installed",
        text,
    )
    assert text.index("Install backend dependencies") < text.index(
        "check_dependency_lock.py"
    )


def test_the_weekly_audit_audits_the_lock_so_transitive_packages_are_covered():
    """Týždenný audit číta zámok (presné verzie všetkých balíkov) a nerozlišuje si závislosti sám."""
    text = AUDIT_WORKFLOW.read_text(encoding="utf-8")

    assert "pip-audit -r backend/constraints.txt" in text
    assert "--no-deps" in text and "--disable-pip" in text
    assert "-r backend/requirements" not in text
