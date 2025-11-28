export interface VideoGenerationRequest {
  description: string;
  video_duration: string;
  canvas_ratio: string;
  ai_style?: string;
  tone_id?: string;
}

export interface VideoGenerationResponse {
  id: string; // scenario_id
  status: string;
  project_id: string;
}

export interface GenerationStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'error' | 'waiting_for_schedule';
  storyboard?: {
    id: string;
    duration: string;
    status: string;
  };
}

export interface RenderRequest {
  id: string; // scenario_id
}

export interface RenderResponse {
  id: string; // shot_id
  scenario_id: string;
  status: string;
  progress: number;
}

export interface RenderStatusResponse {
  id: string;
  scenario_id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  video_url: string;
  thumb_url: string;
  duration: number;
  resolution: string;
  file_size: number;
}

// App Internal Types
export type AppStep = 'idle' | 'creating' | 'generating' | 'rendering' | 'completed' | 'error';

export interface GenerationLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface GeneratedResult {
  videoUrl: string;
  thumbUrl: string;
  scenarioId: string;
}