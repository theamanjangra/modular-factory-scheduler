export interface Interval {
    startTime: string; // ISO 8601
    endTime: string;   // ISO 8601
}

export interface Worker {
    workerId: string;
    name: string;
    departmentId?: string; // Primary department for department-wise scheduling
    shiftPreference?: string; // Optional shift name/id preference (e.g., "shift-1", "shift-2")
    availability?: {
        startTime: string;
        endTime: string;
    } | Array<{
        startTime: string;
        endTime: string;
    }>;
    preferences?: Record<string, number>;
    skills?: string[]; // Legacy support or simplified skill list
}

export interface Task {
    taskId: string;
    name?: string;
    departmentId?: string; // Department from TaskTemplate for department-wise scheduling
    minWorkers?: number;
    maxWorkers?: number;
    estimatedTotalLaborHours?: number;
    estimatedRemainingLaborHours?: number;
    prerequisiteTaskIds?: string[]; // Inferred from requirements
    earliestStartDate?: string; // Optional constraint
    // Optional fields to support realistic time estimation
    // Module attribute values for the specific module this task will run on
    moduleAttributes?: Array<{ attributeId: string; value: number }>;
    // Attribute ids defined on the task template that are relevant to this task
    taskTemplateAttributeIds?: string[];
    // Time study data used as a baseline for scaling
    timeStudy?: {
        attributes: Array<{ attributeId: string; value: number }>;
        totalLaborHours: number;
    };
    manualLaborHoursAdjustment?: number;
    // shiftCompletionPreference enum-like string union
    shiftCompletionPreference?: 'mustCompleteWithinShift' | 'prefersCompleteWithinShift' | 'doesNotMatter';
    requiredSkills?: string[];
    taskType?: 'default' | 'subassembly' | 'nonWorker';
    nonWorkerTaskDuration?: number;
}

export interface WorkerTask {
    workerId: string | null; // null = unassigned task
    taskId: string | null;   // null = idle worker
    taskName?: string;
    startDate: string; // ISO
    endDate: string;   // ISO
    shiftId?: string;  // NEW: Track which shift this assignment belongs to
    isWaitTask?: boolean; // If true, this is a gap/wait/curing period
}

export interface SchedulingConfig {
    minAssignmentMinutes?: 30 | 60 | 90;
    timeStepMinutes?: number;
    transitionGapMs?: number;
}

export interface MatchRequest {
    workerTasks: WorkerTask[];
    workers: Worker[];
    tasks: Task[];
}

export interface PlanRequest {
    workers: Worker[];
    tasks: Task[];
    interval: {
        startTime: string;
        endTime: string;
    };
    useHistorical: boolean;
    workBudgetHours?: number;
    scheduling?: SchedulingConfig;
    enforceDepartmentMatch?: boolean; // When true, workers can only be assigned to same-department tasks
    useCrewCap?: boolean; // When true, limits crew size so each worker contributes at least 2× minAssignment of work
    preventLateJoiners?: boolean; // When true, don't assign new workers to a task past halfway with an active crew
    keepCrewTogether?: boolean; // When true, all crew members stay on a task until it's complete
}

export interface AdjustPlanPreferences {
    reassignmentPenalty?: number; // default 500
    scheduleDeviationPenalty?: number; // default reassignmentPenalty * 2
    maxReassignments?: number;
    allowCrossDept?: boolean;
    protectMidTask?: boolean;
    minTaskTimeBeforeMove?: number;
}

export interface CurrentAssignment {
    workerId: string;
    workerName?: string;
    taskId: string;
    taskName?: string;
    departmentId?: string;
    startTime?: string;
    expectedEndTime?: string;
    hoursWorkedOnTask?: number;
}

export interface TaskProgressUpdate {
    taskId: string;
    taskName?: string;
    departmentId?: string;
    previousLaborHoursRemaining: number;
    newLaborHoursRemaining: number;
    minWorkers?: number;
    maxWorkers?: number;
    requiredSkills?: string[];
}

