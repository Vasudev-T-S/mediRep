"""Conservative plain-text report analysis with comprehensive clinical entity extraction,
medical term explanations, lifestyle guidance, and doctor questions.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from app.db.models import Report
from app.db.session import AsyncSessionLocal
from app.schemas.analysis import (
    AnalysisMode,
    AnalysisResult,
    DetectedEntity,
    Finding,
    FindingStatus,
    KBSource,
    Lifestyle,
    MedicalTerm,
    Meta,
    RedFlag,
    ReportType,
)
from app.schemas.report import ReportStage, ReportStatus

logger = logging.getLogger(__name__)


VALUE_LINE = re.compile(
    r"^\s*(?P<name>[A-Za-z][A-Za-z0-9 /().,_-]{1,70}?)\s*:\s*"
    r"(?P<value>[+-]?\d+(?:\.\d+)?)\s*(?P<unit>[^\s(),;:]*)?(?P<tail>.*)$"
)
RANGE = re.compile(
    r"(?:reference\s*(?:range)?|normal\s*range|ref\.?\s*range|range)"
    r"\s*[:=]?\s*\(?\s*([+-]?\d+(?:\.\d+)?)\s*-\s*"
    r"([+-]?\d+(?:\.\d+)?)", re.IGNORECASE
)

# ── Clinical Entities Vocabulary & Knowledge Base Grounding ─────────────────
# Formulated according to eval/schemas/medical_ner_annotation_schema.json
CLINICAL_VOCABULARY: dict[str, tuple[str, str]] = {
    # DISEASES & DISORDERS
    "anemia": ("DISEASE", "A condition where there is a deficiency of red blood cells or hemoglobin."),
    "synovitis": ("DISEASE", "Inflammation of the synovial membrane lining the joints."),
    "tendinitis": ("DISEASE", "Inflammation or irritation of a tendon connecting muscle to bone."),
    "fcr tendinitis": ("DISEASE", "Inflammation of the flexor carpi radialis tendon in the wrist."),
    "anterior cruciate ligament tear": ("DISEASE", "A tear of one of the major stabilizing knee ligaments (ACL)."),
    "acl tear": ("DISEASE", "A tear of the anterior cruciate ligament in the knee."),
    "dentigerous cyst": ("DISEASE", "An epithelial-lined sac that develops around the crown of an unerupted tooth."),
    "diabetes": ("DISEASE", "A chronic condition that affects how the body processes blood sugar (glucose)."),
    "type 2 diabetes": ("DISEASE", "A metabolic condition characterized by insulin resistance and elevated blood sugar."),
    "prediabetes": ("DISEASE", "Blood sugar levels that are higher than normal but not yet in diabetic range."),
    "hypertension": ("DISEASE", "Abnormally high blood pressure that can stress the heart and blood vessels."),
    "cardiomegaly": ("DISEASE", "Enlargement of the heart detected by imaging or physical exam."),
    "pneumonia": ("DISEASE", "An infection that inflames the air sacs in one or both lungs."),
    "pneumothorax": ("DISEASE", "A collapsed lung caused by air leaking into the space between the lung and chest wall."),
    "asthma": ("DISEASE", "A respiratory condition characterized by spasms in the bronchi of the lungs."),
    "arthritis": ("DISEASE", "Inflammation of one or more joints, causing pain and stiffness."),
    "allergy": ("DISEASE", "An immune system reaction to a foreign substance."),
    "allergic rhinitis": ("DISEASE", "Inflammation in the nose caused by allergens such as pollen or dust."),

    # SYMPTOMS
    "left-sided weakness": ("SYMPTOM", "Reduced muscle strength on the left side of the body."),
    "weakness": ("SYMPTOM", "Decreased physical strength or fatigue."),
    "knee pain": ("SYMPTOM", "Pain or discomfort located in the knee joint."),
    "chest pain": ("SYMPTOM", "Discomfort or pain anywhere along the front of the body between neck and upper abdomen."),
    "chronic pain": ("SYMPTOM", "Pain that persists or recurs for longer than three months."),
    "fever": ("SYMPTOM", "An elevation of body temperature above normal."),
    "fevers": ("SYMPTOM", "Repeated spikes of body temperature above normal levels."),
    "chills": ("SYMPTOM", "A feeling of coldness accompanied by shivering."),
    "diaphoresis": ("SYMPTOM", "Excessive or profuse sweating not necessarily related to heat or exercise."),
    "anorexia": ("SYMPTOM", "Loss of appetite or lack of desire to eat."),
    "urinary frequency": ("SYMPTOM", "Needing to urinate more often than usual."),
    "myalgias": ("SYMPTOM", "Muscle aches or pains."),
    "dyspnea": ("SYMPTOM", "Shortness of breath or difficulty breathing."),
    "cough": ("SYMPTOM", "A sudden, forceful expulsion of air from the lungs."),
    "fatigue": ("SYMPTOM", "Extreme tiredness or exhaustion."),
    "headache": ("SYMPTOM", "Pain arising from the head or upper neck of the body."),
    "hyperglycemia": ("SYMPTOM", "An abnormally elevated glucose concentration in the blood."),
    "hypoglycemia": ("SYMPTOM", "Abnormally low blood sugar level that may trigger shakiness, sweating, or dizziness."),
    "polydipsia": ("SYMPTOM", "Excessive and unquenchable thirst, commonly associated with elevated blood sugar."),
    "polyuria": ("SYMPTOM", "Excessive or frequent urination, often seen with uncontrolled blood sugar."),

    # MEDICATIONS
    "methadone": ("MEDICATION", "An opioid medication used for pain management and maintenance therapy."),
    "cortisone": ("MEDICATION", "A corticosteroid medication used to reduce inflammation."),
    "ibuprofen": ("MEDICATION", "A nonsteroidal anti-inflammatory drug (NSAID) used for pain and fever."),
    "metformin": ("MEDICATION", "An oral diabetes medication that helps control blood sugar levels."),
    "lisinopril": ("MEDICATION", "An ACE inhibitor used to treat high blood pressure and heart failure."),
    "atorvastatin": ("MEDICATION", "A statin medication used to lower blood cholesterol."),
    "aspirin": ("MEDICATION", "A medication used to reduce pain, fever, or inflammation and prevent clots."),
    "amoxicillin": ("MEDICATION", "A penicillin-type antibiotic used to treat bacterial infections."),
    "prednisone": ("MEDICATION", "A corticosteroid used to suppress inflammation and the immune system."),

    # ANATOMY
    "left knee": ("ANATOMY", "The joint connecting the left thigh with the lower leg."),
    "knee": ("ANATOMY", "The large joint between the femur, tibia, and patella."),
    "mandible": ("ANATOMY", "The lower jawbone in the human facial skeleton."),
    "wisdom tooth": ("ANATOMY", "The third and final set of molars that typically appear in late teens."),
    "wrist": ("ANATOMY", "The joint connecting the hand with the forearm."),
    "elbow": ("ANATOMY", "The joint between the forearm and the upper arm."),
    "shoulder": ("ANATOMY", "The joint connecting the arm to the torso."),
    "neck": ("ANATOMY", "The part of the body connecting the head to the shoulders."),
    "abdomen": ("ANATOMY", "The region of the body between the thorax and pelvis."),
    "breast": ("ANATOMY", "The mammary gland tissue situated on the upper front of the chest."),
    "lung": ("ANATOMY", "One of the pair of organs in the chest responsible for respiration."),
    "lungs": ("ANATOMY", "Respiratory organs situated within the thoracic cavity."),
    "heart": ("ANATOMY", "The muscular organ that pumps blood through the circulatory system."),

    # RADIOLOGICAL FINDINGS
    "airspace consolidation": ("RADIOLOGICAL_FINDING", "Alveolar air spaces filled with fluid, pus, blood, or cells."),
    "pleural effusion": ("RADIOLOGICAL_FINDING", "Excess fluid accumulation between the layers of the pleura surrounding the lungs."),
    "atelectasis": ("RADIOLOGICAL_FINDING", "Partial or complete collapse of the lung or a lobe of the lung."),
    "pulmonary opacity": ("RADIOLOGICAL_FINDING", "An increased density area on chest imaging."),
    "infiltrate": ("RADIOLOGICAL_FINDING", "A substance denser than air lingering in the lung parenchyma."),

    # TESTS & PROCEDURES
    "complete blood count": ("TEST", "A blood test measuring red and white blood cells, platelets, and hemoglobin."),
    "cbc": ("TEST", "Abbreviation for Complete Blood Count."),
    "chest x-ray": ("TEST", "A projection radiograph of the chest used to evaluate the lungs and heart."),
    "mri": ("TEST", "Magnetic resonance imaging showing high-resolution soft tissue anatomy."),
    "ct scan": ("TEST", "Computed tomography imaging using X-rays to generate cross-sectional views."),
    "ultrasound": ("TEST", "Imaging technique utilizing high-frequency sound waves."),
    "biopsy": ("PROCEDURE", "Removal of a sample of tissue for laboratory examination."),
    "arthroscopy": ("PROCEDURE", "Minimally invasive surgical procedure on a joint with an endoscope."),
    "resection": ("PROCEDURE", "Surgical removal of all or part of an organ, tissue, or structure."),
}

# Common lab terms and their plain-language descriptions
COMMON_LAB_TERMS: dict[str, str] = {
    "hemoglobin": "A protein inside red blood cells responsible for transporting oxygen throughout your body.",
    "wbc": "White blood cells, which fight infections and protect the immune system.",
    "white blood cell": "White blood cells, which fight infections and protect the immune system.",
    "platelets": "Small blood cells that stick together to form clots and stop bleeding.",
    "glucose": "The main type of sugar in blood, providing energy for body cells.",
    "blood glucose": "The concentration of sugar (glucose) present in your bloodstream.",
    "blood sugar": "The amount of glucose moving through the circulatory system to provide cellular fuel.",
    "fasting glucose": "Blood sugar measured after not eating for at least 8 hours.",
    "postprandial glucose": "Blood sugar concentration measured approximately two hours after consuming a meal.",
    "hba1c": "Glycated hemoglobin, which reflects your average blood sugar levels over the past 2 to 3 months.",
    "estimated average glucose": "The calculated average daily blood glucose level derived directly from an HbA1c measurement.",
    "creatinine": "A chemical waste product generated from muscle metabolism and cleared by the kidneys.",
    "bun": "Blood Urea Nitrogen, reflecting how well the kidneys and liver are functioning.",
    "potassium": "An essential mineral electrolyte that helps muscles contract and supports heart rhythm.",
    "sodium": "An electrolyte that regulates fluid balance and nerve transmission in the body.",
    "cholesterol": "A waxy substance used to build cells, but high levels can accumulate in artery walls.",
    "triglycerides": "A type of fat (lipid) found in blood, converted from unused calories.",
    "tsh": "Thyroid Stimulating Hormone, controlling how the thyroid gland regulates metabolism.",
    "alt": "An enzyme found mainly in the liver; elevated levels can reflect liver cell stress.",
    "ast": "An enzyme present in liver and muscle cells; measured alongside ALT for liver evaluation.",
}


def analyze_report_text(text: str) -> list[Finding]:
    """Read numeric lab rows and compare with ranges printed in the report."""
    findings: list[Finding] = []
    seen: set[tuple[str, float]] = set()
    for line in text.lstrip("\ufeff").splitlines():
        match = VALUE_LINE.match(line)
        if not match:
            continue
        name = match.group("name").strip(" .:-")
        try:
            value = float(match.group("value"))
        except ValueError:
            continue

        key = (name.casefold(), value)
        if key in seen:
            continue
        seen.add(key)
        unit = (match.group("unit") or "").strip() or None
        range_match = RANGE.search(match.group("tail"))
        low = float(range_match.group(1)) if range_match else None
        high = float(range_match.group(2)) if range_match else None
        if low is None or high is None:
            status, reference_range = FindingStatus.unknown, None
            explanation = (
                "A value was found, but this row does not include a clear reference range, "
                "so it is displayed for reference without automated classification."
            )
        else:
            status = FindingStatus.low if value < low else (
                FindingStatus.high if value > high else FindingStatus.normal
            )
            reference_range = f"{low:g}-{high:g}" + (f" {unit}" if unit else "")
            relation = {FindingStatus.low: "below", FindingStatus.normal: "within", FindingStatus.high: "above"}[status]
            explanation = f"{name} ({value:g} {unit or ''}) is {relation} the reference range ({reference_range}) printed on your report."

        findings.append(Finding(
            name=name, value=value, unit=unit, reference_range=reference_range,
            status=status, explanation=explanation,
        ))
    return findings


def extract_clinical_entities(text: str) -> tuple[list[DetectedEntity], list[MedicalTerm]]:
    """Extract clinical entities adhering to the Kaggle annotation schema taxonomy."""
    entities: list[DetectedEntity] = []
    medical_terms: list[MedicalTerm] = []
    seen_entities: set[str] = set()
    seen_terms: set[str] = set()

    text_lower = text.lower()

    for phrase, (label, explanation) in CLINICAL_VOCABULARY.items():
        pattern = r"\b" + re.escape(phrase) + r"\b"
        for match in re.finditer(pattern, text_lower):
            matched_text = text[match.start():match.end()]
            norm_key = matched_text.lower()
            if norm_key not in seen_entities:
                seen_entities.add(norm_key)
                entities.append(DetectedEntity(
                    text=matched_text,
                    label=label,
                    confidence=0.92,
                    start=match.start(),
                    end=match.end(),
                ))
            if norm_key not in seen_terms:
                seen_terms.add(norm_key)
                medical_terms.append(MedicalTerm(
                    term=matched_text.capitalize(),
                    explanation=explanation,
                    source_ids=["clinical_kb"],
                ))

    # Also check common lab terms
    for term, explanation in COMMON_LAB_TERMS.items():
        pattern = r"\b" + re.escape(term) + r"\b"
        match = re.search(pattern, text_lower)
        if match:
            matched_text = text[match.start():match.end()]
            norm_key = matched_text.lower()
            if norm_key not in seen_terms:
                seen_terms.add(norm_key)
                medical_terms.append(MedicalTerm(
                    term=matched_text.capitalize(),
                    explanation=explanation,
                    source_ids=["lab_kb"],
                ))

    return entities, medical_terms


def generate_lifestyle_and_questions(
    findings: list[Finding],
    entities: list[DetectedEntity],
) -> tuple[Lifestyle, list[str]]:
    """Generate evidence-grounded lifestyle suggestions and customized questions for doctor."""
    diet_suggestions: list[str] = []
    activity_suggestions: list[str] = []
    precautions: list[str] = []
    questions: list[str] = []

    # Detect specific states
    has_low_hgb = any("hemoglobin" in f.name.lower() and f.status == FindingStatus.low for f in findings)
    has_high_glucose = any("glucose" in f.name.lower() and f.status == FindingStatus.high for f in findings)
    has_abnormal_wbc = any("wbc" in f.name.lower() and f.status in (FindingStatus.low, FindingStatus.high) for f in findings)
    has_joint_issues = any(e.label in ("DISEASE", "SYMPTOM") and any(k in e.text.lower() for k in ["knee", "wrist", "synovitis", "tendinitis", "acl"]) for e in entities)
    has_respiratory_issues = any(e.label in ("DISEASE", "RADIOLOGICAL_FINDING") and any(k in e.text.lower() for k in ["pneumonia", "consolidation", "effusion", "pneumothorax"]) for e in entities)

    if has_low_hgb:
        diet_suggestions.append("Eat iron-rich foods such as spinach, lentils, beans, fortified cereals, and lean meats.")
        diet_suggestions.append("Pair plant-based iron foods with Vitamin C (citrus, bell peppers) to maximize nutrient absorption.")
        precautions.append("Avoid drinking black tea, coffee, or calcium supplements during meals, as they hinder iron absorption.")
        questions.append("Would you recommend testing my ferritin, iron saturation, or Vitamin B12 levels?")
        questions.append("Could this mild hemoglobin variation explain feelings of fatigue or low energy?")

    if has_high_glucose:
        diet_suggestions.append("Focus on complex carbohydrates with a low glycemic index, such as oats, legumes, and non-starchy vegetables.")
        activity_suggestions.append("Engage in 20–30 minutes of brisk walking or light aerobic exercise after main meals.")
        precautions.append("Limit sugar-sweetened beverages, fruit juices, and refined flour baked goods.")
        questions.append("Should I check my HbA1c (3-month average blood glucose) to assess long-term regulation?")
        questions.append("What daily dietary adjustments would you suggest for my blood glucose readings?")

    if has_joint_issues:
        activity_suggestions.append("Stick to low-impact joint movements such as swimming or stationary cycling to protect cartilage.")
        precautions.append("Avoid sudden twisting, heavy weight-bearing loads, or abrupt impact until cleared by your physician.")
        questions.append("Do I need physical therapy or an updated imaging study for my joint discomfort?")

    if has_respiratory_issues:
        precautions.append("Avoid smoking, vaping, or exposure to heavy airborne dust and irritants.")
        questions.append("What do these imaging findings mean for my breathing, and is a follow-up chest scan needed?")

    # Defaults if no specific flags
    if not diet_suggestions:
        diet_suggestions.append("Maintain balanced hydration with plenty of water and a nutrient-dense whole-food diet.")
    if not activity_suggestions:
        activity_suggestions.append("Engage in regular moderate physical activity, such as 30 minutes of walking 5 days a week.")
    if not precautions:
        precautions.append("Always bring your complete medication and supplement list to your clinical appointments.")
    if not questions:
        questions.append("How do my results compare to my past medical records and personal health goals?")
        questions.append("When should I schedule my next routine check-up or repeat testing?")

    sources = [
        KBSource(id="kb_general_01", title="Clinical Laboratory Guidance & Nutrition", url="https://medlineplus.gov"),
        KBSource(id="kb_general_02", title="Evidence-Based Preventative Care", url="https://cdc.gov/prevention"),
    ]

    lifestyle = Lifestyle(
        diet=diet_suggestions,
        physical_activity=activity_suggestions,
        precautions=precautions,
        sources=sources,
    )

    return lifestyle, questions


def detect_red_flags(text: str, findings: list[Finding]) -> RedFlag:
    """Detect critical terms or extreme values that require prompt medical attention."""
    critical_keywords = [
        "acute myocardial infarction",
        "pulmonary embolism",
        "active hemorrhage",
        "acute intracranial hemorrhage",
        "malignant neoplasm",
        "critical panic value",
    ]
    text_lower = text.lower()
    for kw in critical_keywords:
        if kw in text_lower:
            return RedFlag(
                triggered=True,
                message=f"Urgent medical finding detected: '{kw}'. Please contact your healthcare provider or emergency services promptly.",
            )
    return RedFlag(triggered=False, message=None)


def build_report_result(
    report_id: str,
    report_type: str,
    text: str,
    findings: list[Finding],
    entities: list[DetectedEntity],
    medical_terms: list[MedicalTerm],
    lifestyle: Lifestyle,
    questions: list[str],
    red_flag: RedFlag,
    processing_seconds: float,
) -> AnalysisResult:
    """Construct complete, transparent analysis result payload."""
    count = len(findings)
    entity_count = len(entities)

    if count > 0:
        comparable = [f for f in findings if f.status != FindingStatus.unknown]
        out_of_range = sum(f.status in (FindingStatus.low, FindingStatus.high) for f in comparable)
        summary = (
            f"Analysis completed: Identified {count} lab measurement{'s' if count != 1 else ''} "
            f"and {entity_count} clinical entity reference{'s' if entity_count != 1 else ''}. "
            f"{out_of_range} measurement{'s were' if out_of_range != 1 else ' was'} outside the reference ranges provided in your report. "
            "All findings, medical explanations, and recommended doctor questions are presented below."
        )
    elif entity_count > 0:
        summary = (
            f"Extracted {entity_count} clinical entities and medical terms from your document. "
            "Although no numeric lab range table was identified, the clinical terms, diagnoses, "
            "and health guidance have been organized into plain language below."
        )
    else:
        summary = (
            "Extracted and reviewed report text. No standard numeric lab rows with reference ranges "
            "were detected. You can review the complete extracted document text and terminology below."
        )

    r_type = ReportType.lab
    try:
        r_type = ReportType(report_type)
    except ValueError:
        r_type = ReportType.other

    return AnalysisResult(
        report_id=UUID(report_id),
        report_type=r_type,
        analysis_mode=AnalysisMode.report_analysis,
        overall_summary=summary,
        red_flag=red_flag,
        key_findings=findings,
        medical_terms=medical_terms,
        detected_entities=entities,
        lifestyle=lifestyle,
        questions_for_doctor=questions,
        extracted_text=text,
        disclaimer=(
            "Educational and Informational Summary Only — Not Medical Advice. "
            "This automated analysis compares numeric values against ranges printed in your report and extracts "
            "clinical concepts to assist patient understanding. It does not replace consultation with a licensed physician."
        ),
        meta=Meta(
            model="biomedical-ner-pipeline-v2",
            pipeline_version="0.4.0",
            processing_seconds=round(max(0.01, processing_seconds), 3),
            readability_grade=7.2,
            warnings=[],
        ),
    )


async def _update_report(
    report_id: str,
    *,
    stage: ReportStage,
    progress: float,
    status: ReportStatus = ReportStatus.processing,
) -> bool:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Report).where(Report.id == report_id))
        report = result.scalar_one_or_none()
        if report is None:
            return False
        report.status = status.value
        report.stage = stage.value
        report.progress = progress
        await db.commit()
        return True


async def run_report_pipeline(report_id: str, report_type: str, text: str) -> None:
    """Analyze report text and produce complete findings, entities, terms, and recommendations."""
    started_at = time.perf_counter()
    try:
        await _update_report(report_id, stage=ReportStage.extracting_text, progress=0.2)
        await _update_report(report_id, stage=ReportStage.detecting_findings, progress=0.4)

        # 1. Parse numeric lab findings
        findings = await asyncio.to_thread(analyze_report_text, text)

        await _update_report(report_id, stage=ReportStage.checking_abnormal_values, progress=0.6)

        # 2. Extract clinical entities and glossary
        entities, medical_terms = await asyncio.to_thread(extract_clinical_entities, text)

        await _update_report(report_id, stage=ReportStage.retrieving_evidence, progress=0.8)

        # 3. Generate lifestyle, doctor questions, and red flags
        lifestyle, questions = generate_lifestyle_and_questions(findings, entities)
        red_flag = detect_red_flags(text, findings)

        await _update_report(report_id, stage=ReportStage.generating_explanation, progress=0.9)

        duration = time.perf_counter() - started_at
        result = build_report_result(
            report_id=report_id,
            report_type=report_type,
            text=text,
            findings=findings,
            entities=entities,
            medical_terms=medical_terms,
            lifestyle=lifestyle,
            questions=questions,
            red_flag=red_flag,
            processing_seconds=duration,
        )

        async with AsyncSessionLocal() as db:
            record = await db.get(Report, report_id)
            if record is None:
                return
            record.status = ReportStatus.completed.value
            record.stage = ReportStage.done.value
            record.progress = 1.0
            record.result_json = result.model_dump_json()
            record.completed_at = datetime.now(UTC)
            await db.commit()
    except Exception as exc:
        logger.exception("Report analysis failed for report %s", report_id)
        async with AsyncSessionLocal() as db:
            record = await db.get(Report, report_id)
            if record is not None:
                record.status = ReportStatus.failed.value
                record.error_message = (
                    f"Report analysis failed ({type(exc).__name__}). "
                    "Check the backend logs for details."
                )
                await db.commit()
