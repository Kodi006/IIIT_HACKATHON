import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds for ML operations
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AnalysisRequest {
  text: string;
  llm_mode?: string;
  top_k?: number;
  use_small_embedder?: boolean;
}

export interface DiagnosisItem {
  diagnosis: string;
  confidence: 'High' | 'Medium' | 'Low';
  rationale: string;
  evidence: string[];
  workup?: string;
  red_flags?: string;
}

export interface ChunkInfo {
  chunk_id: string;
  text: string;
  section: string;
  score: number;
  doc_id?: number;
  chunk_num?: number;
}

export interface AnalysisResponse {
  soap: string;
  step1_facts: string;
  step2_ddx_raw: string;
  ddx: DiagnosisItem[] | null;
  ddx_parse_error: string | null;
  retrieved_chunks: ChunkInfo[];
  all_chunks: any[];
  processing_time: number;
}

export interface OCRResponse {
  text: string;
  success: boolean;
  error: string | null;
  processing_time: number;
}

export const clinicalAPI = {
  // Health check
  health: async () => {
    const response = await api.get('/api/health');
    return response.data;
  },

  // Analyze clinical note
  analyze: async (data: AnalysisRequest): Promise<AnalysisResponse> => {
    const response = await api.post('/api/analysis/analyze', data);
    return response.data;
  },

  // OCR
  extractText: async (imageBase64: string): Promise<OCRResponse> => {
    const response = await api.post('/api/ocr/extract', {
      image_base64: imageBase64,
    });
    return response.data;
  },
};

export default api;
