"""Skript `.github/scripts/check_dependency_audit.py` (nález 194): porovnanie výstupov auditov so zoznamom výnimiek.

Týždenný workflow `dependency-audit.yml` na ňom stojí: nový záznam má skončiť červeným behom, výnimka nie, a chýbajúci
alebo poškodený výstup nástroja sa nesmie tváriť ako čistý audit. Testy bežia v CI spolu s ostatnými, aby sa skript, zoznam
výnimiek a workflow nerozišli.
"""

import importlib.util
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / ".github" / "scripts" / "check_dependency_audit.py"
EXCEPTIONS_FILE = REPO_ROOT / ".github" / "dependency-audit-exceptions.json"
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "dependency-audit.yml"

_spec = importlib.util.spec_from_file_location("check_dependency_audit", SCRIPT)
audit = importlib.util.module_from_spec(_spec)
# Modul musí byť v `sys.modules` už pri načítaní: `@dataclass` v ňom (s `from __future__ import annotations`)
# si podľa neho hľadá rozsah mien.
sys.modules[_spec.name] = audit
_spec.loader.exec_module(audit)

PYTEST_VULN = {
    "id": "PYSEC-2026-1845",
    "aliases": ["CVE-2025-71176", "GHSA-6w46-j5rx-g56g"],
    "fix_versions": ["9.0.3"],
    "description": "pytest relies on /tmp/pytest-of-{user}",
}
GLOB_ADVISORY = {
    "source": 1244013,
    "name": "glob",
    "title": "Glob: AbortSignal cancellation bypass",
    "url": "https://github.com/advisories/GHSA-3g3m-2fjr-6pw4",
    "severity": "moderate",
}
HIGH_ADVISORY = {
    "source": 999,
    "name": "left-pad",
    "title": "Vážna chyba",
    "url": "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
    "severity": "high",
}


def pip_report(*vulnerable):
    """Výstup `pip-audit`: dva balíky bez záznamov a zadané balíky `(názov, verzia, [záznamy])`."""
    dependencies = [
        {"name": "django", "version": "5.2.18", "vulns": []},
        {"name": "pillow", "version": "13.0.0", "vulns": []},
    ]
    dependencies += [
        {"name": n, "version": v, "vulns": vulns} for n, v, vulns in vulnerable
    ]
    return {"dependencies": dependencies, "fixes": []}


def npm_report(*advisories):
    """Výstup `npm audit`: balík `glob` s danými záznamami a odkaz `minimatch` na iný balík (ako to píše npm)."""
    vulnerabilities = {
        "glob": {
            "name": "glob",
            "severity": "moderate",
            "via": [*advisories, "minimatch"],
        }
    }
    return {
        "auditReportVersion": 2,
        "vulnerabilities": vulnerabilities if advisories else {},
        "metadata": {},
    }


def exceptions_file(pip=(), npm=()):
    """Zoznam výnimiek zadaných ID; každá má dôvod a podmienku odstránenia."""
    return {
        "pip": [
            {"id": i, "reason": "dôvod", "remove_when": "zatvorí 183"} for i in pip
        ],
        "npm": [
            {"id": i, "reason": "dôvod", "remove_when": "zatvorí 229"} for i in npm
        ],
    }


@pytest.fixture
def run(tmp_path, monkeypatch, capsys):
    """Spustí skript nad zadanými výstupmi a výnimkami; vráti `(kód, výstup, chybový výstup)`."""
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)

    def runner(pip, npm, exceptions, *extra):
        """Zapíše vstupy do dočasných súborov a zavolá `main`; vstup `None` znamená, že súbor neexistuje."""
        paths = {}
        for name, content in (("pip", pip), ("npm", npm), ("exceptions", exceptions)):
            path = tmp_path / f"{name}.json"
            if content is not None:
                path.write_text(
                    content if isinstance(content, str) else json.dumps(content),
                    encoding="utf-8",
                )
            paths[name] = str(path)
        code = audit.main(
            [
                "--pip",
                paths["pip"],
                "--npm",
                paths["npm"],
                "--exceptions",
                paths["exceptions"],
                *extra,
            ]
        )
        captured = capsys.readouterr()
        return code, captured.out, captured.err

    return runner


