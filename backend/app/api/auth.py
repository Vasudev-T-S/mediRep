"""Authentication API routes: registration, login, profile, and demo patient login.
"""

from __future__ import annotations

import json
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import PastRecord, User
from app.db.session import get_db
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEMO_EMAIL = "robert.davis@example.com"
DEMO_PASSWORD = "DemoPassword123!"


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new patient account",
)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Create a new patient account with encrypted password."""
    # Check if email is already taken
    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    user = User(
        email=data.email.lower().strip(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name.strip(),
        age=data.age,
        gender=data.gender,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Sign in to patient account",
)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate with email and password to receive JWT token."""
    result = await db.execute(select(User).where(User.email == data.email.lower().strip()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current patient profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserOut:
    """Return the profile of the currently logged-in user."""
    return UserOut.model_validate(current_user)


# ── Built-in Demo Patient Setup ───────────────────────────────────────────────

DEMO_PAST_20_MILESTONES = [
    {
        "date": "2025-01-10",
        "title": "Report #01: Initial Diagnosis / Baseline",
        "doctor_notes": "Severe hyperglycemia and polyuria. Nutrition counseling initiated.",
        "report_type": "lab",
        "summary": "Initial baseline consultation: Fasting blood glucose 178 mg/dL, HbA1c 9.4%. Marked glycemic elevation.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 178.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose markedly elevated at 178 mg/dL."},
            {"name": "Postprandial Glucose", "value": 245.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial sugar high at 245 mg/dL."},
            {"name": "HbA1c", "value": 9.4, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c substantially elevated at 9.4%."},
            {"name": "Total Cholesterol", "value": 240.0, "unit": "mg/dL", "reference_range": "125 - 200 mg/dL", "status": "high", "explanation": "Total cholesterol elevated at 240 mg/dL."},
            {"name": "Serum Creatinine", "value": 0.9, "unit": "mg/dL", "reference_range": "0.6 - 1.2 mg/dL", "status": "normal", "explanation": "Renal creatinine normal at 0.9 mg/dL."},
        ]
    },
    {
        "date": "2025-02-12",
        "title": "Report #02: Medication Initiation",
        "doctor_notes": "Started Metformin 500 mg once daily with dinner.",
        "report_type": "lab",
        "summary": "Initiation of Metformin therapy. Glycemic levels remain elevated but stabilizing.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 172.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose is 172 mg/dL."},
            {"name": "Postprandial Glucose", "value": 238.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose is 238 mg/dL."},
            {"name": "HbA1c", "value": 9.2, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c remains high at 9.2%."},
        ]
    },
    {
        "date": "2025-03-15",
        "title": "Report #03: Early Therapeutic Response",
        "doctor_notes": "Tolerating metformin without GI issues. Carbohydrate intake reduced.",
        "report_type": "lab",
        "summary": "Early response: Fasting blood glucose dropped from 178 to 165 mg/dL.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 165.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose improved to 165 mg/dL."},
            {"name": "Postprandial Glucose", "value": 226.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose decreased to 226 mg/dL."},
            {"name": "HbA1c", "value": 8.9, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c down to 8.9%."},
        ]
    },
    {
        "date": "2025-04-18",
        "title": "Report #04: 3-Month Comprehensive Panel",
        "doctor_notes": "HbA1c down -0.9% from baseline. Metformin titrated to 500 mg BID.",
        "report_type": "lab",
        "summary": "3-month milestone: HbA1c down to 8.5%. Metformin dose optimized.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 158.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose down to 158 mg/dL."},
            {"name": "Postprandial Glucose", "value": 215.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose down to 215 mg/dL."},
            {"name": "HbA1c", "value": 8.5, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c dropped to 8.5%."},
        ]
    },
    {
        "date": "2025-05-20",
        "title": "Report #05: Dose Optimization Follow-Up",
        "doctor_notes": "Positive response to twice-daily dosing.",
        "report_type": "lab",
        "summary": "Fasting levels showing consistent downward response.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 154.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose down to 154 mg/dL."},
            {"name": "Postprandial Glucose", "value": 208.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose at 208 mg/dL."},
            {"name": "HbA1c", "value": 8.2, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c improved to 8.2%."},
        ]
    },
    {
        "date": "2025-06-22",
        "title": "Report #06: Lifestyle Integration Milestone",
        "doctor_notes": "Began daily 30-minute brisk morning walks.",
        "report_type": "lab",
        "summary": "Fasting sugar broke below 150 mg/dL threshold for the first time.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 149.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose reached 149 mg/dL."},
            {"name": "Postprandial Glucose", "value": 202.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose is 202 mg/dL."},
            {"name": "HbA1c", "value": 8.0, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c down to 8.0%."},
        ]
    },
    {
        "date": "2025-07-25",
        "title": "Report #07: Mid-Year Progress Review",
        "doctor_notes": "Postprandial sugar now drops below 200 mg/dL.",
        "report_type": "lab",
        "summary": "Mid-year check: Both fasting and postprandial levels in steady decline.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 145.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose is 145 mg/dL."},
            {"name": "Postprandial Glucose", "value": 195.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose broke 200 to 195 mg/dL."},
            {"name": "HbA1c", "value": 7.8, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c down to 7.8%."},
        ]
    },
    {
        "date": "2025-08-28",
        "title": "Report #08: Weight Reduction Milestone",
        "doctor_notes": "Patient achieved 3.2 kg body weight reduction; fatigue resolved.",
        "report_type": "lab",
        "summary": "Weight reduction milestone with concurrent glycemic improvements.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 142.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose is 142 mg/dL."},
            {"name": "Postprandial Glucose", "value": 190.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose is 190 mg/dL."},
            {"name": "HbA1c", "value": 7.6, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c reached 7.6%."},
        ]
    },
    {
        "date": "2025-09-30",
        "title": "Report #09: 9-Month Evaluation",
        "doctor_notes": "Blood pressure stabilized at 126/82 mmHg.",
        "report_type": "lab",
        "summary": "Fasting sugars approaching 130s. Blood pressure and lipids stabilizing.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 139.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose is 139 mg/dL."},
            {"name": "Postprandial Glucose", "value": 186.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose at 186 mg/dL."},
            {"name": "HbA1c", "value": 7.5, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c down to 7.5%."},
        ]
    },
    {
        "date": "2025-11-05",
        "title": "Report #10: Seasonal Follow-Up",
        "doctor_notes": "Minor transient rise due to festive carbohydrate intake.",
        "report_type": "lab",
        "summary": "Minor transient blip during holidays; adherence maintained.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 144.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose slight rise to 144 mg/dL."},
            {"name": "Postprandial Glucose", "value": 194.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose is 194 mg/dL."},
            {"name": "HbA1c", "value": 7.7, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c slight uptick to 7.7%."},
        ]
    },
    {
        "date": "2025-12-15",
        "title": "Report #11: Dietary Re-Alignment",
        "doctor_notes": "Resumed strict Mediterranean low-glycemic meal plan.",
        "report_type": "lab",
        "summary": "Swift rebound back to downward trajectory following holiday period.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 140.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose back down to 140 mg/dL."},
            {"name": "Postprandial Glucose", "value": 188.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose down to 188 mg/dL."},
            {"name": "HbA1c", "value": 7.5, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c returned to 7.5%."},
        ]
    },
    {
        "date": "2026-01-18",
        "title": "Report #12: 1-Year Milestone",
        "doctor_notes": "Substantial 1-year progress: HbA1c reduced -2.1% from initial diagnosis.",
        "report_type": "lab",
        "summary": "1-Year Anniversary: Sustained improvement with HbA1c at 7.3%.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 136.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose reached 136 mg/dL."},
            {"name": "Postprandial Glucose", "value": 182.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose down to 182 mg/dL."},
            {"name": "HbA1c", "value": 7.3, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c improved to 7.3%."},
        ]
    },
    {
        "date": "2026-02-20",
        "title": "Report #13: Metabolic Consolidation",
        "doctor_notes": "Renal and liver function remain entirely normal.",
        "report_type": "lab",
        "summary": "Fasting sugars continue downwards towards 130 mg/dL.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 133.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose is 133 mg/dL."},
            {"name": "Postprandial Glucose", "value": 178.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose reached 178 mg/dL."},
            {"name": "HbA1c", "value": 7.2, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c down to 7.2%."},
        ]
    },
    {
        "date": "2026-03-25",
        "title": "Report #14: Approaching ADA Benchmark Target",
        "doctor_notes": "Reached ADA general target benchmark of 7.0% HbA1c.",
        "report_type": "lab",
        "summary": "Significant clinical threshold reached with HbA1c at 7.0%.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 130.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose is 130 mg/dL."},
            {"name": "Postprandial Glucose", "value": 174.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose is 174 mg/dL."},
            {"name": "HbA1c", "value": 7.0, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c reached 7.0% ADA benchmark."},
        ]
    },
    {
        "date": "2026-04-28",
        "title": "Report #15: Sub-7% Milestone",
        "doctor_notes": "First time HbA1c registered under 7.0%. Outstanding commitment.",
        "report_type": "lab",
        "summary": "Sub-7% glycemic control milestone achieved.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 128.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose broke 130 to 128 mg/dL."},
            {"name": "Postprandial Glucose", "value": 170.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose reached 170 mg/dL."},
            {"name": "HbA1c", "value": 6.9, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c dropped below 7.0 to 6.9%."},
        ]
    },
    {
        "date": "2026-05-30",
        "title": "Report #16: Sustained Glycemic Control",
        "doctor_notes": "Sustained stability without hypoglycemic episodes.",
        "report_type": "lab",
        "summary": "Solid glycemic stability maintained throughout late spring.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 126.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose is 126 mg/dL."},
            {"name": "Postprandial Glucose", "value": 167.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose is 167 mg/dL."},
            {"name": "HbA1c", "value": 6.8, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c down to 6.8%."},
        ]
    },
    {
        "date": "2026-07-05",
        "title": "Report #17: Mid-Year 2026 Follow-Up",
        "doctor_notes": "Exercise routine expanded to include resistance training.",
        "report_type": "lab",
        "summary": "Fasting blood sugar stable around 125 mg/dL.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 125.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose is 125 mg/dL."},
            {"name": "Postprandial Glucose", "value": 165.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose is 165 mg/dL."},
            {"name": "HbA1c", "value": 6.8, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c maintained at 6.8%."},
        ]
    },
    {
        "date": "2026-08-12",
        "title": "Report #18: Cardiovascular Gains",
        "doctor_notes": "Total cholesterol normalized to 195 mg/dL; lipid panel improved.",
        "report_type": "lab",
        "summary": "Cardiovascular risk parameters showing substantial concurrent gains.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 123.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose reached 123 mg/dL."},
            {"name": "Postprandial Glucose", "value": 163.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose reached 163 mg/dL."},
            {"name": "HbA1c", "value": 6.7, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c reached 6.7%."},
            {"name": "Total Cholesterol", "value": 195.0, "unit": "mg/dL", "reference_range": "125 - 200 mg/dL", "status": "normal", "explanation": "Total cholesterol normalized to 195 mg/dL."},
        ]
    },
    {
        "date": "2026-09-18",
        "title": "Report #19: Pre-Evaluation Follow-Up",
        "doctor_notes": "Glycemic markers remain steady ahead of annual review.",
        "report_type": "lab",
        "summary": "Steady parameters ahead of 2-year comprehensive review.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 125.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Fasting glucose steady at 125 mg/dL."},
            {"name": "Postprandial Glucose", "value": 164.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose is 164 mg/dL."},
            {"name": "HbA1c", "value": 6.7, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c steady at 6.7%."},
        ]
    },
    {
        "date": "2026-10-19",
        "title": "Report #20: Current Comprehensive Status",
        "doctor_notes": "Outstanding 22-month trajectory. Total HbA1c reduction from 9.4% to 6.7% (-2.7% total drop).",
        "report_type": "lab",
        "summary": "Latest comprehensive evaluation: Fasting sugar 124 mg/dL, HbA1c 6.7%, Postprandial 162 mg/dL.",
        "findings": [
            {"name": "Fasting Blood Glucose", "value": 124.0, "unit": "mg/dL", "reference_range": "70 - 99 mg/dL", "status": "high", "explanation": "Current fasting glucose is 124 mg/dL."},
            {"name": "Postprandial Glucose", "value": 162.0, "unit": "mg/dL", "reference_range": "70 - 140 mg/dL", "status": "high", "explanation": "Postprandial glucose is 162 mg/dL."},
            {"name": "HbA1c", "value": 6.7, "unit": "%", "reference_range": "4.0 - 5.6 %", "status": "high", "explanation": "HbA1c steady in target at 6.7%."},
            {"name": "Total Cholesterol", "value": 195.0, "unit": "mg/dL", "reference_range": "125 - 200 mg/dL", "status": "normal", "explanation": "Total cholesterol normal at 195 mg/dL."},
            {"name": "Serum Creatinine", "value": 0.9, "unit": "mg/dL", "reference_range": "0.6 - 1.2 mg/dL", "status": "normal", "explanation": "Renal creatinine normal at 0.9 mg/dL."},
        ]
    },
]


@router.post(
    "/demo",
    response_model=TokenResponse,
    summary="One-click Demo Patient Sign-in (Robert M. Davis)",
)
async def demo_login(
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Instantly sign in as the demo patient (Robert M. Davis) with 20 pre-populated records."""
    result = await db.execute(select(User).where(User.email == DEMO_EMAIL))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=DEMO_EMAIL,
            hashed_password=hash_password(DEMO_PASSWORD),
            full_name="Robert M. Davis",
            age=48,
            gender="Male",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Check if demo past records already populated for this user
    existing_rec = await db.execute(select(PastRecord).where(PastRecord.user_id == user.id))
    has_records = existing_rec.scalars().first() is not None

    if not has_records:
        for m in DEMO_PAST_20_MILESTONES:
            record = PastRecord(
                user_id=user.id,
                date=m["date"],
                title=m["title"],
                doctor_notes=m["doctor_notes"],
                report_type=m["report_type"],
                findings_json=json.dumps(m["findings"]),
                summary=m["summary"],
            )
            db.add(record)
        await db.commit()

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )
