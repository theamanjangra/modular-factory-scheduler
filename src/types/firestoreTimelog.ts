// types/firestoreTimelog.ts
import { Timestamp } from "firebase-admin/firestore";

export type FBTimestamp =
  | Timestamp
  | { _seconds: number; _nanoseconds: number }
  | Date
  | number;

export interface FirestoreLogEntry {
  id: string;
  start_date: FBTimestamp; // shift start (often midnight)
  end_date: FBTimestamp; // shift end (often midnight)
  clock_in_date: FBTimestamp; // actual clock-in
  clock_out_date: FBTimestamp; // actual clock-out
}

export interface ExtraClockTime {
  id: string;
  type: "beforeOpen" | "afterClose" | string;
  date: FBTimestamp; // when applied
  duration: number; // seconds
}

export interface UserDoc {
  document_id: string; // same as Firestore doc id in your sample
  employee_id?: string; // "0000" etc
  first_name?: string;
  last_name?: string;
  role?: string; // "worker"
  time_log?: {
    log_entries?: FirestoreLogEntry[];
    extra_clock_time?: ExtraClockTime;
  };
  auth?: {
    uid?: string;
    email?: string;
  };
}

export interface AbsentRecord {
  employee_id: string;
  first_name: string;
  last_name: string;
  document_id: string;
  absent_dates: string[];
}

export interface PaginatedAbsents {
  data: AbsentRecord[];
  totalRecords: number;
}

export interface AbsenceItem {
  ID: string;
  dateOfAbsence: string;
  lastName: string;
  firstName: string;
  isApprovedPTO: "Yes" | "No";
}

export interface TardyItem {
  ID: string;
  dateOfTardiness: string;
  lastName: string;
  firstName: string;
  clockInTime: string;
}

export interface TardyRecord {
  employee_id: string;
  tardy_date: string;
  last_name: string;
  first_name: string;
  clock_in_time: string;
}
