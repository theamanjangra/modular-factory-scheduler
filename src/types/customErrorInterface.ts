interface CustomError extends Error {
    status?: number;
    stack?: string;
  }
  
export type { CustomError };