export interface WorkerStatus {
    workerId: string;
    workerName?: string;
    departmentId?: string;
    currentTaskId?: string | null;
    canReassign?: boolean;
    estimatedFreeTime?: string;
    skills?: string[] | Record<string, number>;
}

export interface AdjustPlanRequest {
    currentTime: string;
    planVersion?: string;
    currentAssignments: CurrentAssignment[];
    taskUpdates: TaskProgressUpdate[];
    workerStatuses: WorkerStatus[];
    planningHorizon?: {
        endTime: string;
    };
    preferences?: AdjustPlanPreferences;
}

export interface Reassignment {
    workerId: string;
    workerName?: string;
    fromTaskId?: string | null;
    fromTaskName?: string;
    fromDepartment?: string;
    toTaskId: string;
    toTaskName?: string;
    toDepartment?: string;
    reason: 'deficit_coverage' | 'surplus_release' | 'skill_match' | 'idle_fill';
    effectiveTime: string;
    isCrossDept: boolean;
}

export interface NewAssignment {
    workerId: string;
    workerName?: string;
    taskId: string;
    taskName?: string;
    departmentId?: string;
    reason: 'deficit_coverage' | 'skill_match' | 'idle_fill';
    effectiveTime: string;
}

export interface ReleasedWorker {
    workerId: string;
    workerName?: string;
    fromTaskId?: string;
    fromTaskName?: string;
    fromDepartment?: string;
    reason: 'surplus_release';
    effectiveTime: string;
}

export interface RemainingDeficit {
    taskId: string;
    taskName?: string;
    hoursNeeded: number;
    workersNeeded: number;
    requiredSkills?: string[];
    reason: 'no_available_workers' | 'no_skill_match' | 'max_reassignments_reached';
}

export interface AdjustPlanSummary {
    tasksUpdated: number;
    deficitTasksCount: number;
    surplusTasksCount: number;
    workersReassigned: number;
    deficitsCovered: number;
    deficitsRemaining: number;
    totalHoursCovered: number;
    totalHoursUncovered: number;
}

export interface AdjustPlanResponse {
    assignments: WorkerTask[];
}

export interface ShiftPlanWindow {
    shiftId: string;
    productionRate?: number;
    shiftInterval: {
        start: string; // "HH:mm" or ISO string
        end: string;   // "HH:mm" or ISO string
    };
}

export interface MultiShiftPlanRequest {
    shifts: ShiftPlanWindow[];
    tasks: Task[];
    workers?: Worker[];
    enforceDepartmentMatch?: boolean;
    useCrewCap?: boolean;
    /** Two-pass scheduling: Pass 1 = hard dept constraint, Pass 2 = soft scoring for idle workers on deficit tasks */
    useTwoPassDepartmentScheduling?: boolean;
    preventLateJoiners?: boolean;
    keepCrewTogether?: boolean; // When true, all crew members stay on a task until it's complete
    /** Normalized IDs of workers currently clocked in. If set, active shifts only schedule these workers. */
    clockedInWorkerIds?: Set<string>;
}

// File-driven multi-shift request (used by UI testing flow)
export interface MultiShiftFilePlanRequest {
    startTime: string;
    endTime: string;
    startingShiftPct: number;
    endingShiftPct?: number;
    shift1Interval: {
        startTime: string;
        endTime: string;
    };
    shift2Interval?: {
        startTime: string;
        endTime: string;
    };
    tasks: Task[];
    workers: Worker[];
    scheduling?: SchedulingConfig;
}

export interface DeficitTask {
    taskId: string;
    deficitHours: number;
    requiredSkills?: string[];
}

