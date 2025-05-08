export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}