"""
Swaply Django settings (facade).

This file stays small (<500 lines) and keeps backwards compatibility with:
  DJANGO_SETTINGS_MODULE=swaply.settings

Actual settings are split into modules under `swaply/settings_split/`.
"""

import importlib
import sys
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn="https://d5262d1a48da7e68b296bfd85c2b53ef@o4511412186841088.ingest.de.sentry.io/4511412222034000",
    integrations=[DjangoIntegration()],
    send_default_pii=True,
    traces_sample_rate=0.1,
)

# Test helper `swaply/test/test_settings_runtime.py` načíta settings.py do nového (temp) názvu modulu,
# ale sub-moduly `swaply.settings_split.*` by inak ostali cache-ované v sys.modules.
# Keď settings importujeme mimo `swaply.settings`, sprav "soft reload" settings split modulov,
# aby env overrides v testoch fungovali deterministicky.
if __name__ != "swaply.settings":
    for key in list(sys.modules.keys()):
        if key.startswith("swaply.settings_split.") or key.startswith(
            "swaply.settings_parts."
        ):
            try:
                importlib.reload(sys.modules[key])
            except Exception as e:
                if isinstance(e, ValueError):
                    raise
                pass

from swaply.settings_split.base import *  # noqa