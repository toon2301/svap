import os
import sys
import logging
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from urllib.parse import urlparse

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# Keep the same meaning as the original `swaply/settings.py`:
#   backend/swaply/settings.py -> BASE_DIR = backend/
# Now this file lives in backend/swaply/settings_split/, so we need 3 parents.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from .env file (if it exists)
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path)


# Helpers
def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name, str(default))
    return value.lower() in {"1", "true", "yes", "on"}
