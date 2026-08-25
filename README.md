# PyLab

PyLab ist eine moderne Python-Lernplattform als Webanwendung. Sie kombiniert kurze Lernschritte, interaktive Aufgaben, Code-Ausführung und Fortschrittsfunktionen.

## Stack

- Frontend: Next.js / React
- Backend: FastAPI / Python
- Lokale Datenhaltung: SQLite

## Lokaler Start

### Backend

```cmd
cd backend
py -m venv .venv
.venv\Scripts\activate
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload
```

### Frontend

```cmd
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000  
Backend: http://127.0.0.1:8000

## Deployment

Frontend und Backend sind für getrennte Deployment-Services vorbereitet.

Frontend-Variable:

```text
NEXT_PUBLIC_API_URL=https://DEIN-BACKEND
```

Backend-Variable:

```text
PYLAB_ALLOWED_ORIGINS=https://DEIN-FRONTEND
```

## Aktueller Stand

- modernes responsives Dark-Design
- Mimo-artiger Lernfluss in kleinen Schritten
- Lernfortschritt und XP
- Multiple Choice
- interaktive Code-Aufgaben
- Python-Ausführung über FastAPI
- Hinweise und Lösungskontrolle
- Modulzusammenfassung
