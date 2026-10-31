import re
from typing import Dict, Any, List

# Filler words common in natural speech dictation
FILLER_PATTERNS = [
    r"\bum+\b", r"\buh+\b", r"\bah+\b", r"\blike\b", r"\byou know\b",
    r"\bkind of\b", r"\bsort of\b", r"\bbasically\b", r"\bhonestly\b",
    r"\bso yeah\b", r"\banyways?\b", r"\bI guess\b", r"\bI mean\b"
]

# Self-correction phrases
CORRECTION_PATTERNS = [
    r"(.*?)(?:\bno wait\b|\bwait no\b|\bactually\b|\bsorry I mean\b|\bI mean\b|\brather\b)(.*)"
]

# Common digressions
DIGRESSION_PATTERNS = [
    r"\b(?:by the way|btw|on a side note|my exam is on|my test is tomorrow|I am so stressed|my cat just|I haven't slept)\b.*?(?=[.?!]|$)"
]

def parse_wispr_flow_speech(raw_transcript: str) -> Dict[str, Any]:
    """
    Parses conversational natural speech transcriptions from Wispr Flow dictation.
    Cleans speech disfluencies, detects self-corrections, and isolates digressions.
    """
    text = raw_transcript.strip()
    original_text = text

    fillers_found: List[str] = []
    corrections_found: List[str] = []
    digressions_found: List[str] = []

    # 1. Identify digressions
    for dp in DIGRESSION_PATTERNS:
        matches = re.findall(dp, text, flags=re.IGNORECASE)
        for m in matches:
            digressions_found.append(m.strip())
            text = text.replace(m, "")

    # 2. Identify self-corrections
    # e.g., "A stack is FIFO... no wait, actually it's LIFO"
    for cp in CORRECTION_PATTERNS:
        match = re.search(cp, text, flags=re.IGNORECASE)
        if match:
            before = match.group(1).strip()
            after = match.group(2).strip()
            if after:
                corrections_found.append(f"Corrected '{before}' -> '{after}'")
                text = after  # Adopt the corrected statement

    # 3. Detect and remove filler words
    for fp in FILLER_PATTERNS:
        found = re.findall(fp, text, flags=re.IGNORECASE)
        if found:
            fillers_found.extend([f.lower() for f in found])
            text = re.sub(fp, " ", text, flags=re.IGNORECASE)

    # Clean up double spaces and punctuation
    cleaned = re.sub(r"\s+", " ", text).strip()
    cleaned = re.sub(r"\s+([,?.!])", r"\1", cleaned)

    return {
        "original_transcript": original_text,
        "cleaned_query": cleaned if cleaned else original_text,
        "filler_words_removed": list(set(fillers_found)),
        "self_corrections_resolved": corrections_found,
        "digressions_identified": digressions_found,
        "speech_confidence": 0.94 if fillers_found or corrections_found else 0.98
    }
