# Clinical Co-Pilot: Comprehensive Project Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Technology Stack](#technology-stack)
5. [Data Flow](#data-flow)
6. [Implementation Details](#implementation-details)
7. [Features](#features)
8. [Limitations & Disclaimers](#limitations--disclaimers)
9. [Educational Value](#educational-value)
10. [Future Enhancements](#future-enhancements)

---

## System Overview

The **Clinical Co-Pilot** is an AI-powered clinical decision support system that helps healthcare professionals analyze clinical notes and generate differential diagnoses using **Retrieval-Augmented Generation (RAG)** technology. It combines natural language processing, vector search, and large language models to provide evidence-based clinical insights.

### What It Does

- **Analyzes clinical notes** (text or images via OCR)
- **Extracts structured facts** (demographics, symptoms, vitals, labs)
- **Generates differential diagnoses** with confidence levels
- **Creates SOAP notes** (Subjective, Objective, Assessment, Plan)
- **Provides evidence traceability** linking diagnoses to source text

### Key Innovation

Uses RAG to ground AI responses in actual clinical documentation, preventing hallucinations and providing transparent evidence chains for clinical decision-making.

---

## Architecture

### High-Level Pipeline

```
┌─────────────────┐
│  Clinical Note  │ (Text/Image Input)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Section Detection│ (HPI, PMH, Labs, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Chunking     │ (1500 chars/chunk)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Embeddings    │ (768-dim vectors)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FAISS Index    │ (Vector Database)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Top-K Retrieval│ (Most relevant chunks)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Two-Step LLM   │
│  Step 1: Facts  │
│  Step 2: DDx    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SOAP Summary   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Streamlit UI   │ (Results + Traceability)
└─────────────────┘
```

### RAG Architecture

The system uses **Retrieval-Augmented Generation** to ensure AI responses are grounded in actual clinical data:

1. **Indexing Phase**: Clinical notes → Chunks → Embeddings → FAISS Vector DB
2. **Retrieval Phase**: User query → Embedding → Similarity search → Top-K chunks
3. **Generation Phase**: Retrieved context + Query → LLM → Evidence-based response

---

## Core Components

### 1. Input Processing (`extract_text_from_image_bytes`)

**Location**: Lines 51-90 in `hackathon.py`

**Purpose**: Handles multi-modal input (text and images)

**How It Works**:

- Accepts text directly OR images (JPEG, PNG)
- Uses **Tesseract OCR** to extract text from images
- Converts PIL Image → OCR → Plain text
- Handles errors gracefully (returns empty string on failure)

**Example**:

```python
# Input: Image bytes of a lab report
# Output: "WBC: 15,000/μL, CRP: 45 mg/L, ..."
```

**Clinical Use Case**: Process scanned documents, handwritten notes, lab reports, radiology reports.

---

### 2. Section Detection (`split_into_sections`)

**Location**: Lines 91-127 in `hackathon.py`

**Purpose**: Intelligently segments clinical notes into standard sections

**How It Works**:

- Uses regex to detect section headers (case-insensitive)
- Recognizes 12+ standard sections:
  - History of Present Illness (HPI)
  - Past Medical History (PMH)
  - Medications
  - Allergies
  - Review of Systems (ROS)
  - Physical Exam
  - Labs/Laboratory
  - Imaging
  - Assessment & Plan
  - Discharge Summary
  - Social History
  - Family History

**Algorithm**:

```python
SECTION_HEADERS = re.compile(
    r'^\s*(HISTORY OF PRESENT ILLNESS|HPI|PAST MEDICAL HISTORY|...|FAMILY HISTORY):?\s*$',
    re.IGNORECASE | re.MULTILINE
)

# Splits note at each section header
# Returns: [(section_name, section_text), ...]
```

**Why It Matters**: Section awareness improves retrieval accuracy. Symptoms in HPI are more relevant than symptoms in PMH.

---

### 3. Hierarchical Chunking (`prepare_chunks_from_text`)

**Location**: Lines 444-478 in `hackathon.py`

**Purpose**: Breaks clinical notes into semantically meaningful chunks

**How It Works**:

- **Section-aware**: Keeps section boundaries intact
- **Size-limited**: Max 1500 characters per chunk (prevents truncation in LLM context)
- **Overlapping**: Ensures continuity (if needed)
- **UUID-tagged**: Each chunk gets unique ID for traceability

**Chunk ID Format**:

```
{doc_id}_{section_name}_{sequence}_{uuid}
Example: 0_HISTORY OF PRESENT I_1_c5516063
```

**Why This Format**:

- `doc_id`: Multi-document support
- `section_name`: Shows which section (HPI, Labs, etc.)
- `sequence`: Order within section
- `uuid`: Global uniqueness

**Example**:

```python
Input: "HISTORY OF PRESENT ILLNESS: 45yo M with fever, headache, neck stiffness..."
Output: Chunk {
  id: "0_HISTORY OF PRESENT I_1_c5516063",
  text: "45yo M with fever, headache, neck stiffness...",
  section: "HISTORY OF PRESENT I"
}
```

---

### 4. Embedding & Vector Search (`build_index_from_chunks`, `retrieve_from_index`)

**Location**: Lines 128-166 in `hackathon.py`

**Purpose**: Semantic search over clinical text using vector similarity

**How It Works**:

#### A. Embedding Model

- **Model**: `sentence-transformers/all-mpnet-base-v2`
- **Dimensions**: 768
- **Size**: ~400MB
- **Why this model**: Good balance of speed, accuracy, and size for general text

#### B. FAISS Indexing

```python
def build_index_from_chunks(chunks):
    # 1. Convert chunks to 768-dim vectors
    embeddings = model.encode([c["text"] for c in chunks])

    # 2. L2 normalize for cosine similarity
    faiss.normalize_L2(embeddings)

    # 3. Create FAISS index
    index = faiss.IndexFlatIP(768)  # Inner Product = Cosine after normalization
    index.add(embeddings)

    return index, chunks
```

#### C. Retrieval

```python
def retrieve_from_index(query, index, chunks, top_k=5):
    # 1. Embed query
    query_vec = model.encode([query])
    faiss.normalize_L2(query_vec)

    # 2. Search FAISS index
    scores, indices = index.search(query_vec, top_k)

    # 3. Return top-K chunks with scores
    return [(chunks[i], scores[0][j]) for j, i in enumerate(indices[0])]
```

**Similarity Scores**: Range 0-1 (1 = identical, 0 = orthogonal)

**Example**:

```python
Query: "patient with headache and fever"
Retrieved Chunks:
1. "45yo M with fever (102°F), severe headache, neck stiffness" → Score: 0.861
2. "Assessment: Meningitis - given fever, headache, nuchal rigidity" → Score: 0.807
3. "Labs: WBC 15k, CRP elevated" → Score: 0.752
```

---

### 5. Two-Step LLM Reasoning (`call_local_stub`, `call_openai_chat`)

**Location**: Lines 188-428 (local_stub), Lines 168-186 (OpenAI) in `hackathon.py`

**Purpose**: Extract facts and generate differential diagnoses using LLMs

**Two Modes**:

#### A. OpenAI Mode (GPT-4/3.5)

```python
def call_openai_chat(prompt):
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content
```

#### B. Local Stub Mode (Pattern Matching)

```python
def call_local_stub(prompt):
    # Step 2: Generate DDx (checked first for specificity)
    if "differential diagnoses" in prompt.lower():
        return generate_ddx_json(prompt)

    # SOAP: Generate summary
    if "SOAP note" in prompt:
        return generate_soap(prompt)

    # Step 1: Extract structured facts
    if "Extract structured facts" in prompt:
        return extract_facts(prompt)
```

**Why Two Steps**:

1. **Step 1**: Extract objective facts (demographics, symptoms, vitals, labs)
   - Input: Retrieved chunks
   - Output: Structured JSON with patient data
2. **Step 2**: Generate differential diagnoses
   - Input: Structured facts from Step 1 + Retrieved chunks
   - Output: JSON with diagnoses, confidence, rationale, evidence

**Separation Benefit**: Prevents fact hallucination, enables structured data extraction

---

### 6. Differential Diagnosis Generation (DDx)

**Location**: Lines 216-330 in `hackathon.py`

**Purpose**: Generate clinical differential diagnoses with confidence levels

**How Local Stub Works**:

#### Pattern Detection

```python
# Detects clinical patterns from symptoms + labs + vitals
patterns = {
    "meningitis": ["fever", "headache", "stiff neck"] + ["WBC elevated"],
    "pneumonia": ["fever", "cough", "shortness of breath"] + ["WBC elevated"],
    "myocardial_infarction": ["chest pain"] + ["troponin elevated"],
    "sepsis": ["fever", "confusion", "hypotension"] + ["WBC elevated"],
    "stroke": ["confusion", "weakness", "numbness"],
    "appendicitis": ["abdominal pain", "fever", "nausea"],
    # ... 15+ patterns
}
```

#### DDx Generation Logic

```python
def generate_ddx(prompt):
    # 1. Extract keywords from prompt
    keywords = extract_keywords(prompt)

    # 2. Match against patterns
    matches = []
    for condition, pattern in patterns.items():
        score = count_matches(keywords, pattern)
        if score >= threshold:
            matches.append((condition, score))

    # 3. Generate JSON
    ddx = []
    for condition, score in sorted(matches, key=lambda x: -x[1])[:3]:
        ddx.append({
            "diagnosis": condition.title(),
            "confidence": calculate_confidence(score),
            "rationale": generate_rationale(condition, keywords),
            "evidence": extract_evidence_chunks(keywords)
        })

    return json.dumps(ddx, indent=2)
```

**Confidence Calculation**:

- 90%+: All key symptoms + labs + vitals match
- 75-89%: Most key symptoms match
- 60-74%: Some symptoms match + contextual fit
- <60%: Unlikely

**Example Output**:

```json
[
  {
    "diagnosis": "Bacterial Meningitis",
    "confidence": "90%",
    "rationale": "Patient presents with classic triad: fever, severe headache, and nuchal rigidity. Elevated WBC and CRP support bacterial infection.",
    "evidence": [
      "evidence: 0_HISTORY OF PRESENT I_1_c5516063",
      "evidence: 0_LABS_1_d4a2f891"
    ]
  },
  {
    "diagnosis": "Viral Meningitis",
    "confidence": "75%",
    "rationale": "Similar presentation but less severe. WBC elevation could be viral.",
    "evidence": ["evidence: 0_HISTORY OF PRESENT I_1_c5516063"]
  }
]
```

---

### 7. Structured Fact Extraction

**Location**: Lines 332-428 in `hackathon.py`

**Purpose**: Extract objective clinical data into structured format

**Categories Extracted**:

#### A. Demographics

```python
# Age detection
age_patterns = [
    r'(\d+)\s*(?:year|yr|y\.?o\.?)',  # 45 year old, 45yo, 45y.o.
    r'(\d+)\s*(?:-year-old|-yr-old)',  # 45-year-old
    r'age[:\s]+(\d+)'                   # age: 45
]

# Gender detection
gender_keywords = ["male", "female", "M", "F", "man", "woman"]
```

#### B. Symptoms (14+ categories)

```python
symptom_categories = {
    "fever": ["fever", "febrile", "temp", "temperature"],
    "headache": ["headache", "head pain", "cephalalgia"],
    "neck_stiffness": ["stiff neck", "nuchal rigidity", "neck stiffness"],
    "confusion": ["confusion", "altered mental status", "AMS", "disoriented"],
    "cough": ["cough", "coughing", "productive cough"],
    "shortness_of_breath": ["SOB", "shortness of breath", "dyspnea"],
    "chest_pain": ["chest pain", "CP", "substernal"],
    "abdominal_pain": ["abdominal pain", "abd pain", "stomach pain"],
    "nausea_vomiting": ["nausea", "vomiting", "N/V", "emesis"],
    "weakness": ["weakness", "weak", "fatigue", "tired"],
    "numbness": ["numbness", "numb", "paresthesia"],
    "dizziness": ["dizziness", "dizzy", "vertigo", "lightheaded"],
    "rash": ["rash", "skin lesions", "erythema"],
    "diarrhea": ["diarrhea", "loose stools"]
}
```

#### C. Vitals (5 types)

```python
vitals_patterns = {
    "temperature": r'(?:temp|temperature)[:\s]*(\d+(?:\.\d+)?)\s*(?:°?F|fahrenheit)?',
    "heart_rate": r'(?:HR|heart rate)[:\s]*(\d+)',
    "blood_pressure": r'(?:BP|blood pressure)[:\s]*(\d+/\d+)',
    "respiratory_rate": r'(?:RR|respiratory rate)[:\s]*(\d+)',
    "oxygen_saturation": r'(?:O2 sat|SpO2|oxygen saturation)[:\s]*(\d+)%?'
}
```

#### D. Physical Exam Findings (6 categories)

```python
exam_findings = {
    "meningeal_signs": ["Brudzinski sign", "Kernig sign", "nuchal rigidity"],
    "lung_sounds": ["crackles", "rales", "wheezes", "rhonchi", "decreased breath sounds"],
    "heart_sounds": ["murmur", "S3", "S4", "irregular"],
    "abdominal_exam": ["tender", "guarding", "rebound", "distended"],
    "neuro_exam": ["weakness", "sensory deficit", "reflexes", "gait"],
    "skin_exam": ["rash", "petechiae", "ecchymosis"]
}
```

#### E. Laboratory Results (12+ tests)

```python
lab_patterns = {
    "WBC": r'WBC[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:k|K|/μL)?',
    "CRP": r'CRP[:\s]*(\d+(?:\.\d+)?)\s*(?:mg/L)?',
    "ESR": r'ESR[:\s]*(\d+)',
    "glucose": r'glucose[:\s]*(\d+)',
    "creatinine": r'creatinine[:\s]*(\d+(?:\.\d+)?)',
    "sodium": r'(?:Na|sodium)[:\s]*(\d+)',
    "potassium": r'(?:K|potassium)[:\s]*(\d+(?:\.\d+)?)',
    "hemoglobin": r'(?:Hgb|hemoglobin)[:\s]*(\d+(?:\.\d+)?)',
    "platelets": r'(?:platelets|PLT)[:\s]*(\d+(?:,\d+)?)',
    "troponin": r'troponin[:\s]*(\d+(?:\.\d+)?)',
    "BNP": r'BNP[:\s]*(\d+)',
    "lactate": r'lactate[:\s]*(\d+(?:\.\d+)?)'
}
```

**Example Output**:

```json
{
  "demographics": {
    "age": "45",
    "gender": "male"
  },
  "symptoms": ["fever", "headache", "stiff neck", "confusion"],
  "vitals": {
    "temperature": "102°F",
    "heart_rate": "110",
    "blood_pressure": "130/80"
  },
  "physical_exam": ["nuchal rigidity", "Brudzinski sign positive"],
  "labs": {
    "WBC": "15,000 (elevated)",
    "CRP": "45 (elevated)",
    "glucose": "95"
  }
}
```

---

### 8. SOAP Note Generation

**Location**: Lines 280-330 in `hackathon.py`

**Purpose**: Create standardized clinical summary in SOAP format

**SOAP Structure**:

- **S**ubjective: Chief complaint + symptoms (from patient's perspective)
- **O**bjective: Vitals + physical exam + labs (measurable data)
- **A**ssessment: Clinical impression + differential diagnoses
- **P**lan: Diagnostic workup + treatment + follow-up

**How It Works**:

```python
def generate_soap(prompt):
    # Extract components
    subjective = extract_symptoms_and_hpi(prompt)
    objective = extract_vitals_labs_exam(prompt)
    assessment = extract_assessment_or_infer(prompt)
    plan = extract_plan_or_generate(prompt)

    # Format as SOAP
    return f"""
SUBJECTIVE:
{subjective}

OBJECTIVE:
{objective}

ASSESSMENT:
{assessment}

PLAN:
{plan}
"""
```

**Example**:

```
SUBJECTIVE:
45-year-old male presents with 2 days of severe headache, fever, and neck stiffness.
Reports photophobia and nausea.

OBJECTIVE:
Vitals: Temp 102°F, HR 110, BP 130/80
Physical Exam: Nuchal rigidity present, Brudzinski sign positive
Labs: WBC 15,000 (elevated), CRP 45 mg/L (elevated)

ASSESSMENT:
Bacterial meningitis (high suspicion given classic triad + elevated inflammatory markers)
Differential: Viral meningitis, subarachnoid hemorrhage

PLAN:
1. Empiric antibiotics (ceftriaxone + vancomycin)
2. LP for CSF analysis
3. CT head if neuro deficits
4. Admit to ICU for monitoring
```

---

### 9. Evidence Traceability System

**Location**: Lines 194-210 (chunk extraction), Lines 626-710 (UI display) in `hackathon.py`

**Purpose**: Link every AI-generated statement back to source clinical text

**How It Works**:

#### A. Chunk ID Embedding

During DDx generation, chunk IDs are embedded in rationale:

```python
rationale = f"Patient presents with fever and headache. [evidence: {chunk_id}]"
```

#### B. Chunk ID Extraction

```python
def extract_chunk_ids(text, max_per_keyword=2):
    # Find all [evidence: chunk_id] markers
    pattern = r'\[evidence:\s*([^\]]+)\]'
    matches = re.findall(pattern, text)

    # Validate chunk IDs
    chunk_ids = []
    for match in matches:
        chunk_id = match.strip()
        # Must contain underscore (format: doc_section_seq_uuid)
        # Must not start with "evidence" (prevent duplication)
        if '_' in chunk_id and not chunk_id.lower().startswith('evidence'):
            chunk_ids.append(chunk_id)
            if len(chunk_ids) >= max_per_keyword:
                break

    return chunk_ids
```

#### C. Chunk Lookup

```python
def lookup_chunk_text(chunk_id, chunks):
    for chunk in chunks:
        if chunk["id"] == chunk_id:
            return {
                "text": chunk["text"],
                "section": chunk.get("section", "Unknown")
            }
    return None
```

#### D. UI Display

Streamlit expandable sections show evidence:

```python
with st.expander("🔍 Evidence Traceability"):
    for chunk_id in evidence_chunk_ids:
        chunk_data = lookup_chunk_text(chunk_id, all_chunks)
        if chunk_data:
            st.markdown(f"**Chunk ID**: `{chunk_id}`")
            st.markdown(f"**Section**: {chunk_data['section']}")
            st.markdown(f"**Content**: {chunk_data['text']}")
            st.markdown("---")
```

**Why It Matters**:

- **Transparency**: Clinicians can verify AI reasoning
- **Auditability**: Trace decisions back to source
- **Trust**: Prevents "black box" AI
- **Education**: Shows how AI connected symptoms to diagnoses

---

### 10. Streamlit User Interface

**Location**: Lines 540-710 in `hackathon.py`

**Purpose**: Interactive web interface for clinical analysis

**UI Components**:

#### A. Input Panel

```python
# Text input
clinical_text = st.text_area("Enter clinical note", height=300)

# Image upload
uploaded_file = st.file_uploader("Upload image", type=["png", "jpg", "jpeg"])

# LLM mode selector
llm_mode = st.selectbox("LLM Mode", ["local_stub", "openai"])
```

#### B. Analysis Display

```python
if st.button("Analyze"):
    with st.spinner("Processing..."):
        # Run RAG pipeline
        result = generate_summary_and_ddx(clinical_text, llm_mode)

        # Display structured facts
        st.subheader("📊 Structured Facts")
        st.json(result["structured_facts"])

        # Display DDx
        st.subheader("🩺 Differential Diagnoses")
        st.json(result["ddx"])

        # Display SOAP
        st.subheader("📝 SOAP Note")
        st.markdown(result["soap"])
```

#### C. Evidence Traceability Explorer

```python
with st.expander("🔍 Evidence Traceability"):
    for chunk_id in evidence_chunk_ids:
        chunk = lookup_chunk(chunk_id)
        st.markdown(f"**Chunk**: `{chunk_id}`")
        st.markdown(f"**Section**: {chunk['section']}")
        st.code(chunk["text"])
```

#### D. Retrieved Chunks Inspector

```python
with st.expander("📚 Retrieved Chunks (Debug)"):
    for i, (chunk, score) in enumerate(retrieved_chunks):
        st.markdown(f"**Rank {i+1}** | Score: {score:.3f}")
        st.markdown(f"Chunk ID: `{chunk['id']}`")
        st.markdown(f"Section: {chunk['section']}")
        st.text(chunk["text"][:500])
```

---

## Technology Stack

### Core Dependencies

| Package                 | Version | Size   | Purpose                  |
| ----------------------- | ------- | ------ | ------------------------ |
| `streamlit`             | Latest  | ~50MB  | Web UI framework         |
| `sentence-transformers` | Latest  | ~400MB | Text embeddings          |
| `faiss-cpu`             | Latest  | ~30MB  | Vector similarity search |
| `pytesseract`           | Latest  | ~5MB   | OCR engine               |
| `pillow`                | Latest  | ~10MB  | Image processing         |
| `openai`                | Latest  | ~5MB   | GPT API client           |
| `python-dotenv`         | Latest  | <1MB   | Environment config       |
| `tqdm`                  | Latest  | <1MB   | Progress bars            |
| `requests`              | Latest  | <1MB   | HTTP client              |

**Total Install Size**: ~500MB (down from 3.5GB with transformers/torch)

### System Requirements

- **Python**: 3.8+ (tested on 3.11)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB free space
- **Tesseract OCR**: Must be installed separately
- **GPU**: Not required (CPU-only with faiss-cpu)

### Embedding Model Details

- **Model**: `sentence-transformers/all-mpnet-base-v2`
- **Architecture**: MPNet (Masked and Permuted Pre-training)
- **Training**: Trained on 1B+ sentence pairs
- **Dimensions**: 768
- **Max Sequence**: 384 tokens
- **Performance**: 51.39% avg on STS benchmarks
- **Speed**: ~1000 sentences/sec on CPU

---

## Data Flow

### Example: Analyzing a Meningitis Case

**Input**:

```
HISTORY OF PRESENT ILLNESS:
45-year-old male presents with 2 days of severe headache, fever (102°F),
and neck stiffness. Reports photophobia and nausea.

PHYSICAL EXAM:
Nuchal rigidity present. Brudzinski sign positive. Kernig sign positive.

LABS:
WBC: 15,000/μL (elevated)
CRP: 45 mg/L (elevated)
Glucose: 95 mg/dL

ASSESSMENT:
Suspect bacterial meningitis. Need LP for CSF analysis.

PLAN:
1. Empiric antibiotics (ceftriaxone + vancomycin)
2. Lumbar puncture
3. CT head
4. Admit to ICU
```

**Processing**:

#### Step 1: Section Detection

```python
Sections detected:
- HISTORY OF PRESENT ILLNESS → HPI
- PHYSICAL EXAM → Physical Exam
- LABS → Labs
- ASSESSMENT → Assessment
- PLAN → Plan
```

#### Step 2: Chunking

```python
Chunks created:
[
  {
    "id": "0_HISTORY OF PRESENT I_1_c5516063",
    "text": "45-year-old male presents with 2 days of severe headache, fever (102°F)...",
    "section": "HISTORY OF PRESENT I"
  },
  {
    "id": "0_PHYSICAL EXAM_1_d4a2f891",
    "text": "Nuchal rigidity present. Brudzinski sign positive...",
    "section": "PHYSICAL EXAM"
  },
  {
    "id": "0_LABS_1_e8b3c492",
    "text": "WBC: 15,000/μL (elevated), CRP: 45 mg/L (elevated)...",
    "section": "LABS"
  }
]
```

#### Step 3: Embedding

```python
Embeddings generated:
Chunk 0_HISTORY OF PRESENT I_1_c5516063 → [0.023, -0.145, 0.892, ..., 0.034] (768 dims)
Chunk 0_PHYSICAL EXAM_1_d4a2f891 → [0.145, -0.023, 0.234, ..., -0.092] (768 dims)
Chunk 0_LABS_1_e8b3c492 → [-0.034, 0.234, 0.145, ..., 0.023] (768 dims)
```

#### Step 4: FAISS Indexing

```python
Index created: 3 chunks, 768 dimensions, Inner Product similarity
```

#### Step 5: Retrieval (Step 1 Query)

```python
Query: "Extract structured facts: demographics, symptoms, vitals, labs, exam findings"

Retrieved chunks:
1. Chunk: 0_HISTORY OF PRESENT I_1_c5516063 | Score: 0.861
2. Chunk: 0_LABS_1_e8b3c492 | Score: 0.807
3. Chunk: 0_PHYSICAL EXAM_1_d4a2f891 | Score: 0.752
```

#### Step 6: Step 1 - Extract Facts

```python
Input to LLM:
"""
Retrieved Context:
[0_HISTORY OF PRESENT I_1_c5516063]: 45-year-old male presents with 2 days of severe headache...
[0_LABS_1_e8b3c492]: WBC: 15,000/μL (elevated), CRP: 45 mg/L (elevated)...
[0_PHYSICAL EXAM_1_d4a2f891]: Nuchal rigidity present. Brudzinski sign positive...

Extract structured facts: demographics, symptoms, vitals, labs, exam findings.
"""

Output:
{
  "demographics": {"age": "45", "gender": "male"},
  "symptoms": ["fever", "headache", "neck stiffness", "photophobia", "nausea"],
  "vitals": {"temperature": "102°F"},
  "physical_exam": ["nuchal rigidity", "Brudzinski sign positive", "Kernig sign positive"],
  "labs": {
    "WBC": "15,000 (elevated)",
    "CRP": "45 (elevated)",
    "glucose": "95"
  }
}
```

#### Step 7: Retrieval (Step 2 Query)

```python
Query: "Generate differential diagnoses for: fever, headache, neck stiffness, elevated WBC"

Retrieved chunks:
1. Chunk: 0_HISTORY OF PRESENT I_1_c5516063 | Score: 0.885
2. Chunk: 0_ASSESSMENT_1_f9c4d583 | Score: 0.823
3. Chunk: 0_PHYSICAL EXAM_1_d4a2f891 | Score: 0.798
```

#### Step 8: Step 2 - Generate DDx

```python
Input to LLM:
"""
Retrieved Context:
[0_HISTORY OF PRESENT I_1_c5516063]: 45-year-old male presents with 2 days of severe headache...
[0_ASSESSMENT_1_f9c4d583]: Suspect bacterial meningitis. Need LP for CSF analysis...
[0_PHYSICAL EXAM_1_d4a2f891]: Nuchal rigidity present. Brudzinski sign positive...

Structured Facts:
{demographics: ..., symptoms: ..., vitals: ..., labs: ...}

Generate differential diagnoses with confidence, rationale, and evidence.
"""

Output:
[
  {
    "diagnosis": "Bacterial Meningitis",
    "confidence": "90%",
    "rationale": "Classic triad of fever, headache, and nuchal rigidity. Positive Brudzinski and Kernig signs. Elevated WBC and CRP support bacterial infection. [evidence: 0_HISTORY OF PRESENT I_1_c5516063] [evidence: 0_PHYSICAL EXAM_1_d4a2f891] [evidence: 0_LABS_1_e8b3c492]",
    "evidence": ["0_HISTORY OF PRESENT I_1_c5516063", "0_PHYSICAL EXAM_1_d4a2f891", "0_LABS_1_e8b3c492"]
  },
  {
    "diagnosis": "Viral Meningitis",
    "confidence": "75%",
    "rationale": "Similar presentation but typically less severe. WBC elevation could be viral. [evidence: 0_HISTORY OF PRESENT I_1_c5516063]",
    "evidence": ["0_HISTORY OF PRESENT I_1_c5516063"]
  },
  {
    "diagnosis": "Subarachnoid Hemorrhage",
    "confidence": "65%",
    "rationale": "Severe headache with nuchal rigidity could indicate SAH. Need CT to rule out. [evidence: 0_HISTORY OF PRESENT I_1_c5516063]",
    "evidence": ["0_HISTORY OF PRESENT I_1_c5516063"]
  }
]
```

#### Step 9: SOAP Generation

```python
SUBJECTIVE:
45-year-old male presents with 2 days of severe headache, fever, and neck stiffness.
Reports photophobia and nausea.

OBJECTIVE:
Vitals: Temperature 102°F
Physical Exam: Nuchal rigidity present, Brudzinski sign positive, Kernig sign positive
Labs: WBC 15,000 (elevated), CRP 45 (elevated), Glucose 95

ASSESSMENT:
1. Bacterial Meningitis (90% confidence) - Classic triad with meningeal signs
2. Viral Meningitis (75% confidence) - Alternative infectious etiology
3. Subarachnoid Hemorrhage (65% confidence) - Must rule out with imaging

PLAN:
1. Empiric antibiotics (ceftriaxone + vancomycin) - do not delay
2. Lumbar puncture for CSF analysis
3. CT head prior to LP if focal deficits
4. Admit to ICU for close monitoring
5. Follow-up: Adjust antibiotics based on CSF culture
```

#### Step 10: UI Display

```
┌─────────────────────────────────────┐
│  📊 Structured Facts                │
├─────────────────────────────────────┤
│ Age: 45, Gender: male               │
│ Symptoms: fever, headache, stiff... │
│ Vitals: Temp 102°F                  │
│ Labs: WBC 15k (↑), CRP 45 (↑)       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🩺 Differential Diagnoses          │
├─────────────────────────────────────┤
│ 1. Bacterial Meningitis (90%)       │
│    Rationale: Classic triad...      │
│    Evidence: [chunk_id_1] [chunk...]│
│                                      │
│ 2. Viral Meningitis (75%)           │
│ 3. Subarachnoid Hemorrhage (65%)    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  📝 SOAP Note                       │
├─────────────────────────────────────┤
│ S: 45yo M with 2d headache...       │
│ O: Temp 102°F, WBC 15k...           │
│ A: Bacterial meningitis...          │
│ P: 1. Empiric abx, 2. LP...         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🔍 Evidence Traceability (expand)  │
├─────────────────────────────────────┤
│ Chunk: 0_HISTORY OF PRESENT I_...   │
│ Section: HPI                         │
│ Text: "45-year-old male presents..." │
└─────────────────────────────────────┘
```

---

## Implementation Details

### File Structure

```
IIIT_HACKATHON/
├── hackathon.py              # Main application (710 lines)
├── requirements.txt          # Dependencies
├── .env                      # Configuration (LLM_MODE, API keys)
├── .env.example              # Template
├── README.md                 # Setup instructions
├── QUICKSTART.md             # 3-step guide
├── LIGHTWEIGHT_UPDATE.md     # Change log
├── PROJECT_DOCUMENTATION.md  # This file
├── check_system.ps1          # System verification
├── start.ps1                 # Auto-setup script
├── .gitignore                # Git ignore rules
└── .venv/                    # Python virtual environment
```

### Code Organization (hackathon.py)

```
Lines 1-50:    Imports, configuration, environment loading
Lines 51-90:   OCR functions (extract_text_from_image_bytes)
Lines 91-127:  Section detection (split_into_sections)
Lines 128-166: FAISS indexing (build_index, retrieve)
Lines 168-186: OpenAI LLM wrapper
Lines 188-428: Local stub LLM (pattern matching)
  Lines 194-210:  extract_chunk_ids (evidence traceability)
  Lines 216-330:  generate_ddx (differential diagnoses)
  Lines 332-428:  extract_facts (demographics, symptoms, vitals, labs)
Lines 444-478: Chunking logic (prepare_chunks_from_text)
Lines 480-540: RAG pipeline (generate_summary_and_ddx)
Lines 540-710: Streamlit UI
  Lines 540-580:  Input panel
  Lines 580-620:  Analysis display
  Lines 620-660:  Evidence traceability
  Lines 660-710:  Debug panels
```

### Configuration Options (.env)

```bash
# LLM Mode: "local_stub" (pattern matching) or "openai" (GPT API)
LLM_MODE=local_stub

# OpenAI Configuration (only if LLM_MODE=openai)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.2
OPENAI_MAX_TOKENS=2000

# Embedding Model
EMBEDDING_MODEL=sentence-transformers/all-mpnet-base-v2

# Retrieval Settings
TOP_K_RETRIEVAL=5
CHUNK_SIZE=1500
CHUNK_OVERLAP=150

# Tesseract Path (Windows)
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
```

### Running the Application

#### Option 1: PowerShell Auto-Setup

```powershell
.\start.ps1
```

#### Option 2: Manual Setup

```powershell
# 1. Create virtual environment
python -m venv .venv

# 2. Activate
.\.venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run app
streamlit run hackathon.py
```

#### Option 3: Direct Run (if .venv exists)

```powershell
& ".\.venv\Scripts\python.exe" -m streamlit run hackathon.py
```

### Troubleshooting

#### Issue: "Tesseract not found"

**Solution**: Install Tesseract OCR

```powershell
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
# Set path in .env:
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
```

#### Issue: "OpenAI API error"

**Solution**: Check API key and mode

```bash
# In .env:
LLM_MODE=local_stub  # Use pattern matching instead
# OR
OPENAI_API_KEY=sk-...  # Valid API key
```

#### Issue: "FAISS index error"

**Solution**: Verify embeddings

```python
# Check embedding dimensions
print(embeddings.shape)  # Should be (num_chunks, 768)

# Verify L2 normalization
import numpy as np
print(np.linalg.norm(embeddings[0]))  # Should be ~1.0
```

#### Issue: "Out of memory"

**Solution**: Reduce chunk size or top-K

```bash
# In .env:
CHUNK_SIZE=1000  # Smaller chunks
TOP_K_RETRIEVAL=3  # Fewer retrievals
```

---

## Features

### ✅ Implemented

1. **Multi-Modal Input**

   - Text entry
   - Image upload with OCR
   - Paste from clipboard

2. **Section-Aware Parsing**

   - Detects 12+ standard clinical sections
   - HPI, PMH, Labs, Physical Exam, etc.

3. **Hierarchical Chunking**

   - Respects section boundaries
   - 1500-char chunks with overlap
   - UUID-tagged for traceability

4. **Vector Search**

   - 768-dim embeddings (all-mpnet-base-v2)
   - FAISS cosine similarity
   - Top-K retrieval (configurable)

5. **Two-Step LLM Reasoning**

   - Step 1: Extract structured facts
   - Step 2: Generate differential diagnoses
   - Prevents hallucination

6. **Structured Fact Extraction**

   - Demographics (age, gender)
   - 14+ symptom categories
   - 5 vital signs
   - 6 physical exam categories
   - 12+ laboratory tests

7. **Differential Diagnosis Generation**

   - 15+ clinical condition patterns
   - Confidence levels (60-100%)
   - Evidence-based rationale
   - Chunk ID references

8. **SOAP Note Generation**

   - Subjective, Objective, Assessment, Plan
   - Standardized clinical format

9. **Evidence Traceability**

   - Every diagnosis linked to source chunks
   - Chunk ID → Section → Original text
   - Transparent reasoning

10. **Interactive UI**

    - Clean Streamlit interface
    - Expandable sections
    - Debug panels
    - Copy-paste results

11. **Two LLM Modes**

    - `local_stub`: Pattern matching (no API, no cost)
    - `openai`: GPT-4/3.5 (requires API key)

12. **Pre-loaded Sample**

    - Meningitis clinical case
    - Demonstrates full pipeline

13. **Lightweight**
    - 500MB install (vs 3.5GB)
    - CPU-only (no GPU needed)
    - Fast inference

### 🚧 Limitations

1. **Pattern Matching Limited**

   - Local stub uses keyword detection
   - May miss complex clinical reasoning
   - Best for common presentations

2. **No Clinical Validation**

   - Not FDA-approved
   - Not for clinical use
   - Educational/research only

3. **English Only**

   - No multi-language support

4. **Single Patient**

   - Not designed for batch processing

5. **No EHR Integration**

   - Manual copy-paste required
   - No FHIR/HL7 support

6. **Embedding Model Generic**

   - Not medical-specific (BioBERT would be better)
   - May miss clinical nuances

7. **No Drug Interactions**

   - Doesn't check medication safety

8. **No ICD-10 Codes**
   - Doesn't generate billing codes

---

## Limitations & Disclaimers

### ⚠️ IMPORTANT DISCLAIMERS

1. **NOT FOR CLINICAL USE**

   - This is an educational/research prototype
   - Not FDA-approved or clinically validated
   - Do NOT use for actual patient care
   - Always consult qualified healthcare professionals

2. **NO GUARANTEE OF ACCURACY**

   - AI may generate incorrect or incomplete information
   - Pattern matching has high false positive/negative rates
   - Always verify against clinical guidelines

3. **PRIVACY WARNING**

   - Do NOT enter real patient data (HIPAA violation)
   - Use only de-identified or synthetic cases
   - No encryption or security measures implemented

4. **LIABILITY**
   - Authors assume NO liability for any use
   - Use entirely at your own risk

### Technical Limitations

1. **Embedding Model**

   - Uses general-purpose embeddings (not medical-specific)
   - BioBERT or ClinicalBERT would be more accurate
   - May miss clinical synonyms (e.g., "dyspnea" vs "SOB")

2. **Pattern Matching**

   - Local stub uses simple keyword detection
   - Cannot handle complex clinical reasoning
   - May miss atypical presentations

3. **Context Window**

   - Chunks limited to 1500 chars
   - Long notes may lose context
   - No cross-chunk reasoning

4. **Single Language**

   - English only
   - Medical abbreviations may not be recognized

5. **No Temporal Reasoning**

   - Doesn't understand disease progression
   - Can't track changes over time

6. **No Drug Database**
   - Doesn't check interactions
   - No contraindication warnings

---

## Educational Value

### What This Project Teaches

1. **RAG Architecture**

   - Real-world implementation of Retrieval-Augmented Generation
   - How to ground LLM responses in source documents
   - Prevents hallucination through evidence

2. **Vector Search**

   - Semantic similarity vs keyword search
   - FAISS indexing and retrieval
   - Embedding model selection

3. **LLM Engineering**

   - Two-step reasoning (divide and conquer)
   - Prompt engineering for structured output
   - Tradeoffs: API vs local models

4. **NLP Pipelines**

   - Text preprocessing (section detection)
   - Chunking strategies (size, overlap)
   - Information extraction (regex, patterns)

5. **Clinical Informatics**

   - SOAP note format
   - Differential diagnosis reasoning
   - Clinical documentation standards

6. **Software Engineering**

   - Python project structure
   - Environment management (.env)
   - Dependency optimization (lightweight)
   - Error handling

7. **UI/UX Design**
   - Streamlit for rapid prototyping
   - Evidence traceability (transparency)
   - Debug panels for developers

### Use Cases for Learning

1. **Medical Students**

   - Learn differential diagnosis reasoning
   - Practice SOAP note writing
   - Understand clinical documentation

2. **AI/ML Students**

   - Implement RAG from scratch
   - Compare embedding models
   - Experiment with chunking strategies

3. **Software Engineers**

   - Build end-to-end AI applications
   - Integrate LLMs (OpenAI API)
   - Deploy Streamlit apps

4. **Clinical Informaticists**
   - Explore NLP for clinical text
   - Understand AI in healthcare
   - Evaluate AI safety and transparency

---

## Future Enhancements

### High Priority

1. **Medical-Specific Embeddings**

   - Switch to BioBERT or ClinicalBERT
   - Fine-tune on clinical notes
   - Improve medical synonym matching

2. **Advanced LLM Models**

   - Support GPT-4, Claude, LLaMA
   - Fine-tuned medical LLMs (Med-PaLM, BioGPT)
   - Self-hosted models (Ollama)

3. **Drug Interaction Checking**

   - Integrate drug databases (RxNorm)
   - Check contraindications
   - Alert for dangerous combinations

4. **ICD-10 Code Generation**

   - Map diagnoses to billing codes
   - Support medical coding workflow

5. **Clinical Guidelines**
   - Link diagnoses to CPGs (Clinical Practice Guidelines)
   - Suggest evidence-based treatments
   - Reference UpToDate, DynaMed

### Medium Priority

6. **Multi-Document Support**

   - Compare notes over time
   - Track disease progression
   - Summarize hospital courses

7. **EHR Integration**

   - FHIR API support
   - HL7 message parsing
   - Epic/Cerner connectors

8. **Advanced OCR**

   - Handwriting recognition
   - Table extraction (lab results)
   - PDF parsing

9. **Multi-Language**

   - Spanish, Chinese, etc.
   - Multilingual embeddings

10. **Improved UI**
    - Export to PDF/DOCX
    - Print formatting
    - Mobile responsive

### Low Priority

11. **Voice Input**

    - Speech-to-text (Whisper)
    - Dictation workflow

12. **Real-Time Collaboration**

    - Multi-user editing
    - Comments and annotations

13. **Analytics Dashboard**

    - Track diagnosis patterns
    - Quality metrics

14. **API Service**

    - REST API for integration
    - Webhook support

15. **HIPAA Compliance**
    - Encryption at rest/transit
    - Audit logging
    - PHI de-identification

### Research Directions

16. **Active Learning**

    - User feedback loops
    - Model fine-tuning

17. **Explainable AI**

    - Attention visualization
    - Counterfactual analysis

18. **Uncertainty Quantification**

    - Confidence intervals
    - Epistemic vs aleatoric uncertainty

19. **Causal Reasoning**

    - Disease causal graphs
    - Intervention simulation

20. **Federated Learning**
    - Multi-hospital training
    - Privacy-preserving ML

---

## Conclusion

The **Clinical Co-Pilot** demonstrates how Retrieval-Augmented Generation (RAG) can be applied to clinical decision support, combining the power of large language models with the safety and transparency of evidence-based reasoning.

### Key Achievements

✅ **Lightweight**: 500MB install (vs 3.5GB with transformers)  
✅ **Functional**: Full RAG pipeline (chunking → embedding → retrieval → LLM → SOAP)  
✅ **Transparent**: Evidence traceability linking diagnoses to source text  
✅ **Generic**: Handles 15+ clinical conditions (not just meningitis demo)  
✅ **Validated**: FAISS retrieval tested and working correctly  
✅ **Documented**: Comprehensive README, QUICKSTART, and this file

### Lessons Learned

1. **RAG > Pure LLM**: Grounding in source documents prevents hallucination
2. **Two-Step Reasoning**: Separating fact extraction from diagnosis improves accuracy
3. **Pattern Matching Works**: For common cases, simple keywords + rules are effective
4. **Evidence Matters**: Clinicians need to verify AI reasoning (transparency critical)
5. **Lightweight Possible**: Don't need 3GB transformers for proof-of-concept

### Final Thoughts

While this project is **NOT for clinical use** (educational/research only), it showcases the potential of AI in healthcare. With proper validation, integration with EHRs, and clinical oversight, RAG-based systems could assist clinicians by:

- Reducing documentation burden
- Catching missed diagnoses
- Suggesting evidence-based treatments
- Improving patient safety

The future of AI in medicine is **human-AI collaboration**, not replacement. Tools like this can augment clinical decision-making, but the final responsibility always rests with the healthcare provider.

---

## Appendix: Quick Reference

### Commands

```powershell
# Setup
.\start.ps1                              # Auto-setup
python -m venv .venv                     # Create venv
.\.venv\Scripts\Activate.ps1             # Activate
pip install -r requirements.txt          # Install deps

# Run
streamlit run hackathon.py               # Standard
& ".\.venv\Scripts\python.exe" -m streamlit run hackathon.py  # Direct

# Check
.\check_system.ps1                       # Verify system
python -c "import streamlit; print(streamlit.__version__)"  # Check install
```

### File Paths

| File                       | Purpose          |
| -------------------------- | ---------------- |
| `hackathon.py`             | Main application |
| `requirements.txt`         | Dependencies     |
| `.env`                     | Configuration    |
| `README.md`                | Setup guide      |
| `QUICKSTART.md`            | 3-step start     |
| `PROJECT_DOCUMENTATION.md` | This file        |

### Code Locations

| Feature           | Lines in hackathon.py |
| ----------------- | --------------------- |
| OCR               | 51-90                 |
| Section Detection | 91-127                |
| FAISS Indexing    | 128-166               |
| OpenAI LLM        | 168-186               |
| Local Stub LLM    | 188-428               |
| Chunk Extraction  | 194-210               |
| DDx Generation    | 216-330               |
| Fact Extraction   | 332-428               |
| Chunking          | 444-478               |
| RAG Pipeline      | 480-540               |
| Streamlit UI      | 540-710               |

### Configuration

| Variable          | Default             | Purpose          |
| ----------------- | ------------------- | ---------------- |
| `LLM_MODE`        | `local_stub`        | LLM type         |
| `EMBEDDING_MODEL` | `all-mpnet-base-v2` | Embedding model  |
| `TOP_K_RETRIEVAL` | `5`                 | Chunks retrieved |
| `CHUNK_SIZE`      | `1500`              | Chars per chunk  |
| `OPENAI_MODEL`    | `gpt-4o-mini`       | GPT model        |
| `TESSERACT_PATH`  | (system path)       | OCR binary       |

### Chunk ID Format

```
{doc_id}_{section}_{sequence}_{uuid}

Examples:
0_HISTORY OF PRESENT I_1_c5516063
0_LABS_2_d4a2f891
0_PHYSICAL EXAM_1_e8b3c492
```

### SOAP Format

```
S: Subjective (chief complaint, symptoms)
O: Objective (vitals, exam, labs)
A: Assessment (diagnoses, confidence)
P: Plan (diagnostic workup, treatment, follow-up)
```

### Evidence Traceability

```
Diagnosis → Rationale → [evidence: chunk_id] → Chunk → Section → Original Text
```

---

**Document Version**: 1.0  
**Last Updated**: November 1, 2025  
**Author**: Clinical Co-Pilot Development Team  
**License**: Educational/Research Use Only

**For Questions or Contributions**: [GitHub Repository - Kodi006/IIIT_HACKATHON]

---

_This project is part of the IIIT Hackathon initiative to explore AI applications in healthcare. It is intended solely for educational and research purposes. Do NOT use for actual clinical decision-making._
