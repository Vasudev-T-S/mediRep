# Medical Report Analyzer

An AI-powered web app that helps patients understand medical reports in plain language.

> ⚠️ **This tool is for educational and informational purposes only. It does not diagnose, prescribe, or replace a clinician.**

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp ../.env.example ../.env    # fill in values
uvicorn app.main:app --reload
```

The default pipeline runs the `d4data/biomedical-ner-all` Hugging Face model
locally on TXT uploads. The model weights are downloaded on the first analysis;
the report text is processed by the backend and is not sent to Kaggle or
Hugging Face. This integration detects possible medical entities only—it does
not extract lab values, explain results, or provide medical advice. Set
`PIPELINE_MODE=mock` in `.env` to use the canned demo result instead.

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Both (Docker)
```bash
docker compose up
```

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
