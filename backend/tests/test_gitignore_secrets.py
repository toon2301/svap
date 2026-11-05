"""Poistka: súbory s prihlasovacími údajmi Google sa pri bežnom pridaní do gitu ignorujú (nález 237).

V `.gitignore` boli názvy kľúčov v úvodzovkách a s medzerou na konci (artefakt zápisu z PowerShellu). Git ich berie
doslova, takže `backend/google-credentials.json` ani kľúč služobného účtu neboli ignorované a jeden `git add .` v
`backend/` mohol skončiť únikom kľúča do verejného repozitára. Testy strážia tri veci: žiadny riadok v `.gitignore`
nie je v úvodzovkách ani nekončí medzerou, git skutočne ignoruje názvy kľúčov (aj kľúč s iným ID po výmene a v ktoromkoľvek
priečinku), no bežné súbory neignoruje, a chyba samotného gitu poistku nevypne (test zlyhá, nepreskočí sa).

`.gitignore` však nezabráni `git add -f` a neodstráni súbor, ktorý už git sleduje; to tieto testy nestrážia.
"""

import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
GITIGNORE_FILES = [".gitignore", "backend/.gitignore", "frontend/.gitignore"]

# Názvy, ktoré musia byť ignorované: kľúč služobného účtu sa volá svaply-<ID kľúča>.json, po výmene kľúča má iné ID.
# Súbor môže ležať v ktoromkoľvek priečinku, preto sú tu aj vnorené cesty mimo `backend/` (pravidlá v koreni nesmú platiť
# len pre koreň).
MUST_BE_IGNORED = [
    "backend/google-credentials.json",
    "backend/google-credentials-old.json",
    "backend/svaply-8ae1b49fa953.json",
    "backend/svaply-0123456789ab.json",
    "google-credentials.json",
    "frontend/config/google-credentials.json",
    "nested/svaply-0123456789ab.json",
]
# Bežné súbory, ktoré sa ignorovať nesmú (pravidlá pre kľúče nesmú byť príliš široké).
MUST_NOT_BE_IGNORED = [
    "backend/manage.py",
    "backend/requirements.txt",
    "frontend/package.json",
    ".gitignore",
]

git_available = pytest.mark.skipif(
    shutil.which("git") is None or not (REPO_ROOT / ".git").exists(),
    reason="git alebo repozitár (.git) nie je dostupný, ignorovanie sa nedá overiť",
)


def _ignored_by_git(path: str) -> bool:
    """Vráti True, ak pravidlá ignorujú danú cestu (`git check-ignore -q`: kód 0 = ignorované, 1 = neignorované).

    `--no-index` vyhodnotí pravidlá aj pre sledované súbory; bez neho git sledované súbory nikdy nehlási ako ignorované
    a test „bežné súbory sa neignorujú“ by nezachytil príliš široké pravidlo (napr. `*.json`).
    """
    result = subprocess.run(
        ["git", "check-ignore", "--no-index", "-q", path], cwd=REPO_ROOT, capture_output=True, check=False
    )
    if result.returncode not in (0, 1):
        # Preskočenie by poistku ticho vypolo (napr. kód 128 pri chybnom repozitári); chýbajúci git rieši `git_available`.
        # Výstup gitu sa nevypisuje (môže obsahovať cestu s menom používateľa), len kód.
        pytest.fail(f"git check-ignore zlyhal (kód {result.returncode}); ignorovanie sa nedá overiť", pytrace=False)
    return result.returncode == 0


@pytest.mark.parametrize("name", GITIGNORE_FILES)
def test_gitignore_lines_are_not_quoted_or_padded(name):
    """Pravidlá v `.gitignore` nie sú v úvodzovkách a nekončia medzerou; git by ich bral doslova a nič by neignorovali."""
    path = REPO_ROOT / name
    assert path.is_file(), f"chýba súbor {name}"
    bad_lines = [
        number
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1)
        if line.startswith(('"', "'")) or line != line.rstrip()
    ]
    assert not bad_lines, f"{name}: riadky v úvodzovkách alebo s medzerou na konci: {bad_lines}"


@git_available
@pytest.mark.parametrize("path", MUST_BE_IGNORED)
def test_credential_file_names_are_ignored(path):
    """Súbory s prihlasovacími údajmi Google (aj kľúč s iným ID po výmene) git ignoruje."""
    assert _ignored_by_git(path), f"{path} nie je ignorovaný"


@git_available
@pytest.mark.parametrize("path", MUST_NOT_BE_IGNORED)
def test_regular_files_are_not_ignored(path):
    """Pravidlá pre kľúče nie sú príliš široké: bežné súbory projektu sa neignorujú."""
    assert not _ignored_by_git(path), f"{path} je ignorovaný"


def test_unexpected_git_exit_code_fails_instead_of_skipping(monkeypatch):
    """Neočakávaný kód gitu (napr. 128 pri chybnom repozitári) test zhodí; preskočenie by poistku ticho vypolo.

    Beží bez gitu: `subprocess.run` je nahradený odpoveďou s kódom 128. Preskočenie pri chýbajúcom gite rieši `git_available`.
    """
    monkeypatch.setattr(subprocess, "run", lambda args, **kwargs: subprocess.CompletedProcess(args, 128))
    outcome = "bez výnimky"
    try:
        _ignored_by_git("backend/google-credentials.json")
    except pytest.fail.Exception:
        outcome = "zlyhanie"
    except pytest.skip.Exception:
        outcome = "preskočenie"
    assert outcome == "zlyhanie", f"neočakávaný kód gitu skončil ako: {outcome}"