def test_pip_findings_keep_aliases_and_merge_repeated_records():
    """Ten istý záznam sa vo výstupe `pip-audit` opakuje (balík je vo viacerých súboroch); zlúči sa a nesie aj aliasy."""
    report = pip_report(
        ("pytest", "8.3.2", [PYTEST_VULN]), ("pytest", "8.3.2", [PYTEST_VULN])
    )

    findings = audit.pip_findings(report)

    assert len(findings) == 1
    assert findings[0].key == "PYSEC-2026-1845"
    assert findings[0].ids == {
        "PYSEC-2026-1845",
        "CVE-2025-71176",
        "GHSA-6w46-j5rx-g56g",
    }
    assert findings[0].description == "pytest 8.3.2"


def test_npm_findings_use_the_advisory_id_and_skip_references_to_other_packages():
    """Z `via` sa berú len záznamy (objekty); text `minimatch` je odkaz na iný balík, ktorého záznam je pri ňom."""
    findings = audit.npm_findings(npm_report(GLOB_ADVISORY))

    assert [f.key for f in findings] == ["GHSA-3g3m-2fjr-6pw4"]
    assert findings[0].severity == "moderate"
    assert findings[0].description.startswith("glob:")


def test_an_npm_record_without_a_url_is_identified_by_its_source_number():
    """Záznam bez odkazu sa nedá označiť ID GHSA, preto sa označí číslom zdroja (`npm-<zdroj>`)."""
    advisory = {key: value for key, value in GLOB_ADVISORY.items() if key != "url"}

    findings = audit.npm_findings(npm_report(advisory))

    assert [f.key for f in findings] == ["npm-1244013"]


def test_the_same_npm_advisory_under_two_packages_is_one_record():
    """Ten istý záznam sa môže objaviť pri viacerých balíkoch; hlási sa a počíta raz."""
    report = npm_report(GLOB_ADVISORY)
    report["vulnerabilities"]["minimatch"] = {
        "name": "minimatch",
        "severity": "moderate",
        "via": [GLOB_ADVISORY],
    }

    assert [f.key for f in audit.npm_findings(report)] == ["GHSA-3g3m-2fjr-6pw4"]


def test_exit_codes_match_the_documented_contract():
    """Kódy ukončenia sú podľa dokumentácie skriptu: 0 = čisté, 1 = nový záznam, 2 = zlý vstup."""
    codes = (audit.EXIT_OK, audit.EXIT_NEW_FINDINGS, audit.EXIT_BAD_INPUT)

    assert codes == (0, 1, 2)


def test_clean_audits_return_zero(run):
    """Bez záznamov je výsledok čistý."""
    code, out, _ = run(pip_report(), npm_report(), exceptions_file())

    assert code == audit.EXIT_OK
    assert "žiadne" in out


def test_a_finding_listed_in_the_exceptions_does_not_fail(run):
    """Záznam, ktorý je vo výnimkách, beh nezhodí."""
    code, out, _ = run(
        pip_report(("pytest", "8.3.2", [PYTEST_VULN])),
        npm_report(),
        exceptions_file(pip=["PYSEC-2026-1845"]),
    )

    assert code == audit.EXIT_OK
    assert "pip-audit: 1 záznamov, z toho nových 0" in out


def test_an_exception_matches_by_any_alias(run):
    """Výnimka podľa aliasu (`CVE`, `GHSA`) platí, keby databáza záznam raz prekľúčovala."""
    for alias in ("CVE-2025-71176", "GHSA-6w46-j5rx-g56g"):
        code, _, _ = run(
            pip_report(("pytest", "8.3.2", [PYTEST_VULN])),
            npm_report(),
            exceptions_file(pip=[alias]),
        )

        assert code == audit.EXIT_OK


def test_a_new_finding_fails_and_is_listed(run):
    """Záznam, ktorý vo výnimkách nie je, zhodí beh a objaví sa v zhrnutí s balíkom."""
    code, out, _ = run(
        pip_report(("pytest", "8.3.2", [PYTEST_VULN])), npm_report(), exceptions_file()
    )

    assert code == audit.EXIT_NEW_FINDINGS
    assert "**pip** `PYSEC-2026-1845`: pytest 8.3.2" in out


