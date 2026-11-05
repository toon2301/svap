"""Poistka: nainštalovaná knižnica `redis` vyhovuje tomu, čo od nej vyžaduje `kombu` (nález 240).

`kombu` je prenos Celery cez Redis. Na Railway sa po novom builde nainštaloval `kombu` 5.7.0, ktorý vyžaduje redis-py 6.1.0 a
novší, kým `requirements.txt` mal pripnuté `redis==5.0.1`. Worker aj zadávanie úloh z webu potom zlyhali na `VersionMismatch`.
CI to nezachytilo: testy bežia bez brokera, takže sa prenos cez Redis nikdy nezaviedol, a `pip check` to nevidí, lebo
požiadavka je v doplnku (`extra`) `redis`. Test preto porovná nainštalovanú verziu s požiadavkou, ktorú `kombu` pre Redis
sám hlási.
"""

from importlib.metadata import requires, version

from packaging.requirements import Requirement


def _kombu_redis_requirements():
    """Požiadavky `kombu` na `redis` (v doplnku `redis` alebo medzi základnými); prázdny zoznam, ak ich nehlási."""
    parsed = [Requirement(line) for line in (requires("kombu") or [])]
    return [
        req
        for req in parsed
        if req.name.lower() == "redis"
        and (req.marker is None or req.marker.evaluate({"extra": "redis"}))
    ]


def test_installed_redis_satisfies_what_kombu_requires():
    """Nainštalovaná verzia `redis` spĺňa požiadavku `kombu`; inak worker aj zadávanie úloh zlyhajú na `VersionMismatch`."""
    requirements = _kombu_redis_requirements()
    assert requirements, (
        "kombu už nehlási požiadavku na redis; uprav test_celery_redis_compat.py "
        "(inak by kontrola prešla naprázdno)"
    )
    installed = version("redis")
    for req in requirements:
        assert req.specifier.contains(installed, prereleases=True), (
            f"redis {installed} nespĺňa požiadavku kombu {version('kombu')}: "
            f"{req.specifier}; uprav redis v requirements.txt (a skontroluj `celery[redis]`)"
        )
