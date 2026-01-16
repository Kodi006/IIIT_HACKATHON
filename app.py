import streamlit as st
from io import BytesIO
from PIL import Image

# Import from modular src
from src.config import EMBED_MODEL
from src.utils import extract_text_from_image_bytes
from src.vector_store import load_embedder
from src.rag_pipeline import generate_summary_and_ddx

########################
# UI: Streamlit app
########################

st.set_page_config(layout="wide", page_title="Clinician's Co-Pilot — Modular Demo")
st.title("Clinician's Co-Pilot — Explainable Clinical Decision Support (Modular)")

# Left column: Inputs
left, right = st.columns([0.45, 0.55])

with left:
    st.header("Input")
    input_mode = st.radio("Input type", ["Typed note", "Upload image (photo/scanned note)"])
    
    # Sample clinical note for testing
    sample_note = """CHIEF COMPLAINT: Fever, headache, and neck stiffness for 3 days.

HISTORY OF PRESENT ILLNESS:
Patient is a 35-year-old male presenting to the emergency department with a 3-day history of progressively worsening fever (up to 102.5°F), severe headache, and neck stiffness. He reports photophobia and nausea with one episode of vomiting. Denies recent head trauma, sick contacts, or travel. No similar episodes in the past.

PAST MEDICAL HISTORY:
- No significant past medical history
- No chronic medications
- No known drug allergies

PHYSICAL EXAMINATION:
- Vitals: Temp 101.8°F, HR 110 bpm, BP 128/82 mmHg, RR 18, O2 sat 98% on room air
- General: Appears ill, in moderate distress
- HEENT: Pupils equal and reactive, photophobia noted
- Neck: Positive nuchal rigidity, Kernig's and Brudzinski's signs positive
- Neurological: Alert and oriented x3, no focal neurological deficits
- Skin: No rash observed

LABORATORY:
- WBC: 15,200/μL (elevated)
- Neutrophils: 82% (elevated)
- CRP: 45 mg/L (elevated)

ASSESSMENT:
Clinical presentation highly concerning for bacterial meningitis given fever, severe headache, nuchal rigidity, and positive meningeal signs.

PLAN:
- Urgent LP for CSF analysis
- Start empiric IV antibiotics (ceftriaxone + vancomycin)
- CT head if LP delayed
- Admit to ICU for close monitoring
- Infectious disease consult"""
    
    note_text = ""
    uploaded_image_bytes = None
    if input_mode == "Typed note":
        note_text = st.text_area("Paste / type the clinical note here", value=sample_note, height=420)
    else:
        uploaded_file = st.file_uploader("Upload image (jpg/png/pdf pages)", type=["png", "jpg", "jpeg", "pdf"])
        if uploaded_file is not None:
            data = uploaded_file.read()
            if uploaded_file.type == "application/pdf":
                try:
                    img = Image.open(BytesIO(data))
                    buffered = BytesIO()
                    img.save(buffered, format="PNG")
                    uploaded_image_bytes = buffered.getvalue()
                except Exception as e:
                    st.error("PDF -> image conversion failed. Upload JPG/PNG.")
            else:
                uploaded_image_bytes = data
            if uploaded_image_bytes:
                st.image(uploaded_image_bytes, caption="Uploaded image", use_column_width=True)
                if st.button("Run OCR on uploaded image"):
                    with st.spinner("Running OCR..."):
                        extracted = extract_text_from_image_bytes(uploaded_image_bytes)
                        st.success("OCR complete.")
                        st.text_area("Extracted text", value=extracted, height=320, key="ocr_text")
                        note_text = extracted

    if "ocr_text" in st.session_state and st.session_state.get("ocr_text"):
        note_text = st.session_state.get("ocr_text")

    st.markdown("---")
    st.info("Medical Disclaimer: This is a demonstration system only.")

    analyze_btn = st.button("Analyze Clinical Note", type="primary")

with right:
    st.header("Analysis Results")
    
    if analyze_btn and note_text:
        # Load embedder
        embedder = load_embedder()
        
        with st.spinner("Analyzing note (RAG pipeline)..."):
            # Run pipeline
            result = generate_summary_and_ddx(note_text, embedder)
            
            # Display SOAP
            st.subheader("📝 Generated SOAP Note")
            st.text_area("SOAP", value=result["soap"], height=300)
            
            # Display DDx
            st.subheader("🩺 Differential Diagnoses")
            if result["ddx"]:
                st.json(result["ddx"])
            else:
                st.warning("Could not parse DDx JSON.")
                st.code(result["step2_raw"])
                
            # Evidence Traceability
            st.subheader("🔍 Evidence Traceability")
            with st.expander("View Retrieved Evidence Chunks"):
                for i, r in enumerate(result["retrieved"]):
                    st.markdown(f"**Chunk {i+1}** (Score: {r['score']:.3f})")
                    st.markdown(f"`{r['chunk_id']}`")
                    st.text(r['text'])
                    st.markdown("---")
            
            with st.expander("View Structured Extracted Facts (Step 1)"):
                st.text(result["step1"])
