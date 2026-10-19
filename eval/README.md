# Medical Report Evaluation & Training Data

This directory contains the dataset preparation pipeline, evaluation schemas, annotations, and research notebook adapted from [Kaggle Notebook `notebook6b09c9c4d8`](https://www.kaggle.com/code/prardhanaanil/notebook6b09c9c4d8).

---

## Directory Structure

```text
eval/
├── notebooks/
│   └── notebook6b09c9c4d8.ipynb        # Original Kaggle notebook
├── schemas/
│   ├── medical_ner_annotation_schema.json  # 8 clinical entity categories & rules
│   └── medical_ner_assertion_schema.json   # 5 assertion states (PRESENT, ABSENT, etc.)
├── data/
│   ├── combined_medical_reports_clean.csv  # 6,168 cleaned and deduplicated medical reports
│   ├── mtsamples_clean.csv                # 2,336 clean transcription reports
│   ├── iu_xray_reports_clean.csv          # 3,835 clean radiology reports
│   ├── starter_annotations.json           # Gold-standard verified entity annotations
│   └── medical_report_splits/             # Train / Validation / Test dataset splits
│       ├── train.csv                      # 5,551 reports (90%)
│       ├── val.csv                        # 308 reports (5%)
│       └── test.csv                       # 309 reports (5%)
└── download_and_prep_data.py              # Automated script to download & rebuild datasets
```

---

## Annotation Schemas

### 1. Biomedical NER Schema (`schemas/medical_ner_annotation_schema.json`)
Covers 8 entity classes tailored for `d4data/biomedical-ner-all`:
- `DISEASE`: Diseases and disorders
- `SYMPTOM`: Symptoms and clinical findings
- `MEDICATION`: Medication names
- `ANATOMY`: Body parts and anatomical structures
- `TEST`: Diagnostic tests and investigations
- `PROCEDURE`: Surgical and therapeutic procedures
- `PATHOGEN`: Infectious organisms
- `RADIOLOGICAL_FINDING`: Medical imaging findings

### 2. Assertion Schema (`schemas/medical_ner_assertion_schema.json`)
Categorizes assertion status:
- `PRESENT`: Explicitly described as present
- `ABSENT`: Explicitly negated in text (e.g. "No pneumothorax")
- `UNCERTAIN`: Expresses uncertainty (e.g. "Possible infiltrate")
- `HISTORICAL`: Past condition or finding
- `NOT_SPECIFIED`: Mentioned without clear assertion state

---

## How to Re-run or Update Data

To re-download raw source data and rebuild clean datasets:

```powershell
python eval/download_and_prep_data.py
```
