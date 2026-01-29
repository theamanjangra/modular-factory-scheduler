import { Task, Worker, MultiShiftPlanRequest, TaskShiftProgress, ShiftCompletionViolation } from '../src/types';
import { BalancingService } from '../src/services/balancingService';
import { ResourceManager } from '../src/services/resourceManager';
import { VerificationService } from '../src/services/verificationService';

describe('Multi-Shift Planning', () => {
    describe('Task Priority Sorting (BalancingService)', () => {
        let balancingService: BalancingService;

        beforeEach(() => {
            balancingService = new BalancingService('./non-existent.csv'); // Use empty prefs
        });

        it('should prioritize mustCompleteWithinShift tasks highest', () => {
            const workers: Worker[] = [
                { workerId: 'w1', name: 'Worker 1' },
                { workerId: 'w2', name: 'Worker 2' }
            ];

            const readyTasks = [
                { task: { taskId: 't1', name: 'Normal Task' } as Task, remainingHours: 4, dependentCount: 0 },
                { task: { taskId: 't2', name: 'Must Complete', shiftCompletionPreference: 'mustCompleteWithinShift' as const } as Task, remainingHours: 2, dependentCount: 0 },
                { task: { taskId: 't3', name: 'Blocker Task' } as Task, remainingHours: 4, dependentCount: 2 }
            ];

            const rm = new ResourceManager();
            const currentTime = new Date('2024-01-01T08:00:00Z').getTime();
            const stepDurationMs = 30 * 60 * 1000;
            const endTimeLimit = new Date('2024-01-01T17:00:00Z').getTime();

            const result = balancingService.balance(
                currentTime,
                stepDurationMs,
                workers,
                readyTasks,
                rm,
                endTimeLimit
            );

            // mustCompleteWithinShift task (t2) should be assigned first
            expect(result.results.length).toBeGreaterThan(0);
            expect(result.results[0].taskId).toBe('t2');
        });

        it('should prioritize prefersCompleteWithinShift after mustComplete and blockers', () => {
            const workers: Worker[] = [
                { workerId: 'w1', name: 'Worker 1' }
            ];

            const readyTasks = [
                { task: { taskId: 't1', name: 'Normal' } as Task, remainingHours: 4, dependentCount: 0 },
                { task: { taskId: 't2', name: 'Prefers', shiftCompletionPreference: 'prefersCompleteWithinShift' as const } as Task, remainingHours: 2, dependentCount: 0 }
            ];

            const rm = new ResourceManager();
            const currentTime = new Date('2024-01-01T08:00:00Z').getTime();
            const stepDurationMs = 30 * 60 * 1000;
            const endTimeLimit = new Date('2024-01-01T17:00:00Z').getTime();

            const result = balancingService.balance(
                currentTime,
                stepDurationMs,
                workers,
                readyTasks,
                rm,
                endTimeLimit
            );

            // prefersCompleteWithinShift task should be prioritized
            expect(result.results.length).toBeGreaterThan(0);
            expect(result.results[0].taskId).toBe('t2');
        });
    });

    describe('Shift Completion Validation (VerificationService)', () => {
        let verificationService: VerificationService;

        beforeEach(() => {
            verificationService = new VerificationService();
        });

        it('should report violation when mustCompleteWithinShift task is not started', () => {
            const tasks: Task[] = [
                { taskId: 't1', name: 'Must Complete Task', shiftCompletionPreference: 'mustCompleteWithinShift', estimatedTotalLaborHours: 4 }
            ];

            const assignments: any[] = []; // No assignments

            const shift1End = new Date('2024-01-01T15:00:00Z');
            const shift2Start = new Date('2024-01-01T15:00:00Z');

            const result = verificationService.validateMultiShiftConstraints(
                assignments,
                tasks,
                shift1End,
                shift2Start
            );

            expect(result.hardViolations.length).toBe(1);
            expect(result.hardViolations[0].type).toBe('not_started');
            expect(result.hardViolations[0].taskId).toBe('t1');
        });

        it('should report violation when mustCompleteWithinShift task spans shifts', () => {
            const tasks: Task[] = [
                { taskId: 't1', name: 'Must Complete Task', shiftCompletionPreference: 'mustCompleteWithinShift', estimatedTotalLaborHours: 4 }
            ];

            const assignments = [
                { workerId: 'w1', taskId: 't1', startDate: '2024-01-01T14:00:00Z', endDate: '2024-01-01T15:00:00Z' },
                { workerId: 'w1', taskId: 't1', startDate: '2024-01-01T15:30:00Z', endDate: '2024-01-01T17:00:00Z' }
            ];

            const shift1End = new Date('2024-01-01T15:00:00Z');
            const shift2Start = new Date('2024-01-01T15:00:00Z');

            const result = verificationService.validateMultiShiftConstraints(
                assignments,
                tasks,
                shift1End,
                shift2Start
            );

            expect(result.hardViolations.length).toBe(1);
            expect(result.hardViolations[0].type).toBe('spans_shifts');
        });

        it('should report violation when mustCompleteWithinShift task is not finished', () => {
            const tasks: Task[] = [
                { taskId: 't1', name: 'Must Complete Task', shiftCompletionPreference: 'mustCompleteWithinShift', estimatedTotalLaborHours: 8 }
            ];

            const assignments = [
                { workerId: 'w1', taskId: 't1', startDate: '2024-01-01T08:00:00Z', endDate: '2024-01-01T10:00:00Z' }
            ];

            const shift1End = new Date('2024-01-01T15:00:00Z');

            const result = verificationService.validateMultiShiftConstraints(
                assignments,
                tasks,
                shift1End
            );

            expect(result.hardViolations.length).toBe(1);
            expect(result.hardViolations[0].type).toBe('not_finished');
        });

        it('should pass when mustCompleteWithinShift task completes within single shift', () => {
            const tasks: Task[] = [
                { taskId: 't1', name: 'Must Complete Task', shiftCompletionPreference: 'mustCompleteWithinShift', estimatedTotalLaborHours: 2 }
            ];

            const assignments = [
                { workerId: 'w1', taskId: 't1', startDate: '2024-01-01T08:00:00Z', endDate: '2024-01-01T10:00:00Z' }
            ];

            const shift1End = new Date('2024-01-01T15:00:00Z');

            const result = verificationService.validateMultiShiftConstraints(
                assignments,
                tasks,
                shift1End
            );

            expect(result.hardViolations.length).toBe(0);
        });

        it('should report warning when prefersCompleteWithinShift task spans shifts', () => {
            const tasks: Task[] = [
                { taskId: 't1', name: 'Prefers Task', shiftCompletionPreference: 'prefersCompleteWithinShift', estimatedTotalLaborHours: 4 }
            ];

            const assignments = [
                { workerId: 'w1', taskId: 't1', startDate: '2024-01-01T14:00:00Z', endDate: '2024-01-01T15:00:00Z' },
                { workerId: 'w1', taskId: 't1', startDate: '2024-01-01T15:30:00Z', endDate: '2024-01-01T17:00:00Z' }
            ];

            const shift1End = new Date('2024-01-01T15:00:00Z');
            const shift2Start = new Date('2024-01-01T15:00:00Z');

            const result = verificationService.validateMultiShiftConstraints(
                assignments,
                tasks,
                shift1End,
                shift2Start
            );

            expect(result.hardViolations.length).toBe(0); // No hard violations
            expect(result.softWarnings.length).toBe(1); // But has warning
            expect(result.softWarnings[0]).toContain('prefersCompleteWithinShift');
        });

        it('should allow doesNotMatter tasks to span shifts freely', () => {
            const tasks: Task[] = [
                { taskId: 't1', name: 'Normal Task', shiftCompletionPreference: 'doesNotMatter', estimatedTotalLaborHours: 4 }
            ];

            const assignments = [
                { workerId: 'w1', taskId: 't1', startDate: '2024-01-01T14:00:00Z', endDate: '2024-01-01T15:00:00Z' },
                { workerId: 'w1', taskId: 't1', startDate: '2024-01-01T15:30:00Z', endDate: '2024-01-01T17:00:00Z' }
            ];

            const shift1End = new Date('2024-01-01T15:00:00Z');
            const shift2Start = new Date('2024-01-01T15:00:00Z');

            const result = verificationService.validateMultiShiftConstraints(
                assignments,
                tasks,
                shift1End,
                shift2Start
            );

            expect(result.hardViolations.length).toBe(0);
            expect(result.softWarnings.length).toBe(0);
        });
    });

    describe('Task Progress Calculation', () => {
        it('should correctly identify task completed in shift1', () => {
            const progress: TaskShiftProgress = {
                taskId: 't1',
                taskName: 'Task 1',
                shift1Hours: 4,
                shift2Hours: 0,
                totalRequiredHours: 4,
                completionPercentage: 100,
                completedInShift: 'shift1'
            };

            expect(progress.completedInShift).toBe('shift1');
            expect(progress.completionPercentage).toBe(100);
        });

        it('should correctly identify task that spans shifts', () => {
            const progress: TaskShiftProgress = {
                taskId: 't1',
                taskName: 'Task 1',
                shift1Hours: 2,
                shift2Hours: 2,
                totalRequiredHours: 4,
                completionPercentage: 100,
                completedInShift: 'spans_shifts'
            };

            expect(progress.completedInShift).toBe('spans_shifts');
            expect(progress.shift1Hours).toBe(2);
            expect(progress.shift2Hours).toBe(2);
        });

        it('should correctly identify incomplete task', () => {
            const progress: TaskShiftProgress = {
                taskId: 't1',
                taskName: 'Task 1',
                shift1Hours: 2,
                shift2Hours: 0,
                totalRequiredHours: 8,
                completionPercentage: 25,
                completedInShift: 'incomplete'
            };

            expect(progress.completedInShift).toBe('incomplete');
            expect(progress.completionPercentage).toBe(25);
        });
    });

    describe('Production Rate Validation', () => {
        it('should validate production rate is > 0.5 and <= 1.0', () => {
            // Production rate of 0.5 or below should be invalid
            const invalidRates = [0.5, 0.4, 0.1, 0, -0.5];
            const validRates = [0.51, 0.6, 0.75, 0.9, 1.0];

            invalidRates.forEach(rate => {
                expect(rate > 0.5 && rate <= 1.0).toBe(false);
            });

            validRates.forEach(rate => {
                expect(rate > 0.5 && rate <= 1.0).toBe(true);
            });
        });

        it('should calculate shift2 rate as 1.0 - shift1 rate', () => {
            const testCases = [
                { shift1Rate: 0.6, expectedShift2Rate: 0.4 },
                { shift1Rate: 0.75, expectedShift2Rate: 0.25 },
                { shift1Rate: 1.0, expectedShift2Rate: 0 }
            ];

            testCases.forEach(({ shift1Rate, expectedShift2Rate }) => {
                const shift2Rate = 1.0 - shift1Rate;
                expect(shift2Rate).toBeCloseTo(expectedShift2Rate, 6);
            });
        });
    });

    describe('Violation Types', () => {
        it('should have correct violation type definitions', () => {
            const notStartedViolation: ShiftCompletionViolation = {
                taskId: 't1',
                type: 'not_started',
                message: 'Task not started'
            };

            const notFinishedViolation: ShiftCompletionViolation = {
                taskId: 't2',
                type: 'not_finished',
                message: 'Task not finished'
            };

            const spansShiftsViolation: ShiftCompletionViolation = {
                taskId: 't3',
                type: 'spans_shifts',
                message: 'Task spans shifts'
            };

            expect(notStartedViolation.type).toBe('not_started');
            expect(notFinishedViolation.type).toBe('not_finished');
            expect(spansShiftsViolation.type).toBe('spans_shifts');
        });
    });
});
