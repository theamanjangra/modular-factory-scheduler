
export interface TimelineBuffer {
    startDate: string;
    endDate: string;
    taskName: string;
    taskId: string;
    travelerId: string;
    station: string;
    departmentId: string;
    assignedWorkers: string[];
    assignedWorkerNames: string[];
    isDeficit: boolean;
    requiredSkills: string[];
}

export interface PlanResult {
    assignments: any[];
    idleWorkers: any[];
    deficitTasks: any[];
    stats: any;
    timeline: TimelineBuffer[];
}

export interface CrossDeptData {
    tasks: any[];
    workers: any[];
    departmentPlan: PlanResult;
    balancedPlan: PlanResult;
}
