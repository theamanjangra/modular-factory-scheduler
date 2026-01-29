export const doesIntervalOverlap = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
    return start1 < end2 && start2 < end1;
};

export const getOverlap = (start1: Date, end1: Date, start2: Date, end2: Date): { start: Date, end: Date } | null => {
    const start = start1 > start2 ? start1 : start2;
    const end = end1 < end2 ? end1 : end2;
    if (start < end) {
        return { start, end };
    }
    return null;
};

export const parseDate = (d: string | Date): Date => {
    return new Date(d);
};