// Multi-shift task progress tracking
export interface TaskShiftProgress {
    taskId: string;
    taskName?: string;
    shift1Hours: number; // Keep for legacy/compat or genericize? Let's genericize in V3, but for now just keep as specific fields or add dynamic map?
    // Actually, let's keep specific fields for now to avoid breaking frontend excessively, 
    // BUT we should probably add `hoursByShift: Record<string, number>` for the new UI.
    shift2Hours: number;
    hoursByShift?: Record<string, number>; // New dynamic tracking
    totalRequiredHours: number;
    completionPercentage: number;
    completedInShift: 'shift1' | 'shift2' | 'spans_shifts' | 'incomplete' | string; // Allow dynamic shift IDs
    shiftCompletionPreference?: 'mustCompleteWithinShift' | 'prefersCompleteWithinShift' | 'doesNotMatter';
}

export interface ShiftSummary {
    shiftId: string;
    totalHoursWorked: number;
    tasksCompleted: string[];
    tasksInProgress: string[];
    productionRate: number;
}

export interface ShiftCompletionViolation {
    taskId: string;
    taskName?: string;
    type: 'not_started' | 'not_finished' | 'spans_shifts';
    message: string;
}

export interface MultiShiftPlanResponse {
    assignments: WorkerTask[];
    idleWorkers: WorkerTask[];
    deficitTasks: DeficitTask[];
    taskProgress: TaskShiftProgress[];
    shiftSummaries: ShiftSummary[]; // New dynamic array
    shift1Summary?: ShiftSummary; // Deprecated but kept for compat if needed (will remove)
    shift2Summary?: ShiftSummary; // Deprecated
    violations: ShiftCompletionViolation[];
    warnings: string[];
    _plannerDiag?: any;
}

export interface AggregatedAssignment {
    workerId: string;
    taskId: string;
    taskName?: string; // Added for sorting
    startDate: string;
    endDate: string;
}

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

export interface PlanComment {
    comment: string;
    startTime: string;
    type: 'comment';
}

export type StrategicPlanItem = AggregatedAssignment | PlanComment;

export interface SimulationResult {
    assignments: AggregatedAssignment[];
    unassignedWorkers: UnassignedWorkerPeriod[];
    unassignedTasks: UnassignedTaskPeriod[];
    story: StrategicPlanItem[]; // New "God-Level" Narrative
}

// ============================================
// PHASE 2: Variable Throughput Engine Types
// ============================================

/**
 * Box/Module characteristics that affect labor hour calculations.
 * Based on Vederra Labor Optimization Master - Box Characteristics sheet.
 */
export interface BoxCharacteristics {
    serialNumber: string;
    length: number;                    // feet
    width: number;                     // feet
    squareFeet: number;
    numberOfPlumbingFixtures: number;
    numberOfJBoxes: number;
    lfExteriorWalls: number;           // Linear Feet
    lfExteriorFireWall: number;
    lfInteriorWalls: number;
    numberOfInteriorWalls: number;
    lfInteriorFireSoundWalls: number;
    lfOfDucting: number;
    lfOfCabinets: number;              // Including uppers
    roofSqft: number;
    lfOfFascia: number;
    sidingSqft: number;
    numberOfDoors: number;
    numberOfWindows: number;
    sqftVinylFlooring: number;
    numberOfAppliances: number;
    numberOfTubsShowers: number;
}

/**
 * Characteristic types that can be linked to tasks.
 * Maps to "Tie to Box Characteristic" column in Task List.
 */
export type CharacteristicType =
    | 'length'
    | 'width'
    | 'squareFeet'
    | 'numberOfPlumbingFixtures'
    | 'numberOfJBoxes'
    | 'lfExteriorWalls'
    | 'lfInteriorWalls'
    | 'lfOfWalls'                      // Combined exterior + interior
    | 'numberOfWalls'
    | 'lfOfDucting'
    | 'lfOfCabinets'
    | 'roofSqft'
    | 'lfOfFascia'
    | 'sidingSqft'
    | 'numberOfDoors'
    | 'numberOfWindows'
    | 'sqftVinylFlooring'
    | 'numberOfAppliances'
    | 'numberOfTubsShowers';

