// DETECTION TYPES
export type Verdict = 'AI' | 'HUMAN' | 'UNCERTAIN'
export type MediaType = 'image' | 'video' | 'audio' | 'text' | 'url'
export type ScanStatus = 'pending' | 'processing' | 'complete' | 'failed'

export interface DetectionSignal {
  name: string
  category: string
  description: string
  weight: number
  value: number
  flagged: boolean
}

export interface DetectionResult {
  verdict: Verdict
  confidence: number
  signals: DetectionSignal[]
  summary: string
  model_used: string
  processing_time?: number
  sentence_scores?: SentenceScore[]
  frame_scores?: FrameScore[]
  segment_scores?: SegmentScore[]
}

export interface SentenceScore {
  sentence: string
  ai_score: number
  index: number
}

export interface FrameScore {
  // v3 fields (NVIDIA NIM pipeline)
  frame:         number
  time_sec:      number
  ai_score:      number
  face_detected?: boolean
  // legacy fields
  frame_index?:  number
  timestamp?:    number
  confidence?:   number
  verdict?:      Verdict
}

export interface SegmentScore {
  start_sec: number
  end_sec: number
  ai_score: number
}

// DATABASE TYPES
export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  plan: 'free' | 'pro' | 'enterprise'
  scan_count: number
  monthly_scans: number
  created_at: string
  updated_at: string
}

export interface Scan {
  id: string
  user_id: string
  media_type: MediaType
  file_name: string | null
  file_url: string | null
  file_size: number | null
  source_url: string | null
  content_preview: string | null
  verdict: Verdict | null
  confidence_score: number | null
  signals: DetectionSignal[]
  metadata: Record<string, unknown>
  processing_time: number | null
  model_used: string | null
  status: ScanStatus
  error_message: string | null
  created_at: string
}

export interface ScraperSession {
  id: string
  user_id: string
  target_url: string
  domain: string | null
  screenshot_url: string | null
  page_title: string | null
  page_description: string | null
  total_assets: number
  ai_asset_count: number
  overall_ai_score: number | null
  scraped_content: ScrapedContentItem[]
  status: 'pending' | 'crawling' | 'analyzing' | 'complete' | 'failed'
  error_message: string | null
  created_at: string
}

export interface ScrapedContentItem {
  type: 'text' | 'image' | 'video' | 'audio'
  url?: string
  content?: string
  verdict: Verdict
  confidence: number
  signals: DetectionSignal[]
}

export interface ModelMetric {
  id: string
  model_name: string
  model_version: string
  media_type: string
  accuracy: number
  f1_score: number
  precision_score: number
  recall_score: number
  total_predictions: number
  correct_predictions: number
  updated_at: string
}

// API TYPES
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: { code: string; message: string; details?: unknown }
  meta?: { processing_time: number; request_id: string }
}

export interface UserStats {
  total_scans: number
  ai_detected: number
  human_detected: number
  uncertain: number
  avg_confidence: number
  image_scans: number
  video_scans: number
  audio_scans: number
  text_scans: number
}

export interface HFInferenceResponse {
  verdict: Verdict
  confidence: number
  signals: DetectionSignal[]
  summary: string
  model_used: string
  inference_time_ms: number
}
