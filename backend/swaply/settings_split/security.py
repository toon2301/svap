from .env import env_bool, urlparse, os

# SECURITY
# DEBUG from env (default True for local/dev). MUST be False in production.
DEBUG = env_bool("DEBUG", True)

# SECRET_KEY from env; in production it must be explicitly provided
SECRET_KEY = os.getenv("SECRET_KEY") or ("dev-secret-key" if DEBUG else None)
if not SECRET_KEY:
    raise ValueError("SECRET_KEY must be set when DEBUG is False")

_PROD_ALLOWED_HOSTS = {
    "svaply.com",
    "www.svaply.com",
    "api.svaply.com",
    "stunning-inspiration-svap.up.railway.app",
    "exemplary-tranquility-svap.up.railway.app",  # backend Railway
}


def _parse_allowed_hosts(raw: str) -> list[str]:
    return [h.strip() for h in (raw or "").split(",") if h and h.strip()]


def _validate_no_wildcards(hosts: list[str]) -> None:
    for h in hosts:
        if "*" in h or h.startswith("."):
            raise ValueError(f"Wildcard hosts are not allowed in ALLOWED_HOSTS: {h!r}")


# ALLOWED_HOSTS
if DEBUG:
    # Dev/local: bezpečný default pre lokálne spúšťanie
    ALLOWED_HOSTS = _parse_allowed_hosts(
        os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0")
    )
    # Dev helper: pridaj host podľa BACKEND_ORIGIN (napr. mobil/dev proxy)
    _backend_origin = os.getenv("BACKEND_ORIGIN", "")
    if _backend_origin:
        try:
            parsed_backend = urlparse(_backend_origin)
            if parsed_backend.hostname and parsed_backend.hostname not in ALLOWED_HOSTS:
                ALLOWED_HOSTS.append(parsed_backend.hostname)
        except Exception:
            pass
else:
    # Production: žiadne fallbacky, žiadne wildcardy, striktne povolený zoznam
    raw = os.getenv("ALLOWED_HOSTS")
    if not raw:
        raise ValueError("ALLOWED_HOSTS must be set when DEBUG is False")
    ALLOWED_HOSTS = _parse_allowed_hosts(raw)
    _validate_no_wildcards(ALLOWED_HOSTS)
    if set(ALLOWED_HOSTS) != _PROD_ALLOWED_HOSTS:
        raise ValueError(
            "Invalid ALLOWED_HOSTS for production. Must match exactly: "
            + ", ".join(sorted(_PROD_ALLOWED_HOSTS))
        )
