import { SchedulingConfig } from '../types';

export interface ResolvedSchedulingConfig {
    timeStepMinutes: number;
    minAssignmentMinutes: 30 | 60 | 90;
    transitionGapMs: number;
}

export class SchedulingConfigError extends Error {
    status = 400;
    statusCode = 400;

    constructor(message: string) {
        super(message);
    }
}

const DEFAULT_TIME_STEP_MINUTES = 5;
const DEFAULT_MIN_ASSIGNMENT_MINUTES: 30 | 60 | 90 = 30;
const DEFAULT_TRANSITION_GAP_MS = 0;
const ALLOWED_MIN_ASSIGNMENT_MINUTES = new Set<number>([30, 60, 90]);

export const resolveSchedulingConfig = (
    config?: SchedulingConfig
): ResolvedSchedulingConfig => {
    const timeStepMinutes = typeof config?.timeStepMinutes === 'number'
        && Number.isFinite(config.timeStepMinutes)
        && config.timeStepMinutes > 0
        ? config.timeStepMinutes
        : DEFAULT_TIME_STEP_MINUTES;

    const minAssignmentMinutes = typeof config?.minAssignmentMinutes === 'number'
        && Number.isFinite(config.minAssignmentMinutes)
        ? config.minAssignmentMinutes
        : DEFAULT_MIN_ASSIGNMENT_MINUTES;

    if (!ALLOWED_MIN_ASSIGNMENT_MINUTES.has(minAssignmentMinutes)) {
        throw new SchedulingConfigError('minAssignmentMinutes must be one of 30, 60, or 90.');
    }

    const transitionGapMs = typeof config?.transitionGapMs === 'number'
        && Number.isFinite(config.transitionGapMs)
        && config.transitionGapMs > 0
        ? config.transitionGapMs
        : DEFAULT_TRANSITION_GAP_MS;

    return {
        timeStepMinutes,
        minAssignmentMinutes: minAssignmentMinutes as 30 | 60 | 90,
        transitionGapMs
    };
};
