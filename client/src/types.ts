
export interface PlanComment {
    comment: string;
    startTime: string; // ISO
    type: 'comment';
}

export interface Assignment {
    workerId: string | null;
    workerName?: string;  // Human-readable name
    taskId: string;
    taskName?: string;
    startTime?: string; // V2 Key
    endTime?: string;   // V2 Key
    startDate?: string; // V1 Back-compat
    endDate?: string;   // V1 Back-compat
    type?: 'assignment';
    isWaitTask?: boolean;
}

export type StrategicPlanItem = Assignment | PlanComment;

export interface UnassignedWorkerPeriod {
    workerId: string;
    startDate: string;
    endDate: string;
}

export interface UnassignedTaskPeriod {
    taskId: string;
    taskName?: string;
    startDate: string;
    endDate: string;
}

export interface PlanResponse {
    version: string;
    assignments: StrategicPlanItem[]; // The Story
    items?: Assignment[]; // Pure assignments (backup)
    unassignedWorkers?: UnassignedWorkerPeriod[];
    unassignedTasks?: UnassignedTaskPeriod[];
    // Optional multi-shift extras for UI testing
    idleWorkers?: Assignment[];
    deficitTasks?: { taskId: string; deficitHours: number }[];
    taskProgress?: any[];
    rawMultiShift?: any;
    planId?: string;
    tasks?: Task[];
    workers?: Worker[];
}

// --- NEW V2 TYPES ---

export interface ShiftCompletionPreference {
    shiftCompletionPreference?: 'mustCompleteWithinShift' | 'prefersCompleteWithinShift' | 'doesNotMatter';
}

export interface Task extends ShiftCompletionPreference {
    taskId: string;
    name?: string;
    minWorkers?: number;
    maxWorkers?: number;
    requiredSkills?: string[];
    estimatedTotalLaborHours?: number;
    estimatedRemainingLaborHours?: number;
    prerequisiteTaskIds?: string[];
    earliestStartDate?: string;
    manualLaborHoursAdjustment?: number;
}

export interface Worker {
    workerId: string;
    name?: string;
    skills: string[];
    availability?: {
        startTime: string;
        endTime: string;
    };
    preferences?: { [taskName: string]: number };
}

// ============================================
// Plan Adjustment Types (KAN-405)
// ============================================

export interface TaskLaborUpdate {
    taskId: string;
    laborHoursRemaining: number;
}

export interface AdjustmentResult {
    addedWorkerTasks: Assignment[];
    removedWorkerTasks: Assignment[];
    updatedWorkerTasks: (Assignment & { previousEndDate: string })[];
    impactedTasks: {
        taskId: string;
        taskName?: string;
        status: 'EXTENDED' | 'SHORTENED' | 'REASSIGNED' | 'UNAFFECTED';
        newEndDate?: string;
        previousEndDate?: string;
    }[];
    deficitTasks?: { taskId: string; deficitHours: number; requiredSkills?: string[] }[];
    idleWorkers?: { workerId: string; availableFrom: string; workerName?: string }[];
}

export interface TaskUpdate {
    id: string; // Unique ID for React key
    taskId: string;
    laborHoursRemaining: number;
}

export interface WorkerAvailabilityUpdate {
    workerId: string;
    availability: {
        startTime: string; // ISO 8601
        endTime: string;   // ISO 8601
    };
}

export interface WorkerUpdateState {
    id: string; // React key
    workerId: string;
    startTime: string; // ISO or Time string
    endTime: string;   // ISO or Time string
    type: 'late' | 'early' | 'no-show' | 'custom';
}
