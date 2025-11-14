// TypeScript types for AI-powered suggestion system

export interface Suggestion {
  action: string;
  label: string;
  description: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  metadata: {
    pending_count?: number;
    pending_by_type?: Record<string, number>;
    [key: string]: any;
  };
}

export interface SuggestionResponse {
  success: boolean;
  suggestions: Suggestion[];
  timestamp: string;
  manager_id: string;
  fallback?: boolean;
}

export interface SuggestionRequest {
  manager_id: string;
  user_id?: string;
  message?: string;
  query?: string;
  user_info?: {
    first_name?: string;
    last_name?: string;
    department_code?: string;
    role?: string;
    [key: string]: any;
  };
}

