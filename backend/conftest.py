"""Root pytest conftest.

Testová suita historicky beží s vypnutou povinnou email verifikáciou (účty
z register/login flow sa správajú ako overené). Produkčný default je odteraz
EMAIL_VERIFICATION_REQUIRED=True, preto ho pre testy explicitne pinneme cez
env (setdefault – CI si môže nastaviť vlastné hodnoty). Nové testy nového
flow si zapínajú verifikáciu explicitne cez override_settings.
"""

import os

os.environ.setdefault("EMAIL_VERIFICATION_REQUIRED", "False")
os.environ.setdefault("ALLOW_UNVERIFIED_LOGIN", "True")