/**
 * Labor ratio entry from the Labor Ratios sheet.
 * Formula: laborHours = characteristicValue / ratioPerHour
 */
export interface LaborRatio {
    globalTaskId: number;
    taskName?: string;
    timeStudySerialNumber?: string;
    timeStudyHours: number;            // Baseline hours from time study
    numberOfWorkers: number;           // Workers used in time study
    linkedCharacteristic: CharacteristicType;
    characteristicValue: number;       // Value from time study box
    ratioPerHour: number;              // characteristic units per labor hour
}

/**
 * Cross-functional skill codes.
 * Based on Vederra Labor Optimization Master - Cross Functional Skills sheet.
 */
export type SkillCode =
    | 'A'   // Framing
    | 'B'   // Finish Carpentry
    | 'C'   // Electrical Trim
    | 'V'   // Electrical Rough
    | 'D'   // Plumbing
    | 'E'   // Drywall Hanging
    | 'F'   // Drywall Mud
    | 'G'   // Texture
    | 'H'   // Painting
    | 'I'   // Roofing
    | 'J'   // Flooring
    | 'K'   // Box Moving
    | 'L'   // Cutting
    | 'M';  // HVAC

/**
 * Skill code to human-readable name mapping
 */
export const SKILL_NAMES: Record<SkillCode, string> = {
    'A': 'Framing',
    'B': 'Finish Carpentry',
    'C': 'Electrical Trim',
    'V': 'Electrical Rough',
    'D': 'Plumbing',
    'E': 'Drywall Hanging',
    'F': 'Drywall Mud',
    'G': 'Texture',
    'H': 'Painting',
    'I': 'Roofing',
    'J': 'Flooring',
    'K': 'Box Moving',
    'L': 'Cutting',
    'M': 'HVAC'
};

/**
 * Worker with cross-functional skills.
 * Extended from base Worker interface.
 */
export interface SkilledWorker extends Worker {
    homeStation: number;
    primarySkill: SkillCode;
    isLead: boolean;
    skillRankings: Partial<Record<SkillCode, number>>;  // 1 = best, higher = less proficient
}

/**
 * Task with characteristic-based labor calculation.
 * Extended from base Task interface.
 */
export interface CharacteristicTask extends Task {
    station: number;
    taskNumber: number;
    globalTaskId: number;
    linkedCharacteristic?: CharacteristicType;
    requiredSkillCodes?: SkillCode[];  // In order of preference
    subTasks?: string[];               // Sub-task descriptions grouped under this task
}

/**
 * Result of labor hour calculation for a specific box.
 */
export interface LaborCalculationResult {
    taskId: string;
    taskName: string;
    boxSerialNumber: string;
    characteristicUsed: CharacteristicType;
    characteristicValue: number;
    ratioPerHour: number;
    baselineHours: number;             // From time study
    calculatedHours: number;           // Based on this box's characteristics
    varianceFromBaseline: number;      // Percentage difference
    recommendedWorkers: number;
}

// ============================================
// KAN-383: Inter-Department Skill Matching
// ============================================

/**
 * Request payload for skill-based worker-task matching.
 * Used by iOS app for one-time assignment (no time dimension).
 */
export interface SkillMatchingRequest {
    tasks: MatchableTask[];
    workers: MatchableWorker[];
    enforceDepartmentMatch?: boolean; // If true, workers only match tasks in same department
}

/**
 * Task definition for skill matching.
 * Workers must have ALL requiredSkills to be eligible.
 */
export interface MatchableTask {
    taskId: string;
    name?: string;
    requiredSkills: string[];          // Skill codes required (ALL must match)
    minWorkers?: number;               // Default: 1
    maxWorkers?: number;               // Default: 1
    priority?: number;                 // Lower = higher priority (default: 999)
    estimatedLaborHours?: number;      // For deficit reporting
    departmentId?: string;             // Optional for department constraints
}

