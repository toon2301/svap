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

## 👤 Avatary na Railway (S3)

Profilové fotky (avatary) sa v produkcii ukladajú do **S3**. Bez nastavených AWS premenných sa avatar na profile nezobrazí.

### Backend – Railway Variables (backend service)
Nastav v Railway → Project → Variables (pre backend službu):

| Premenná | Popis |
|----------|-------|
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `AWS_STORAGE_BUCKET_NAME` | Názov S3 bucketu |
| `AWS_S3_REGION_NAME` | Región, napr. `eu-north-1` |
| `AWS_S3_CUSTOM_DOMAIN` | (voliteľné) CloudFront alebo custom doména |

### S3 bucket – verejné čítanie
Bucket alebo prefix pre avatary musí byť verejne čitateľný (public-read). V S3 bucket policy pridaj:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::TvojBucket/*"
  }]
}
```

### Frontend – Railway Variables (frontend service)
Ak používaš iný S3 bucket alebo CloudFront doménu:
- `NEXT_PUBLIC_MEDIA_ORIGIN` – base URL pre media (napr. `https://tvoj-bucket.s3.eu-north-1.amazonaws.com`)
- `NEXT_PUBLIC_BACKEND_ORIGIN` – URL backendu (pre CSP, napr. `https://tvoj-backend.up.railway.app`)

### Diagnostika
Ak sa avatar stále nezobrazuje:
1. Skontroluj v DevTools (Network), či požiadavka na obrázok vracia 200 alebo 403/404.
2. Over v API odpovedi (`/api/auth/me/`), či `avatar_url` obsahuje platnú absolútnu URL (napr. `https://...s3...amazonaws.com/avatars/...`).
3. Over, či sú všetky AWS premenné nastavené na backende.

---

## 🖼️ Obrázky ponúk (S3 uploads/ → Celery → media/)

Pre produkciu (100k+ užívateľov) sa obrázky ponúk nahrávajú **priamo do S3** a spracovanie/moderácia beží **asynchrónne**:

- **Upload (PENDING)**: klient získa presigned POST z backendu a nahrá do `uploads/…`
- **Worker** (Celery):
  - podporuje **HEIC/HEIF** (konverzia → WebP)
  - resize + kompresia
  - SafeSearch moderácia
  - výstup uloží do `media/…` a označí obrázok ako `APPROVED` alebo `REJECTED`

### Dôležité produkčné nastavenie S3 CORS
Bucket musí povoľovať CORS pre frontend origin (kvôli presigned POST). Minimálne:
- Methods: `POST`, `GET`, `HEAD`
- AllowedOrigins: tvoj frontend (napr. `https://*.up.railway.app`)
- AllowedHeaders: `*`

### Celery na Railway
Spusti samostatný worker service (Start Command):
- `celery -A swaply worker -l info`

## 📁 Štruktúra
```
swaply/
├── backend/          # Django API
├── frontend/         # Next.js app
├── shared/           # Spoločné typy/utility
└── docker-compose.yml
```
