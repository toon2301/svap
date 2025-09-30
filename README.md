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

## 📁 Štruktúra
```
swaply/
├── backend/          # Django API
├── frontend/         # Next.js app
├── shared/           # Spoločné typy/utility
└── docker-compose.yml
```