/**
 * Worker definition for skill matching.
 * Skills map skill codes to proficiency rankings (1 = best).
 */
export interface MatchableWorker {
    workerId: string;
    name?: string;
    skills: Record<string, number>;    // skillCode -> ranking (1 = best, higher = less proficient)
    departmentId?: string;             // Optional department filter
}

/**
 * Response from skill matching algorithm.
 */
export interface SkillMatchingResponse {
    assignments: SkillMatchAssignment[];
    idleWorkers: IdleWorkerResult[];
    deficitTasks: DeficitTaskResult[];
    stats: MatchingStats;
}

/**
 * A successful worker-to-task assignment from skill matching.
 */
export interface SkillMatchAssignment {
    workerId: string;
    workerName?: string;
    taskId: string;
    taskName?: string;
    skillScore: number;                // Sum of skill rankings (lower = better fit)
    matchedSkills: string[];           // Skills that qualified this worker
}

/**
 * Worker who wasn't assigned to any task.
 */
export interface IdleWorkerResult {
    workerId: string;
    workerName?: string;
    reason: 'no_matching_skills' | 'all_tasks_filled' | 'no_tasks';
    availableSkills: string[];
}

/**
 * Task that couldn't meet minimum worker requirements.
 */
export interface DeficitTaskResult {
    taskId: string;
    taskName?: string;
    requiredSkills: string[];
    minWorkersNeeded: number;
    workersAssigned: number;
    deficit: number;
    estimatedLaborHours?: number;
}

/**
 * Summary statistics for the matching operation.
 */
export interface MatchingStats {
    totalTasks: number;
    totalWorkers: number;
    tasksFullyStaffed: number;
    tasksPartiallyStaffed: number;
    tasksUnstaffed: number;
    workersAssigned: number;
    workersIdle: number;
    averageSkillScore: number;
}

// ============================================
// KAN-405: Schedule Adjustment Endpoint
// ============================================

/** Simplified adjustment request */
export interface AdjustPlanSimpleRequest {
    currentTime: string; // ISO 8601
    updates: TaskLaborUpdate[];
    workerUpdates?: WorkerAvailabilityUpdate[]; // Optional worker availability overrides
    preferences?: AdjustPlanPreferences;
    scheduling?: SchedulingConfig;
    tasks?: Task[];
    workers?: Worker[];
    originalAssignments?: WorkerTask[]; // For stateless/ephemeral plans
    addedTasks?: Task[]; // New tasks to insert into plan
    removedTaskIds?: string[]; // Tasks to remove entirely
    enforceDepartmentMatch?: boolean; // When true, workers only assigned to same-department tasks
    taskInterruptionWindows?: TaskInterruptionWindow[]; // Time windows when tasks are blocked/reduced
}

/** Time window during which a task cannot be worked (or has reduced crew) */
export interface TaskInterruptionWindow {
    taskId: string;
    startDate: string;   // ISO 8601
    endDate?: string;    // null = blocked indefinitely from startDate
    maxWorkersDuringInterruption?: number; // 0/null = fully blocked, >0 = reduced crew
}

export interface TaskLaborUpdate {
    taskId: string;
    laborHoursRemaining: number;
    interpretAs?: 'total' | 'remaining'; // Default: 'total'
}

export interface WorkerAvailabilityUpdate {
    workerId: string;
    availability: {
        startTime: string; // ISO 8601
        endTime: string;   // ISO 8601
    };
}

/** Diff-based adjustment response */
export interface AdjustPlanDiffResponse {
    version: string;
    addedWorkerTasks: AddedWorkerTask[];
    removedWorkerTasks: RemovedWorkerTask[];
    updatedWorkerTasks: UpdatedWorkerTask[];
    impactedTasks: ImpactedTask[];
    deficitTasks?: DeficitTask[];
    idleWorkers?: { workerId: string; availableFrom: string }[];
}

