import { useState, useCallback } from 'react';

/**
 * Task definition for skill matching.
 * Workers must have ALL requiredSkills to be eligible.
 */
export interface MatchableTask {
    taskId: string;
    name?: string;
    requiredSkills: string[];
    minWorkers?: number;
    maxWorkers?: number;
    priority?: number;
    estimatedLaborHours?: number;
    departmentId?: string;
}

/**
 * Worker definition for skill matching.
 * Skills map skill codes to proficiency rankings (1 = best).
 */
export interface MatchableWorker {
    workerId: string;
    name?: string;
    skills: Record<string, number>;
    departmentId?: string;
}

/**
 * A successful worker-to-task assignment from skill matching.
 */
export interface SkillMatchAssignment {
    workerId: string;
    workerName?: string;
    taskId: string;
    taskName?: string;
    skillScore: number;
    matchedSkills: string[];
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

/**
 * Response from skill matching API.
 */
export interface SkillMatchingResponse {
    version: string;
    assignments: SkillMatchAssignment[];
    idleWorkers: IdleWorkerResult[];
    deficitTasks: DeficitTaskResult[];
    stats: MatchingStats;
}

interface UseSkillMatchingResult {
    result: SkillMatchingResponse | null;
    loading: boolean;
    error: string | null;
    runMatch: (tasks: MatchableTask[], workers: MatchableWorker[]) => Promise<void>;
    clearResult: () => void;
}

/**
 * Hook for calling the skill matching API endpoint.
 */
export function useSkillMatching(): UseSkillMatchingResult {
    const [result, setResult] = useState<SkillMatchingResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // API Base URL - same logic as usePlanData
    const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');

    const runMatch = useCallback(async (tasks: MatchableTask[], workers: MatchableWorker[]) => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/worker-tasks/match`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tasks, workers }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || response.statusText);
            }

            const data: SkillMatchingResponse = await response.json();
            setResult(data);
        } catch (err: any) {
            console.error('[useSkillMatching] Error:', err);
            setError(err.message || 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL]);

    const clearResult = useCallback(() => {
        setResult(null);
        setError(null);
    }, []);

    return { result, loading, error, runMatch, clearResult };
}
