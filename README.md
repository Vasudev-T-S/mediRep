# Medical Report Analyzer

An AI-powered web app that helps patients understand medical reports in plain language.

> ⚠️ **This tool is for educational and informational purposes only. It does not diagnose, prescribe, or replace a clinician.**

## Run locally on Windows

Install Python 3.11 or newer and Node.js 22.12 or newer. Open **two PowerShell windows**.

### 1. Start the backend

In the first window, run:

```powershell
cd C:\Users\byjud\OneDrive\Desktop\medirep\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Leave this window open. The backend health check is available at
`http://127.0.0.1:8000/api/health`.

If PowerShell blocks virtual-environment activation, use the environment's Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If Python reports **Access is denied** or the environment refers to a missing Python install, install Python from python.org, then recreate the environment from the `backend` folder:

```powershell
Remove-Item -Recurse -Force .venv
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Start the frontend

In a second PowerShell window, run:

```powershell
cd C:\Users\byjud\OneDrive\Desktop\medirep\frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173` in your browser. Keep both windows open while using the app. Stop either server with **Ctrl+C** in its window.

### Upload format

The current analyzer accepts `.txt` files up to 10 MB. It summarizes numeric rows formatted like `Hemoglobin: 11.2 g/dL (Reference Range: 12.0 - 15.5 g/dL)`. It compares values only against ranges present in the uploaded report; it does not interpret narrative text, diagnose, or replace a clinician's advice. The backend processes report text in memory and does not save the uploaded text.
## Architecture
See `CONTEXT.md` section 4 for the full pipeline diagram.

## Phases
| Phase | Status | Description |
|---|---|---|
| 0 | ✅ Done | Repo layout, schemas, health endpoint |
| 1–9 | 🔜 Planned | See CONTEXT.md section 11 |

## Limitations
- Not HIPAA/GDPR certified.
- English only (v1).
- Lab flagging uses generic reference ranges; results may differ from your lab.
- No authentication in v1.

## License
MIT
