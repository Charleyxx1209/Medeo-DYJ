import { 
  ACCESS_ID, 
  ACCESS_KEY, 
  API_BASE_URL, 
  ASSET_BASE_URL 
} from '../constants';
import { 
  VideoGenerationRequest, 
  VideoGenerationResponse, 
  GenerationStatusResponse, 
  RenderResponse, 
  RenderStatusResponse 
} from '../types';

const headers = {
  'Content-Type': 'application/json',
  'One2x-Access-Id': ACCESS_ID,
  'One2x-Access-Key': ACCESS_KEY,
};

// Helper for delays
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createVideoTask = async (payload: VideoGenerationRequest): Promise<VideoGenerationResponse> => {
  const response = await fetch(`${API_BASE_URL}/videoGenerate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(err.message || `Error creating task: ${response.statusText}`);
  }
  
  return response.json();
};

export const getGenerateStatus = async (ids: string[]): Promise<GenerationStatusResponse[]> => {
  const response = await fetch(`${API_BASE_URL}/getGenerateStatus`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids }),
  });
  
  if (!response.ok) {
    throw new Error(`Error checking status: ${response.statusText}`);
  }
  
  return response.json();
};

export const triggerRender = async (id: string): Promise<RenderResponse> => {
  const response = await fetch(`${API_BASE_URL}/render`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id }),
  });
  
  if (!response.ok) {
    throw new Error(`Error triggering render: ${response.statusText}`);
  }
  
  return response.json();
};

export const getRenderStatus = async (ids: string[]): Promise<RenderStatusResponse[]> => {
  const response = await fetch(`${API_BASE_URL}/getRenderedVideos`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids }),
  });
  
  if (!response.ok) {
    throw new Error(`Error checking render status: ${response.statusText}`);
  }
  
  return response.json();
};

export const getFullAssetUrl = (relativePath: string): string => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  const base = ASSET_BASE_URL.replace(/\/$/, '');
  const path = relativePath.replace(/^\//, '');
  return `${base}/${path}`;
};