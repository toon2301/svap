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


def _collect_env_allowed_hosts() -> list[str]:
    extra_hosts: list[str] = []
    host_env_names = (
        "RAILWAY_PUBLIC_DOMAIN",
        "SITE_DOMAIN",
    )
    origin_env_names = (
        "BACKEND_ORIGIN",
        "BACKEND_WS_ORIGIN",
        "FRONTEND_ORIGIN",
        "FRONTEND_URL",
        "FRONTEND_CALLBACK_URL",
        "BACKEND_CALLBACK_URL",
    )

    for env_name in host_env_names:
        value = (os.getenv(env_name) or "").strip()
        if value:
            extra_hosts.append(value)

    for env_name in origin_env_names:
        value = (os.getenv(env_name) or "").strip()
        if not value:
            continue
        try:
            parsed = urlparse(value)
        except Exception:
            continue
        if parsed.hostname:
            extra_hosts.append(parsed.hostname)

    deduped: list[str] = []
    for host in extra_hosts:
        cleaned = host.strip().strip("/")
        if not cleaned or cleaned in deduped:
            continue
        deduped.append(cleaned)
    return deduped


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
    # Production: žiadne wildcardy. Vyžaduj základný schválený zoznam a bezpečne
    # doplň hosty odvodené z deploy env (napr. split Railway služby).
    raw = os.getenv("ALLOWED_HOSTS")
    if not raw:
        raise ValueError("ALLOWED_HOSTS must be set when DEBUG is False")
    configured_hosts = _parse_allowed_hosts(raw)
    _validate_no_wildcards(configured_hosts)
    missing_required = sorted(_PROD_ALLOWED_HOSTS.difference(configured_hosts))
    if missing_required:
        raise ValueError(
            "Invalid ALLOWED_HOSTS for production. Missing required hosts: "
            + ", ".join(missing_required)
        )

    ALLOWED_HOSTS = list(configured_hosts)
    for host in _collect_env_allowed_hosts():
        if host not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(host)
