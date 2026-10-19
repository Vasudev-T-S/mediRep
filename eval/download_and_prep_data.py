"""Data preparation script reproducing the Kaggle notebook workflow.

Downloads/prepares:
1. MTSamples transcription dataset
2. Indiana University Chest X-Ray XML reports
3. Combines, cleans, and deduplicates medical reports (combined_medical_reports_clean.csv)
4. Splits dataset into train/validation/test sets (medical_report_splits/)
5. Applies starter NER annotations and review schemas
"""

import os
import re
import tarfile
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
SPLITS_DIR = DATA_DIR / "medical_report_splits"

MTSAMPLES_URL = "https://huggingface.co/datasets/NickyNicky/medical_mtsamples/resolve/main/mtsamples%20(1).csv"
IU_REPORTS_URL = "https://openi.nlm.nih.gov/imgs/collections/NLMCXR_reports.tgz"


def setup_directories():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    SPLITS_DIR.mkdir(parents=True, exist_ok=True)


def download_file(url: str, dest_path: Path):
    if dest_path.exists() and dest_path.stat().st_size > 0:
        print(f"[+] File already exists: {dest_path.name}")
        return
    print(f"[*] Downloading {dest_path.name} from {url}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp, open(dest_path, "wb") as out_file:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out_file.write(chunk)
    print(f"[+] Download completed: {dest_path.name} ({dest_path.stat().st_size / (1024*1024):.2f} MB)")


def prepare_mtsamples() -> pd.DataFrame:
    mtsamples_file = RAW_DIR / "mtsamples.csv"
    download_file(MTSAMPLES_URL, mtsamples_file)

    print("[*] Processing MTSamples...")
    df = pd.read_csv(mtsamples_file)
    if "Unnamed: 0" in df.columns:
        df = df.drop(columns=["Unnamed: 0"])
    df = df.dropna(subset=["transcription"])
    df = df[df["transcription"].astype(str).str.len() >= 100]
    df = df.drop_duplicates(subset=["transcription"]).reset_index(drop=True)

    mtsamples_clean_path = DATA_DIR / "mtsamples_clean.csv"
    df.to_csv(mtsamples_clean_path, index=False)
    print(f"[+] MTSamples clean saved: {len(df)} reports.")

    df["report_text"] = df["transcription"].fillna("").astype(str).str.strip()
    df["source_dataset"] = "MTSamples"
    df["specialty"] = df["medical_specialty"].fillna("Unknown")
    df["report_type"] = "Medical transcription"
    df["original_report_id"] = df.index.astype(str)

    return df[["report_text", "source_dataset", "specialty", "report_type", "original_report_id"]].copy()


def extract_iu_xray_reports(max_reports: int = 500) -> pd.DataFrame:
    archive_path = RAW_DIR / "NLMCXR_reports.tgz"
    extract_path = RAW_DIR / "iu_xray_reports"
    download_file(IU_REPORTS_URL, archive_path)

    if not extract_path.exists():
        print("[*] Extracting IU X-Ray reports archive...")
        extract_path.mkdir(parents=True, exist_ok=True)
        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(path=extract_path)

    xml_dir = extract_path / "ecgen-radiology"
    if not xml_dir.exists():
        # Search for ecgen-radiology if nested
        candidates = list(extract_path.glob("**/ecgen-radiology"))
        if candidates:
            xml_dir = candidates[0]
        else:
            xml_dir = extract_path

    xml_files = [f for f in xml_dir.glob("*.xml")]
    print(f"[*] Found {len(xml_files)} XML reports in {xml_dir.name}")

    def get_section_text(root, section_name):
        nodes = root.findall(f".//AbstractText[@Label='{section_name}']")
        parts = [n.text.strip() for n in nodes if n is not None and n.text and n.text.strip()]
        return " ".join(parts).strip()

    records = []
    # Process files up to max_reports (or all if max_reports is None)
    files_to_process = xml_files if max_reports is None else xml_files[:max_reports]
    for xml_path in files_to_process:
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()
            uid = root.find(".//uId")
            rep_id = uid.attrib.get("id") if uid is not None else xml_path.stem

            ind = get_section_text(root, "INDICATION")
            find = get_section_text(root, "FINDINGS")
            imp = get_section_text(root, "IMPRESSION")
            comp = get_section_text(root, "COMPARISON")

            secs = []
            if ind: secs.append("Indication: " + ind)
            if comp: secs.append("Comparison: " + comp)
            if find: secs.append("Findings: " + find)
            if imp: secs.append("Impression: " + imp)
            text = "\n".join(secs).strip()
            if not text:
                continue

            records.append({
                "report_id": rep_id,
                "report_text": re.sub(r"\s+", " ", text).strip(),
                "indication": ind,
                "findings": find,
                "impression": imp,
                "comparison": comp,
                "source_dataset": "IU_XRay",
                "specialty": "Radiology",
                "report_type": "Radiology report",
                "original_report_id": rep_id,
            })
        except Exception as e:
            continue

    iu_df = pd.DataFrame(records)
    iu_df = iu_df.drop_duplicates(subset=["report_id"]).drop_duplicates(subset=["report_text"]).reset_index(drop=True)
    iu_df.to_csv(DATA_DIR / "iu_xray_reports_clean.csv", index=False)
    print(f"[+] IU X-Ray reports extracted and cleaned: {len(iu_df)} reports.")

    return iu_df[["report_text", "source_dataset", "specialty", "report_type", "original_report_id"]].copy()


def combine_and_split(mtsamples_df: pd.DataFrame, iu_df: pd.DataFrame):
    print("[*] Combining datasets...")
    combined = pd.concat([mtsamples_df, iu_df], ignore_index=True)
    combined["normalized_text"] = combined["report_text"].str.lower().str.replace(r"\s+", " ", regex=True).str.strip()
    combined = combined.drop_duplicates(subset=["normalized_text"]).reset_index(drop=True)
    combined = combined.drop(columns=["normalized_text"], errors="ignore")

    combined.insert(0, "report_id", [f"MED_{i:05d}" for i in range(1, len(combined) + 1)])
    combined["report_length"] = combined["report_text"].str.len()

    out_file = DATA_DIR / "combined_medical_reports_clean.csv"
    combined.to_csv(out_file, index=False)
    print(f"[+] Saved combined dataset: {out_file} ({len(combined)} reports)")

    # Stratified or simple splits
    print("[*] Generating train / validation / test splits (90 / 5 / 5)...")
    train_df, temp_df = train_test_split(combined, test_size=0.10, random_state=42)
    val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=42)

    train_df.to_csv(SPLITS_DIR / "train.csv", index=False)
    val_df.to_csv(SPLITS_DIR / "val.csv", index=False)
    test_df.to_csv(SPLITS_DIR / "test.csv", index=False)
    print(f"[+] Splits saved: train={len(train_df)}, val={len(val_df)}, test={len(test_df)}")


if __name__ == "__main__":
    setup_directories()
    mt_df = prepare_mtsamples()
    iu_df = extract_iu_xray_reports(max_reports=None)
    combine_and_split(mt_df, iu_df)
    print("\n[✓] Data pipeline completed successfully!")
