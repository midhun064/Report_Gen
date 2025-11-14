// API Configuration
// Handles both development (localhost) and production (nginx proxy)

const getApiBaseUrl = (): string => {
  // Check if we're in production mode
  if (import.meta.env.MODE === 'production') {
    // In production, use empty string for relative URLs (nginx handles /api and /ai proxying)
    return '';
  }
  // In development, use localhost (vite dev server has proxy configured)
  return 'http://localhost:5001';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper to construct full API URLs
export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
