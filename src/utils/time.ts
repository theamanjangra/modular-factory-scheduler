// utils/time.ts
import { Timestamp } from 'firebase-admin/firestore';

export const toDate = (v: any): Date => {
  if (!v) return new Date(NaN);
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v === 'object' && typeof v._seconds === 'number') return new Date(v._seconds * 1000);
  return new Date(v);
};

export const startOfDayUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0,0,0,0));
export const endOfDayUTC   = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23,59,59,999));

export const rangesOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart <= bEnd && aEnd >= bStart;

export const toMillis = (d: any) => toDate(d).getTime();
