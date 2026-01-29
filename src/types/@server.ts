export type LeadType =
  | "closeup"
  | "drywall"
  | "electrical"
  | "exterior"
  | "floors"
  | "hvac"
  | "insulation"
  | "interior"
  | "office"
  | "paint"
  | "plumbing"
  | "roofing"
  | "shipping"
  | "walls";

export interface User {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: number;
  name: string;
  email?: string | null;
  crews: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Timelog {
  id: number;
  employeeId: number;
  employee?: Employee;
  startTime: Date;
  endTime: Date;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: number;
  name: String;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  firstname: string;
  lastname: string;
  role: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email?: string;
  crews: string[];
}

export enum PTOstatus {
  Pending,
  Approved,
  Rejected,
}

export interface CreatePtoRequest {
  employeeId: string;
  employeeName: string;
  ptoType: string;
  ptoStatus: PTOstatus;
  ptoHours: number;
  ptoNotes: string;
  startDate: Date;
  endDate: Date;
}

export interface CreateTimelogRequest {
  employeeId: number;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface CreateProjectRequest {
  projectId: number;
  name?: string;
}
export interface CreateModuleProfileRequest {
  project_Id: string;
  id: string;
  name?: string;
}

export interface TimelogFilters {
  start?: string;
  end?: string;
  employee_id?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
