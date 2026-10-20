"""Seed user 'John Deo' (age 45, male) with 4 comprehensive quarterly medical reports.
"""

import asyncio
import json
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.security import hash_password
from app.db.models import PastRecord, User
from app.db.session import AsyncSessionLocal, init_db

JOHN_DEO_RECORDS = [
    {
        "date": "2026-01-15",
        "title": "Report #1: Initial Baseline Evaluation",
        "doctor_notes": "New diagnosis of Type 2 Diabetes & Mixed Dyslipidemia. Initiated Metformin 500mg BID and lifestyle counseling.",
        "report_type": "lab",
        "summary": "Initial baseline consultation: Fasting Blood Glucose 162 mg/dL, HbA1c 8.6%, Triglycerides 255 mg/dL. Elevated ALT 52 U/L.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 162.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting blood sugar elevated at 162 mg/dL."},
            {"name": "Postprandial Glucose", "value": 228.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose elevated at 228 mg/dL."},
            {"name": "HbA1c", "value": 8.6, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c substantially elevated at 8.6%."},
            {"name": "Total Cholesterol", "value": 242.0, "unit": "mg/dL", "reference_range": "125 - 200 mg/dL", "status": "high", "explanation": "Total cholesterol elevated at 242 mg/dL."},
            {"name": "Triglycerides", "value": 255.0, "unit": "mg/dL", "reference_range": "0 - 150 mg/dL", "status": "high", "explanation": "Triglycerides elevated at 255 mg/dL."},
            {"name": "HDL Cholesterol", "value": 36.0, "unit": "mg/dL", "reference_range": "40 - 60 mg/dL", "status": "low", "explanation": "Protective HDL low at 36 mg/dL."},
            {"name": "Serum Creatinine", "value": 1.0, "unit": "mg/dL", "reference_range": "0.6 - 1.2 mg/dL", "status": "normal", "explanation": "Creatinine normal at 1.0 mg/dL."},
            {"name": "Alanine Aminotransferase (ALT)", "value": 52.0, "unit": "U/L", "reference_range": "7 - 45 U/L", "status": "high", "explanation": "ALT mildly elevated (hepatic steatosis)."},
        ],
    },
    {
        "date": "2026-04-18",
        "title": "Report #2: 3-Month Therapeutic Audit",
        "doctor_notes": "Good early response to Metformin. Titrated dose to 850mg BID. Patient lost 2.8 kg with regular 30-min walking.",
        "report_type": "lab",
        "summary": "3-Month follow-up: HbA1c reduced to 7.7%, Fasting Glucose dropped to 140 mg/dL. Triglycerides down to 210 mg/dL. ALT normalized.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 140.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting blood sugar down to 140 mg/dL."},
            {"name": "Postprandial Glucose", "value": 194.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose down to 194 mg/dL."},
            {"name": "HbA1c", "value": 7.7, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c improved to 7.7%."},
            {"name": "Total Cholesterol", "value": 218.0, "unit": "mg/dL", "reference_range": "125 - 200 mg/dL", "status": "high", "explanation": "Total cholesterol decreased to 218 mg/dL."},
            {"name": "Triglycerides", "value": 210.0, "unit": "mg/dL", "reference_range": "0 - 150 mg/dL", "status": "high", "explanation": "Triglycerides improved to 210 mg/dL."},
            {"name": "HDL Cholesterol", "value": 39.0, "unit": "mg/dL", "reference_range": "40 - 60 mg/dL", "status": "low", "explanation": "HDL is 39 mg/dL."},
            {"name": "Serum Creatinine", "value": 1.0, "unit": "mg/dL", "reference_range": "0.6 - 1.2 mg/dL", "status": "normal", "explanation": "Creatinine remains normal at 1.0 mg/dL."},
            {"name": "Alanine Aminotransferase (ALT)", "value": 44.0, "unit": "U/L", "reference_range": "7 - 45 U/L", "status": "normal", "explanation": "ALT normalized to 44 U/L."},
        ],
    },
    {
        "date": "2026-07-20",
        "title": "Report #3: 6-Month Mid-Year Progression",
        "doctor_notes": "Excellent clinical compliance. Weight loss of 5.6 kg. Glucose levels approaching sub-diabetic target.",
        "report_type": "lab",
        "summary": "6-Month review: HbA1c reached 7.0%, Fasting Glucose 122 mg/dL. Total Cholesterol normalized to 196 mg/dL. HDL increased to 42 mg/dL.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 122.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose improved to 122 mg/dL."},
            {"name": "Postprandial Glucose", "value": 168.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose improved to 168 mg/dL."},
            {"name": "HbA1c", "value": 7.0, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c reached 7.0%."},
            {"name": "Total Cholesterol", "value": 196.0, "unit": "mg/dL", "reference_range": "125 - 200 mg/dL", "status": "normal", "explanation": "Total cholesterol normalized to 196 mg/dL."},
            {"name": "Triglycerides", "value": 172.0, "unit": "mg/dL", "reference_range": "0 - 150 mg/dL", "status": "high", "explanation": "Triglycerides down to 172 mg/dL."},
            {"name": "HDL Cholesterol", "value": 42.0, "unit": "mg/dL", "reference_range": "40 - 60 mg/dL", "status": "normal", "explanation": "HDL increased into normal range at 42 mg/dL."},
            {"name": "Serum Creatinine", "value": 0.9, "unit": "mg/dL", "reference_range": "0.6 - 1.2 mg/dL", "status": "normal", "explanation": "Creatinine optimal at 0.9 mg/dL."},
            {"name": "Alanine Aminotransferase (ALT)", "value": 36.0, "unit": "U/L", "reference_range": "7 - 45 U/L", "status": "normal", "explanation": "ALT optimal at 36 U/L."},
        ],
    },
    {
        "date": "2026-10-15",
        "title": "Report #4: Target Consolidation & Audit",
        "doctor_notes": "Primary glycemic and lipid goals successfully met. Total 8.2 kg weight loss. Patient feels energetic and healthy.",
        "report_type": "lab",
        "summary": "9-Month consolidation: HbA1c optimal at 6.3%, Fasting Glucose 104 mg/dL. Triglycerides normalized to 144 mg/dL. All metabolic parameters controlled.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 104.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose near-normal at 104 mg/dL."},
            {"name": "Postprandial Glucose", "value": 142.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose near-normal at 142 mg/dL."},
            {"name": "HbA1c", "value": 6.3, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c down to 6.3% (excellent control)."},
            {"name": "Total Cholesterol", "value": 182.0, "unit": "mg/dL", "reference_range": "125 - 200 mg/dL", "status": "normal", "explanation": "Total cholesterol optimal at 182 mg/dL."},
            {"name": "Triglycerides", "value": 144.0, "unit": "mg/dL", "reference_range": "0 - 150 mg/dL", "status": "normal", "explanation": "Triglycerides normalized to 144 mg/dL."},
            {"name": "HDL Cholesterol", "value": 47.0, "unit": "mg/dL", "reference_range": "40 - 60 mg/dL", "status": "normal", "explanation": "HDL optimal at 47 mg/dL."},
            {"name": "Serum Creatinine", "value": 0.9, "unit": "mg/dL", "reference_range": "0.6 - 1.2 mg/dL", "status": "normal", "explanation": "Renal creatinine optimal at 0.9 mg/dL."},
            {"name": "Alanine Aminotransferase (ALT)", "value": 28.0, "unit": "U/L", "reference_range": "7 - 45 U/L", "status": "normal", "explanation": "Liver enzyme ALT normal at 28 U/L."},
        ],
    },
]