def test_npm_records_below_the_level_are_not_reported(run):
    """Pri prahu `high` sa záznam so závažnosťou `moderate` nehlási, pri prahu `moderate` áno."""
    code_high, out_high, _ = run(
        pip_report(),
        npm_report(GLOB_ADVISORY),
        exceptions_file(),
        "--npm-level",
        "high",
    )
    code_moderate, out, _ = run(
        pip_report(),
        npm_report(GLOB_ADVISORY),
        exceptions_file(),
        "--npm-level",
        "moderate",
    )

    assert code_high == audit.EXIT_OK
    assert "npm audit (prah high): 0 záznamov, z toho nových 0" in out_high
    assert "GHSA-3g3m-2fjr-6pw4" not in out_high
    assert code_moderate == audit.EXIT_NEW_FINDINGS
    assert "npm audit (prah moderate): 1 záznamov, z toho nových 1" in out
    assert "GHSA-3g3m-2fjr-6pw4" in out


def test_a_high_npm_record_fails_at_the_default_level(run):
    """Predvolený prah je `high`, takže vážny záznam zhodí beh bez nastavenia."""
    code, out, _ = run(pip_report(), npm_report(HIGH_ADVISORY), exceptions_file())

    assert code == audit.EXIT_NEW_FINDINGS
    assert "GHSA-aaaa-bbbb-cccc" in out


def test_an_npm_exception_covers_the_record(run):
    """Výnimka pre záznam npm (podľa ID záznamu) beh nezhodí."""
    code, _, _ = run(
        pip_report(),
        npm_report(HIGH_ADVISORY),
        exceptions_file(npm=["GHSA-aaaa-bbbb-cccc"]),
    )

    assert code == audit.EXIT_OK


def test_a_record_without_severity_is_reported_at_any_level(run):
    """Záznam bez závažnosti sa berie ako najvyššia, takže ho nezakryje ani najvyšší prah (fail-safe)."""
    unknown = {key: value for key, value in HIGH_ADVISORY.items() if key != "severity"}

    code, out, _ = run(
        pip_report(), npm_report(unknown), exceptions_file(), "--npm-level", "critical"
    )

    assert code == audit.EXIT_NEW_FINDINGS
    assert "GHSA-aaaa-bbbb-cccc" in out


def test_a_pip_record_without_an_id_is_an_error(run):
    """Záznam o zraniteľnosti bez `id` sa nedá porovnať s výnimkami, preto je to chyba vstupu."""
    code, _, err = run(
        pip_report(("pytest", "8.3.2", [{"aliases": []}])),
        npm_report(),
        exceptions_file(),
    )

    assert code == audit.EXIT_BAD_INPUT
    assert "`id`" in err


def test_a_stale_exception_is_reported_but_does_not_fail(run):
    """Výnimka, ktorú audit už nehlási, sa vypíše na odstránenie (s podmienkou), ale beh nezhodí."""
    code, out, _ = run(
        pip_report(), npm_report(), exceptions_file(pip=["PYSEC-2026-1845"])
    )

    assert code == audit.EXIT_OK
    assert "**pip** `PYSEC-2026-1845`: odstráň výnimku (zatvorí 183)" in out


def test_an_exception_for_a_record_below_the_npm_level_is_not_stale(run):
    """Výnimka pre záznam pod prahom závažnosti je stále potrebná: audit ho vidí, len ho nehlási."""
    code, out, _ = run(
        pip_report(),
        npm_report(GLOB_ADVISORY),
        exceptions_file(npm=["GHSA-3g3m-2fjr-6pw4"]),
    )

    assert code == audit.EXIT_OK
    assert "odstráň výnimku" not in out


@pytest.mark.parametrize("missing", ["pip", "npm", "exceptions"])
def test_a_missing_input_is_an_error_not_a_clean_audit(run, missing):
    """Chýbajúci výstup nástroja alebo zoznam výnimiek vráti kód 2; audit sa nevykonal, takže nie je čistý."""
    inputs = {"pip": pip_report(), "npm": npm_report(), "exceptions": exceptions_file()}
    inputs[missing] = None

    code, out, err = run(inputs["pip"], inputs["npm"], inputs["exceptions"])

    assert code == audit.EXIT_BAD_INPUT
    assert "chýba alebo nie je platný JSON" in err
    assert out == ""


