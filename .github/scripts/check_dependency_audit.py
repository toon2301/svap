"""Porovná výsledok `pip-audit` a `npm audit` so zoznamom známych výnimiek (nález 194).

Týždenný workflow `dependency-audit.yml` spustí oba audity, ich JSON výstupy odovzdá tomuto skriptu spolu so zoznamom
výnimiek (`.github/dependency-audit-exceptions.json`: ID záznamu, dôvod a podmienka odstránenia). Skript vypíše zhrnutie
(aj do `$GITHUB_STEP_SUMMARY`) a skončí kódom 1, keď sa objavil záznam, ktorý vo výnimkách nie je, a kódom 2, keď
niektorý vstup chýba alebo je poškodený: vtedy sa audit nevykonal, čo nie je čistý výsledok. Výnimka, ktorú audit už
nehlási, sa len vypíše na odstránenie. Skript používa len štandardnú knižnicu.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

EXIT_OK = 0
EXIT_NEW_FINDINGS = 1
EXIT_BAD_INPUT = 2

# Poradie závažnosti záznamov `npm audit`. `pip-audit` závažnosť neuvádza a neznáma závažnosť sa berie ako najvyššia,
# takže sa taký záznam vždy hlási (radšej nadbytočné upozornenie než prehliadnutý záznam).
SEVERITY_RANK = {"info": 0, "low": 1, "moderate": 2, "high": 3, "critical": 4}

ECOSYSTEMS = ("pip", "npm")
REQUIRED_EXCEPTION_FIELDS = ("id", "reason", "remove_when")


class AuditInputError(Exception):
    """Vstup auditu alebo zoznam výnimiek chýba, je poškodený alebo má nesprávny tvar."""


@dataclass(frozen=True)
class Finding:
    """Jeden záznam o zraniteľnosti: ekosystém, hlavné ID, všetky ID (s aliasmi), popis a závažnosť (len npm)."""

    ecosystem: str
    key: str
    ids: frozenset[str]
    description: str
    severity: str | None = None


def severity_rank(severity: str | None) -> int:
    """Poradie závažnosti; chýbajúca alebo neznáma závažnosť je vyššia než každá známa (záznam sa vždy hlási)."""
    return SEVERITY_RANK.get(severity, len(SEVERITY_RANK))


def load_json(path: str, label: str) -> dict:
    """Načíta JSON súbor, ktorý musí obsahovať objekt; chýbajúci alebo poškodený výstup nástroja je chyba vstupu."""
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise AuditInputError(
            f"{label}: súbor `{path}` chýba alebo nie je platný JSON ({exc.__class__.__name__})."
        ) from exc
    if not isinstance(data, dict):
        raise AuditInputError(f"{label}: súbor `{path}` neobsahuje JSON objekt.")
    return data


def pip_findings(report: dict) -> list[Finding]:
    """Záznamy z `pip-audit --format json`; ten istý záznam sa v jeho výstupe môže opakovať, preto sa zlúči podľa ID."""
    dependencies = report.get("dependencies")
    if not isinstance(dependencies, list):
        raise AuditInputError("pip-audit: výstup neobsahuje zoznam `dependencies`.")
    merged: dict[str, Finding] = {}
    for dependency in dependencies:
        for vuln in dependency.get("vulns", []):
            if not vuln.get("id"):
                raise AuditInputError("pip-audit: záznam o zraniteľnosti nemá `id`.")
            ids = frozenset({vuln["id"], *vuln.get("aliases", [])})
            previous = merged.get(vuln["id"])
            merged[vuln["id"]] = Finding(
                ecosystem="pip",
                key=vuln["id"],
                ids=ids | (previous.ids if previous else frozenset()),
                description=f"{dependency.get('name')} {dependency.get('version')}",
            )
    return list(merged.values())


def npm_findings(report: dict) -> list[Finding]:
    """Záznamy z `npm audit --json`: každý záznam balíka (nie odkaz na iný balík), podľa ID záznamu GHSA."""
    if "error" in report or not isinstance(report.get("vulnerabilities"), dict):
        raise AuditInputError(
            "npm audit: výstup neobsahuje zoznam `vulnerabilities` (audit sa nevykonal, napr. pre chybu registra)."
        )
    merged: dict[str, Finding] = {}
    for package, info in report["vulnerabilities"].items():
        for via in info.get("via", []):
            if not isinstance(via, dict):
                continue  # odkaz na iný zraniteľný balík, jeho záznam je pri ňom
            key = (
                str(via.get("url") or "").rsplit("/", 1)[-1]
                or f"npm-{via.get('source')}"
            )
            merged[key] = Finding(
                ecosystem="npm",
                key=key,
                ids=frozenset({key}),
                description=f"{via.get('name', package)}: {via.get('title', '')}",
                severity=via.get("severity"),
            )
    return list(merged.values())


def load_exceptions(path: str) -> dict[str, dict[str, dict]]:
    """Načíta a skontroluje zoznam výnimiek: pre každý ekosystém ID → záznam s dôvodom a podmienkou odstránenia."""
    data = load_json(path, "výnimky")
    unknown = set(data) - set(ECOSYSTEMS)
    if unknown:
        raise AuditInputError(
            f"výnimky: neznámy kľúč {sorted(unknown)} (povolené: {list(ECOSYSTEMS)})."
        )
    exceptions: dict[str, dict[str, dict]] = {}
    for ecosystem in ECOSYSTEMS:
        entries = data.get(ecosystem, [])
        if not isinstance(entries, list):
            raise AuditInputError(f"výnimky: `{ecosystem}` musí byť zoznam.")
        by_id: dict[str, dict] = {}
        for entry in entries:
            if not isinstance(entry, dict):
                raise AuditInputError(
                    f"výnimky: záznam v `{ecosystem}` nie je objekt: {entry!r}."
                )
            for field in REQUIRED_EXCEPTION_FIELDS:
                if not isinstance(entry.get(field), str) or not entry[field].strip():
                    raise AuditInputError(
                        f"výnimky: záznam v `{ecosystem}` nemá neprázdne pole `{field}`: {entry}."
                    )
            if entry["id"] in by_id:
                raise AuditInputError(
                    f"výnimky: ID `{entry['id']}` sa v `{ecosystem}` opakuje."
                )
            by_id[entry["id"]] = entry
        exceptions[ecosystem] = by_id
    return exceptions


def split_findings(
    findings: list[Finding],
    exceptions: dict[str, dict],
    *,
    min_severity: str | None = None,
) -> tuple[list[Finding], list[Finding], list[str]]:
    """Rozdelí záznamy jedného ekosystému na hlásené (od danej závažnosti), z nich nové (bez výnimky) a zastarané výnimky.

    Zastaraná je výnimka, ktorej ID sa už v žiadnom zázname (ani pod prahom závažnosti) nevyskytuje.
    """
    minimum = SEVERITY_RANK[min_severity] if min_severity else 0
    reportable = [
        finding for finding in findings if severity_rank(finding.severity) >= minimum
    ]
    new = [finding for finding in reportable if not (finding.ids & set(exceptions))]
    seen = set().union(*(finding.ids for finding in findings)) if findings else set()
    stale = sorted(
        exception_id for exception_id in exceptions if exception_id not in seen
    )
    return reportable, new, stale


def render_summary(
    counts: dict[str, tuple[int, int]],
    new: list[Finding],
    stale: list[tuple[str, str, str]],
    npm_level: str,
) -> str:
    """Zhrnutie v Markdown: počty záznamov, nové záznamy a výnimky, ktoré už audit nehlási."""
    labels = {"pip": "pip-audit", "npm": f"npm audit (prah {npm_level})"}
    lines = ["## Audit závislostí", ""]
    for ecosystem in ECOSYSTEMS:
        total, not_covered = counts[ecosystem]
        lines.append(
            f"- {labels[ecosystem]}: {total} záznamov, z toho nových {not_covered}"
        )
    lines += ["", "### Nové záznamy (nie sú vo výnimkách)"]
    lines += [f"- **{f.ecosystem}** `{f.key}`: {f.description}" for f in new] or [
        "žiadne"
    ]
    lines += ["", "### Výnimky, ktoré už audit nehlási"]
    lines += [
        f"- **{eco}** `{exception_id}`: odstráň výnimku ({remove_when})"
        for eco, exception_id, remove_when in stale
    ] or ["žiadne"]
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    """Porovná výstupy auditov so zoznamom výnimiek, vypíše zhrnutie a vráti kód 0, 1 (nový záznam) alebo 2 (zlý vstup)."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pip", required=True, help="JSON z `pip-audit --format json`")
    parser.add_argument("--npm", required=True, help="JSON z `npm audit --json`")
    parser.add_argument(
        "--exceptions", required=True, help="zoznam známych výnimiek (JSON)"
    )
    parser.add_argument(
        "--npm-level", default="high", choices=["low", "moderate", "high", "critical"]
    )
    args = parser.parse_args(argv)

    try:
        exceptions = load_exceptions(args.exceptions)
        found = {
            "pip": pip_findings(load_json(args.pip, "pip-audit")),
            "npm": npm_findings(load_json(args.npm, "npm audit")),
        }
    except AuditInputError as exc:
        print(f"Chyba: {exc}", file=sys.stderr)
        return EXIT_BAD_INPUT

    new_findings: list[Finding] = []
    stale: list[tuple[str, str, str]] = []
    counts: dict[str, tuple[int, int]] = {}
    for ecosystem in ECOSYSTEMS:
        level = args.npm_level if ecosystem == "npm" else None
        reportable, new, stale_ids = split_findings(
            found[ecosystem], exceptions[ecosystem], min_severity=level
        )
        counts[ecosystem] = (len(reportable), len(new))
        new_findings += new
        stale += [
            (
                ecosystem,
                exception_id,
                exceptions[ecosystem][exception_id]["remove_when"],
            )
            for exception_id in stale_ids
        ]

    summary = render_summary(counts, new_findings, stale, args.npm_level)
    print(summary, end="")
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write(summary)
    return EXIT_NEW_FINDINGS if new_findings else EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
