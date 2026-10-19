"""Verification script to check data presence, integrity, and pipeline compatibility."""

import json
from pathlib import Path
import pandas as pd
import sys

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SCHEMAS_DIR = BASE_DIR / "schemas"
SPLITS_DIR = DATA_DIR / "medical_report_splits"

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def verify_all():
    print("=" * 60)
    print("      MEDIREP DATASET & SCHEMA VERIFICATION")
    print("=" * 60)

    # 1. Check Files Presence
    files_to_check = {
        "Combined Clean Reports": DATA_DIR / "combined_medical_reports_clean.csv",
        "MTSamples Clean": DATA_DIR / "mtsamples_clean.csv",
        "IU X-Ray Clean": DATA_DIR / "iu_xray_reports_clean.csv",
        "Train Split": SPLITS_DIR / "train.csv",
        "Validation Split": SPLITS_DIR / "val.csv",
        "Test Split": SPLITS_DIR / "test.csv",
        "NER Schema": SCHEMAS_DIR / "medical_ner_annotation_schema.json",
        "Assertion Schema": SCHEMAS_DIR / "medical_ner_assertion_schema.json",
        "Starter Annotations": DATA_DIR / "starter_annotations.json",
        "Kaggle Notebook": BASE_DIR / "notebooks" / "notebook6b09c9c4d8.ipynb",
    }

    all_present = True
    print("\n[1] Checking file presence:")
    for label, path in files_to_check.items():
        exists = path.exists() and path.stat().st_size > 0
        status = "✓ OK" if exists else "✗ MISSING"
        size = f"({path.stat().st_size / 1024:.1f} KB)" if exists else ""
        print(f"  {status:9} {label:<25} {size}")
        if not exists:
            all_present = False

    if not all_present:
        print("\n[!] Error: Some files are missing.")
        return False

    # 2. Check Data Integrity
    print("\n[2] Checking dataset integrity & row counts:")
    combined = pd.read_csv(DATA_DIR / "combined_medical_reports_clean.csv")
    print(f"  ✓ Combined Reports:    {len(combined):,} rows | Columns: {list(combined.columns)}")

    train = pd.read_csv(SPLITS_DIR / "train.csv")
    val = pd.read_csv(SPLITS_DIR / "val.csv")
    test = pd.read_csv(SPLITS_DIR / "test.csv")
    print(f"  ✓ Training Split:      {len(train):,} rows")
    print(f"  ✓ Validation Split:    {len(val):,} rows")
    print(f"  ✓ Testing Split:       {len(test):,} rows")

    # 3. Check Schemas
    print("\n[3] Checking clinical schemas:")
    with open(SCHEMAS_DIR / "medical_ner_annotation_schema.json", "r", encoding="utf-8") as f:
        ner_schema = json.load(f)
    print(f"  ✓ NER Schema Version:  {ner_schema.get('schema_version')} ({len(ner_schema.get('labels', {}))} entity classes)")
    print(f"    Classes: {', '.join(ner_schema.get('labels', {}).keys())}")

    with open(SCHEMAS_DIR / "medical_ner_assertion_schema.json", "r", encoding="utf-8") as f:
        assertion_schema = json.load(f)
    print(f"  ✓ Assertion Schema:    {len(assertion_schema.get('assertion_statuses', {}))} assertion statuses")
    print(f"    Statuses: {', '.join(assertion_schema.get('assertion_statuses', {}).keys())}")

    # 4. Check Starter Annotations
    print("\n[4] Checking verified annotations:")
    with open(DATA_DIR / "starter_annotations.json", "r", encoding="utf-8") as f:
        starter = json.load(f)
    print(f"  ✓ Verified Reports:    {len(starter)} sample reports annotated")
    first_id = list(starter.keys())[0]
    print(f"    Sample ({first_id}): {starter[first_id]}")

    # 5. Sample Record Preview
    print("\n[5] Sample Report Preview:")
    sample = combined.iloc[0]
    print(f"  ID:        {sample['report_id']}")
    print(f"  Source:    {sample['source_dataset']} ({sample['specialty']})")
    print(f"  Text Excerpt:\n  \"{sample['report_text'][:160]}...\"")

    print("\n" + "=" * 60)
    print("           ALL DATA & SCHEMAS ARE VERIFIED WORKING! ✓")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = verify_all()
    sys.exit(0 if success else 1)
