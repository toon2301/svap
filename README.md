# Swaply - Skills Exchange Platform

Swaply je inovatívna webová platforma, ktorá umožňuje ľuďom vymieňať si zručnosti namiesto platenia. Je to ako "Tinder pre zručnosti" - ty môžeš naučiť niekoho svoju zručnosť a on zase teba svoju.

## 🎯 Cieľová skupina
- **Osoby** - výmena zručností medzi jednotlivcami
- **Firmy** - tréningy a výmena zručností pre zamestnancov
- **Školy** - organizovanie výmenných programov

## 🏗️ Technológie
- **Backend**: Django + Django REST Framework
- **Frontend**: Next.js 14 + TypeScript
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS
- **Cache**: Redis
- **Tasks**: Celery

## 📱 Mobilita
- Progressive Web App (PWA)
- Mobile-first responsive design
- API pripravené pre natívne mobilné aplikácie

## 🚀 Spustenie projektu
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

## 🔒 Moderácia profilových fotiek (Google Cloud Vision SafeSearch)

Backend kontroluje nahrávané profilové fotky proti Google Vision SafeSearch.

### Prahy (default)
- adult: POSSIBLE
- violence: LIKELY
- racy: LIKELY

### Lokálne spustenie
1. Vytvor service account v Google Cloud a stiahni JSON kľúč.
2. Nastav env premenné (Windows PowerShell):
   ```powershell
   $env:SAFESEARCH_ENABLED="true"
   $env:SAFESEARCH_FAIL_OPEN="true"
   $env:SAFESEARCH_TIMEOUT="5"
   $env:SAFESEARCH_MIN_ADULT="POSSIBLE"
   $env:SAFESEARCH_MIN_VIOLENCE="LIKELY"
   $env:SAFESEARCH_MIN_RACY="LIKELY"
   $env:GOOGLE_APPLICATION_CREDENTIALS="backend\.secrets\gcp-vision.json"
   ```

### Railway hosting
- V Project → Variables nastav:
  - `SAFESEARCH_ENABLED=true`
  - `SAFESEARCH_FAIL_OPEN=true`
  - `SAFESEARCH_TIMEOUT=5`
  - `SAFESEARCH_MIN_ADULT=POSSIBLE`
  - `SAFESEARCH_MIN_VIOLENCE=LIKELY`
  - `SAFESEARCH_MIN_RACY=LIKELY`
  - `GCP_VISION_SERVICE_ACCOUNT_JSON` = celý JSON kľúč (obsah súboru)

### Testovanie
- Testy preskakujú Vision volanie cez `SAFESEARCH_SKIP_IN_TESTS=True`.

## 📁 Štruktúra
```
swaply/
├── backend/          # Django API
├── frontend/         # Next.js app
├── shared/           # Spoločné typy/utility
└── docker-compose.yml
```