export interface AddedWorkerTask {
    workerId: string;
    taskId: string;
    startDate: string;
    endDate: string;
}

export interface RemovedWorkerTask {
    workerId: string;
    taskId: string;
    startDate: string;
    endDate: string;
}

export interface UpdatedWorkerTask {
    workerId: string;
    taskId: string;
    startDate: string;
    endDate: string;
    previousEndDate: string;
}

export interface ImpactedTask {
    taskId: string;
    status: 'EXTENDED' | 'SHORTENED' | 'REASSIGNED' | 'UNAFFECTED';
    newEndDate?: string;
    previousEndDate?: string;
}

// ============================================
// KAN-468: Task Interruptions
// ============================================

/**
 * Reason for task interruption.
 */
export type TaskInterruptionReason = 'material' | 'equipment' | 'other';

/**
 * Task interruption - when a task cannot be worked on or has reduced crew.
 * Replaces the old Hold/Resume functionality.
 */
export interface TaskInterruption {
    id?: string;
    taskId: string;
    reason: TaskInterruptionReason;
    startDate: string;   // ISO 8601 - must be >= now
    endDate?: string;    // ISO 8601 - optional, may not know when it resolves
    maxWorkersDuringInterruption: number; // 0 = fully blocked, >0 = reduced crew
    notes?: string;
    createdAt?: string;
}

/**
 * Request to create a task interruption.
 */
export interface CreateInterruptionRequest {
    taskId: string;
    reason: TaskInterruptionReason;
    startDate?: string;  // Defaults to now if not provided
    endDate?: string;
    maxWorkersDuringInterruption?: number; // Defaults to 0
    notes?: string;
}

/**
 * Response after creating or resolving an interruption.
 */
export interface InterruptionResponse {
    interruption: TaskInterruption;
    message: string;
    affectedTaskIds: string[];
}


// ============================================
// PHASE 3: Production Plan Preview (Swift Client)
// ============================================


// ============================================
// PHASE 3: Production Plan Preview (Swift Client)
// ============================================

// ============================================
// PHASE 3: Production Plan Preview (Swift Client)
// ============================================

export interface DepartmentDto {
    id: string; // UUID
}

export interface TravelerDto {
    id: string; // UUID
}

export interface ProductionIssueDto {
    id: string; // UUID
    description?: string;
}

export interface WorkerDto {
    id: string; // UUID
    department: DepartmentDto;
    name?: string; // Optional helper
}

export interface TaskDto {
    id: string; // UUID
    department: DepartmentDto;
    traveler: TravelerDto;
    issues?: ProductionIssueDto[];
    name?: string; // Helper
    clockTime?: number; // Helper
    estimatedTotalLaborHours?: number; // Helper
}

export interface WorkerTaskDto {
    id: string; // UUID
    workerId: string | null;
    taskId: string | null;
    startDate: string; // ISO
    endDate: string;   // ISO
}

export interface DeficitTaskDto {
    id: string; // UUID
    taskId: string | null;
    deficitHours: number;
}

export interface ShiftDto {
    id: string; // UUID
    startTime: number; // TimeInterval
    endTime: number;   // TimeInterval
    weekDayOrdinal: number; // Int
}

export interface ProductionPlanDto {
    id: string; // UUID
    startDate: string;
    endDate: string;
    productionPlanShifts: ProductionPlanShiftDto[];
}

export interface ProductionPlanShiftDto {
    id: string; // UUID
    // plan: ProductionPlanDto; // Circular reference handled by client or use planId
    planId?: string;
    shift: ShiftDto;
    workerTasks: WorkerTaskDto[];
    deficitTasks: DeficitTaskDto[];
}

export interface PlanPreviewRequest {
    tasks: TaskDto[];
    productionPlanShifts: ProductionPlanShiftDto[];
    startTime: string;
    endTime: string;
}