@pytest.mark.parametrize("broken", ["{nie json", "[]", "null"])
def test_a_broken_tool_output_is_an_error(run, broken):
    """Poškodený výstup (nie JSON, nie objekt) vráti kód 2."""
    code, _, err = run(broken, npm_report(), exceptions_file())

    assert code == audit.EXIT_BAD_INPUT
    assert "pip-audit" in err


@pytest.mark.parametrize(
    ("pip", "npm"),
    [
        ({"fixes": []}, npm_report()),
        (
            pip_report(),
            {"error": {"code": "ENOTFOUND", "summary": "registry nedostupný"}},
        ),
        (
            pip_report(),
            {"error": {"code": "ENOTFOUND"}, "vulnerabilities": {}},
        ),
        (pip_report(), {"auditReportVersion": 2}),
    ],
    ids=[
        "pip bez dependencies",
        "npm s chybou registra",
        "npm s chybou a prázdnym zoznamom",
        "npm bez vulnerabilities",
    ],
)
def test_a_report_without_results_is_an_error(run, pip, npm):
    """Výstup bez výsledkov (napr. výpadok registra) nie je čistý audit, ale chyba vstupu."""
    code, _, err = run(pip, npm, exceptions_file())

    assert code == audit.EXIT_BAD_INPUT
    assert err.startswith("Chyba:")


@pytest.mark.parametrize(
    "exceptions",
    [
        {"pip": [{"id": "X", "reason": "dôvod"}]},
        {"pip": [{"id": "X", "reason": "  ", "remove_when": "zatvorí 183"}]},
        {
            "pip": [
                {"id": "X", "reason": "a", "remove_when": "b"},
                {"id": "X", "reason": "c", "remove_when": "d"},
            ]
        },
        {"pip": {"id": "X"}},
        {"pip": ["PYSEC-2026-1845"]},
        {"cargo": []},
    ],
    ids=[
        "chýba podmienka",
        "prázdny dôvod",
        "opakované ID",
        "nie je zoznam",
        "záznam nie je objekt",
        "neznámy ekosystém",
    ],
)
def test_an_invalid_exceptions_file_is_an_error(run, exceptions):
    """Výnimka bez dôvodu alebo podmienky odstránenia, opakované ID aj preklep v ekosystéme sú chyba vstupu."""
    code, _, err = run(pip_report(), npm_report(), exceptions)

    assert code == audit.EXIT_BAD_INPUT
    assert "výnimky" in err


def test_the_summary_is_also_appended_to_the_github_step_summary(
    run, tmp_path, monkeypatch
):
    """Zhrnutie sa pripíše do `$GITHUB_STEP_SUMMARY`, aby bolo vidno priamo v behu."""
    summary = tmp_path / "summary.md"
    summary.write_text("predošlý krok\n", encoding="utf-8")
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))

    code, out, _ = run(
        pip_report(("pytest", "8.3.2", [PYTEST_VULN])), npm_report(), exceptions_file()
    )

    assert code == audit.EXIT_NEW_FINDINGS
    assert summary.read_text(encoding="utf-8") == "predošlý krok\n" + out


def test_the_repository_exceptions_file_is_valid():
    """Skutočný zoznam výnimiek v repozitári má správny tvar: každá výnimka má ID, dôvod a podmienku odstránenia."""
    exceptions = audit.load_exceptions(str(EXCEPTIONS_FILE))

    assert set(exceptions) == {"pip", "npm"}
    assert "PYSEC-2026-1845" in exceptions["pip"]


def test_the_workflow_never_runs_on_pull_requests_and_uses_the_script_and_exceptions_file():
    """Workflow beží len podľa plánu a ručne (nezastavuje PR) a volá skript s tým istým zoznamom výnimiek."""
    text = WORKFLOW.read_text(encoding="utf-8")
    triggers = text.split("\non:\n", 1)[1].split("\npermissions:", 1)[0]

    assert "schedule:" in triggers and "workflow_dispatch:" in triggers
    assert "pull_request" not in triggers and "push:" not in triggers
    assert ".github/scripts/check_dependency_audit.py" in text
    assert "--exceptions .github/dependency-audit-exceptions.json" in text
    assert "--omit=dev" in text
    assert SCRIPT.is_file() and EXCEPTIONS_FILE.is_file()
