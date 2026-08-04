export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
  errors?: ValidationError[];
  error?: string;
  code?: number;
  user?: any;
  org?: any;
  settings?: any;
  plan?: any;
}