async def seed_john_deo():
    await init_db()
    async with AsyncSessionLocal() as db:
        # Check if John Deo exists
        email = "john.deo@example.com"
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                email=email,
                hashed_password=hash_password("Password123!"),
                full_name="John Deo",
                age=45,
                gender="Male",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"Created user: {user.full_name} ({user.email})")
        else:
            user.full_name = "John Deo"
            user.age = 45
            user.gender = "Male"
            await db.commit()
            print(f"User already exists: {user.full_name} ({user.email})")

        # Delete any existing records for John Deo to prevent duplicates
        existing_records = await db.execute(select(PastRecord).where(PastRecord.user_id == user.id))
        for rec in existing_records.scalars().all():
            await db.delete(rec)
        await db.commit()

        # Insert 4 reports
        for item in JOHN_DEO_RECORDS:
            rec = PastRecord(
                user_id=user.id,
                date=item["date"],
                title=item["title"],
                doctor_notes=item["doctor_notes"],
                report_type=item["report_type"],
                findings_json=json.dumps(item["findings"]),
                summary=item["summary"],
            )
            db.add(rec)
        await db.commit()
        print(f"Successfully seeded {len(JOHN_DEO_RECORDS)} reports for John Deo!")


if __name__ == "__main__":
    asyncio.run(seed_john_deo())
