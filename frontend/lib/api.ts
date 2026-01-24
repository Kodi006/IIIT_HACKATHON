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

export interface ChatMessage {
  role: string;
  content: string;
}

export interface GeneralChatResponse {
  answer: string;
  disclaimer: string;
  processing_time: number;
}

// Dashboard / History types
export interface HistoryRecord {
  id: number;
  created_at: string;
  note_preview: string;
  primary_diagnosis: string | null;
  confidence: string | null;
  processing_time: number;
  llm_mode: string;
}

export interface HistoryResponse {
  records: HistoryRecord[];
  total: number;
  skip: number;
  limit: number;
}

export interface DashboardStats {
  total_analyses: number;
  avg_processing_time: number;
  most_common_diagnosis: string | null;
  most_common_count: number;
  confidence_distribution: Record<string, number>;
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

  // General Medical Chat
  generalChat: async (
    question: string,
    chatHistory: ChatMessage[],
    llmMode: string = 'groq'
  ): Promise<GeneralChatResponse> => {
    const response = await api.post('/api/general-chat/chat', {
      question,
      chat_history: chatHistory,
      llm_mode: llmMode,
    });
    return response.data;
  },

  // Dashboard History
  getHistory: async (skip: number = 0, limit: number = 20): Promise<HistoryResponse> => {
    const response = await api.get(`/api/history?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/api/history/stats');
    return response.data;
  },

  getAnalysisById: async (id: number) => {
    const response = await api.get(`/api/history/${id}`);
    return response.data;
  },

  deleteAnalysis: async (id: number) => {
    const response = await api.delete(`/api/history/${id}`);
    return response.data;
  },
};

export default api;


