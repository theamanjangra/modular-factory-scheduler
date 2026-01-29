/**
 * Unit Tests for SkillMatchingService (KAN-383)
 *
 * Tests the skill-based worker-task matching algorithm that:
 * - Enforces hard skill requirements (workers must have ALL required skills)
 * - Ranks workers by proficiency (lower skill ranking = better match)
 * - Uses greedy assignment by task priority
 */

import { SkillMatchingService } from '../services/skillMatchingService';
import { SkillMatchingRequest, MatchableTask, MatchableWorker } from '../types';

describe('SkillMatchingService', () => {
    let service: SkillMatchingService;

    beforeEach(() => {
        service = new SkillMatchingService();
    });

    describe('Basic Matching', () => {
        it('should match worker with exact required skills', () => {
            const request: SkillMatchingRequest = {
                tasks: [{
                    taskId: 't1',
                    name: 'Framing',
                    requiredSkills: ['A', 'K'],
                    minWorkers: 1,
                    maxWorkers: 1
                }],
                workers: [{
                    workerId: 'w1',
                    name: 'John',
                    skills: { 'A': 1, 'K': 2 }
                }]
            };

            const result = service.match(request);

            expect(result.assignments).toHaveLength(1);
            expect(result.assignments[0].workerId).toBe('w1');
            expect(result.assignments[0].taskId).toBe('t1');
            expect(result.assignments[0].skillScore).toBe(3); // 1 + 2
            expect(result.idleWorkers).toHaveLength(0);
            expect(result.deficitTasks).toHaveLength(0);
        });

        it('should NOT match worker missing required skill', () => {
            const request: SkillMatchingRequest = {
                tasks: [{
                    taskId: 't1',
                    requiredSkills: ['A', 'K'],
                    minWorkers: 1
                }],
                workers: [{
                    workerId: 'w1',
                    skills: { 'A': 1, 'B': 2 } // Missing K
                }]
            };

            const result = service.match(request);

            expect(result.assignments).toHaveLength(0);
            expect(result.idleWorkers).toHaveLength(1);
            expect(result.idleWorkers[0].reason).toBe('no_matching_skills');
            expect(result.deficitTasks).toHaveLength(1);
            expect(result.deficitTasks[0].taskId).toBe('t1');
        });

        it('should match worker with superset of required skills', () => {
            const request: SkillMatchingRequest = {
                tasks: [{
                    taskId: 't1',
                    requiredSkills: ['A'],
                    minWorkers: 1
                }],
                workers: [{
                    workerId: 'w1',
                    skills: { 'A': 1, 'B': 2, 'C': 3 } // Has A plus extras
                }]
            };

            const result = service.match(request);

            expect(result.assignments).toHaveLength(1);
            expect(result.assignments[0].workerId).toBe('w1');
        });
    });

    describe('Skill Scoring', () => {
        it('should prefer worker with lower skill score (better proficiency)', () => {
            const request: SkillMatchingRequest = {
                tasks: [{
                    taskId: 't1',
                    requiredSkills: ['A', 'K'],
                    minWorkers: 1,
                    maxWorkers: 1
                }],
                workers: [
                    { workerId: 'w1', skills: { 'A': 3, 'K': 4 } },  // Score: 7
                    { workerId: 'w2', skills: { 'A': 1, 'K': 1 } },  // Score: 2 (better)
                    { workerId: 'w3', skills: { 'A': 2, 'K': 3 } }   // Score: 5
                ]
            };

            const result = service.match(request);

            expect(result.assignments).toHaveLength(1);
            expect(result.assignments[0].workerId).toBe('w2'); // Lowest score wins
            expect(result.assignments[0].skillScore).toBe(2);
        });

        it('should calculate score only for required skills', () => {
            const request: SkillMatchingRequest = {
                tasks: [{
                    taskId: 't1',
                    requiredSkills: ['A'],
                    minWorkers: 1
                }],
                workers: [{
                    workerId: 'w1',
                    skills: { 'A': 2, 'B': 99, 'C': 99 } // B and C shouldn't affect score
                }]
            };

            const result = service.match(request);

            expect(result.assignments[0].skillScore).toBe(2); // Only A counts
        });
    });

    describe('Multiple Workers Per Task', () => {
        it('should assign up to maxWorkers', () => {
            const request: SkillMatchingRequest = {
                tasks: [{
                    taskId: 't1',
                    requiredSkills: ['A'],
                    minWorkers: 2,
                    maxWorkers: 3
                }],
                workers: [
                    { workerId: 'w1', skills: { 'A': 1 } },
                    { workerId: 'w2', skills: { 'A': 2 } },
                    { workerId: 'w3', skills: { 'A': 3 } },
                    { workerId: 'w4', skills: { 'A': 4 } }
                ]
            };

            const result = service.match(request);

            expect(result.assignments).toHaveLength(3); // maxWorkers
            expect(result.assignments.map(a => a.workerId)).toEqual(['w1', 'w2', 'w3']); // Best scores
            expect(result.idleWorkers).toHaveLength(1);
            expect(result.idleWorkers[0].workerId).toBe('w4');
            expect(result.idleWorkers[0].reason).toBe('all_tasks_filled');
        });

        it('should report deficit when cant meet minWorkers', () => {
            const request: SkillMatchingRequest = {
                tasks: [{
                    taskId: 't1',
                    name: 'Critical Task',
                    requiredSkills: ['A', 'K'],
                    minWorkers: 3,
                    maxWorkers: 5,
                    estimatedLaborHours: 10
                }],
                workers: [
                    { workerId: 'w1', skills: { 'A': 1, 'K': 1 } },
                    { workerId: 'w2', skills: { 'A': 2 } } // Missing K
                ]
            };

            const result = service.match(request);

            expect(result.assignments).toHaveLength(1); // Only w1 qualifies
            expect(result.deficitTasks).toHaveLength(1);
            expect(result.deficitTasks[0]).toEqual({
                taskId: 't1',
                taskName: 'Critical Task',
                requiredSkills: ['A', 'K'],
                minWorkersNeeded: 3,
                workersAssigned: 1,
                deficit: 2,
                estimatedLaborHours: 10
            });
        });
    });

    describe('Task Priority', () => {
        it('should process higher priority tasks first (lower number = higher priority)', () => {
            const request: SkillMatchingRequest = {
                tasks: [
                    { taskId: 'low-priority', requiredSkills: ['A'], priority: 10 },
                    { taskId: 'high-priority', requiredSkills: ['A'], priority: 1 }
                ],
                workers: [
                    { workerId: 'w1', skills: { 'A': 1 } } // Only one worker
                ]
            };

            const result = service.match(request);

            expect(result.assignments).toHaveLength(1);
            expect(result.assignments[0].taskId).toBe('high-priority'); // Gets the worker
            expect(result.deficitTasks).toHaveLength(1);
            expect(result.deficitTasks[0].taskId).toBe('low-priority');
        });

        it('should use scarcity as secondary sort (fewer eligible workers = higher priority)', () => {
            const request: SkillMatchingRequest = {
                tasks: [
                    { taskId: 'common', requiredSkills: ['A'], priority: 1 },      // All 3 workers qualify
                    { taskId: 'rare', requiredSkills: ['A', 'K'], priority: 1 }    // Only w1 qualifies
                ],
                workers: [
                    { workerId: 'w1', skills: { 'A': 1, 'K': 1 } },
                    { workerId: 'w2', skills: { 'A': 2 } },
                    { workerId: 'w3', skills: { 'A': 3 } }
                ]
            };

            const result = service.match(request);

            // Rare task should get w1 (the only one who qualifies)
            const rareAssignment = result.assignments.find(a => a.taskId === 'rare');
            expect(rareAssignment?.workerId).toBe('w1');

            // Common task gets one of the others
            const commonAssignment = result.assignments.find(a => a.taskId === 'common');
            expect(['w2', 'w3']).toContain(commonAssignment?.workerId);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty tasks array', () => {
            const result = service.match({
                tasks: [],
                workers: [{ workerId: 'w1', skills: { 'A': 1 } }]
            });

            expect(result.assignments).toHaveLength(0);
            expect(result.idleWorkers).toHaveLength(1);
            expect(result.idleWorkers[0].reason).toBe('no_tasks');
            expect(result.deficitTasks).toHaveLength(0);
        });

        it('should handle empty workers array', () => {
            const result = service.match({
                tasks: [{ taskId: 't1', requiredSkills: ['A'], minWorkers: 1 }],
                workers: []
            });

            expect(result.assignments).toHaveLength(0);
            expect(result.idleWorkers).toHaveLength(0);
            expect(result.deficitTasks).toHaveLength(1);
        });

        it('should handle task with no required skills (everyone qualifies)', () => {
            const result = service.match({
                tasks: [{ taskId: 't1', requiredSkills: [], minWorkers: 1 }],
                workers: [
                    { workerId: 'w1', skills: {} },
                    { workerId: 'w2', skills: { 'A': 1 } }
                ]
            });

            expect(result.assignments).toHaveLength(1);
            // Either worker could be assigned (both have score 0)
        });

        it('should handle worker with no skills', () => {
            const result = service.match({
                tasks: [{ taskId: 't1', requiredSkills: ['A'], minWorkers: 1 }],
                workers: [{ workerId: 'w1', skills: {} }]
            });

            expect(result.assignments).toHaveLength(0);
            expect(result.idleWorkers).toHaveLength(1);
            expect(result.idleWorkers[0].reason).toBe('no_matching_skills');
            expect(result.idleWorkers[0].availableSkills).toEqual([]);
        });

        it('should deduplicate workers with same ID', () => {
            const result = service.match({
                tasks: [{ taskId: 't1', requiredSkills: ['A'], minWorkers: 2 }],
                workers: [
                    { workerId: 'w1', skills: { 'A': 1 } },
                    { workerId: 'w1', skills: { 'A': 2 } }, // Duplicate - should be ignored
                    { workerId: 'w2', skills: { 'A': 3 } }
                ]
            });

            expect(result.stats.totalWorkers).toBe(2); // Only 2 unique workers
        });

        it('should handle minWorkers > maxWorkers gracefully', () => {
            const result = service.match({
                tasks: [{
                    taskId: 't1',
                    requiredSkills: ['A'],
                    minWorkers: 5,
                    maxWorkers: 2 // Weird but handle it
                }],
                workers: [
                    { workerId: 'w1', skills: { 'A': 1 } },
                    { workerId: 'w2', skills: { 'A': 2 } },
                    { workerId: 'w3', skills: { 'A': 3 } }
                ]
            });

            // Should normalize maxWorkers >= minWorkers
            expect(result.assignments.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Statistics', () => {
        it('should calculate correct stats', () => {
            const result = service.match({
                tasks: [
                    { taskId: 't1', requiredSkills: ['A'], minWorkers: 1 },           // Fully staffed
                    { taskId: 't2', requiredSkills: ['A', 'K'], minWorkers: 2 },      // Partially staffed (1/2)
                    { taskId: 't3', requiredSkills: ['X', 'Y', 'Z'], minWorkers: 1 }  // Unstaffed
                ],
                workers: [
                    { workerId: 'w1', skills: { 'A': 1 } },
                    { workerId: 'w2', skills: { 'A': 2, 'K': 1 } },
                    { workerId: 'w3', skills: { 'B': 1 } } // Can't match anything
                ]
            });

            expect(result.stats.totalTasks).toBe(3);
            expect(result.stats.totalWorkers).toBe(3);
            expect(result.stats.tasksFullyStaffed).toBe(1);
            expect(result.stats.tasksPartiallyStaffed).toBe(1);
            expect(result.stats.tasksUnstaffed).toBe(1);
            expect(result.stats.workersAssigned).toBe(2);
            expect(result.stats.workersIdle).toBe(1);
        });

        it('should calculate average skill score', () => {
            const result = service.match({
                tasks: [
                    { taskId: 't1', requiredSkills: ['A'], minWorkers: 1 },
                    { taskId: 't2', requiredSkills: ['A'], minWorkers: 1 }
                ],
                workers: [
                    { workerId: 'w1', skills: { 'A': 2 } },  // Score: 2
                    { workerId: 'w2', skills: { 'A': 4 } }   // Score: 4
                ]
            });

            expect(result.stats.averageSkillScore).toBe(3); // (2 + 4) / 2
        });
    });

    describe('Real-World Scenario', () => {
        it('should handle construction crew scheduling', () => {
            const tasks: MatchableTask[] = [
                {
                    taskId: 'framing',
                    name: 'Interior Framing',
                    requiredSkills: ['A', 'K'],  // Framing + Box Moving
                    minWorkers: 2,
                    maxWorkers: 4,
                    priority: 1,
                    estimatedLaborHours: 16
                },
                {
                    taskId: 'electrical',
                    name: 'Electrical Rough',
                    requiredSkills: ['V'],  // Electrical Rough
                    minWorkers: 1,
                    maxWorkers: 2,
                    priority: 2,
                    estimatedLaborHours: 8
                },
                {
                    taskId: 'drywall',
                    name: 'Drywall Hanging',
                    requiredSkills: ['E', 'K'],  // Drywall + Box Moving
                    minWorkers: 2,
                    maxWorkers: 3,
                    priority: 3,
                    estimatedLaborHours: 12
                }
            ];

            const workers: MatchableWorker[] = [
                { workerId: 'w1', name: 'Mike', skills: { 'A': 1, 'K': 2, 'E': 3 } },      // Framer, can do drywall
                { workerId: 'w2', name: 'Tom', skills: { 'A': 2, 'K': 1 } },               // Framer
                { workerId: 'w3', name: 'Sarah', skills: { 'V': 1, 'C': 2 } },             // Electrician
                { workerId: 'w4', name: 'Dan', skills: { 'E': 1, 'K': 2, 'F': 1 } },       // Drywall specialist
                { workerId: 'w5', name: 'Lisa', skills: { 'H': 1, 'G': 2 } },              // Painter (no matches)
                { workerId: 'w6', name: 'Bob', skills: { 'A': 3, 'K': 3, 'E': 2 } }        // Jack of all trades
            ];

            const result = service.match({ tasks, workers });

            // Verify framing gets priority (it's priority 1)
            const framingAssignments = result.assignments.filter(a => a.taskId === 'framing');
            expect(framingAssignments.length).toBeGreaterThanOrEqual(2);

            // Verify electrical is assigned
            const electricalAssignment = result.assignments.find(a => a.taskId === 'electrical');
            expect(electricalAssignment?.workerId).toBe('w3'); // Only Sarah can do it

            // Verify Lisa is idle (painter, no matching tasks)
            const lisaIdle = result.idleWorkers.find(w => w.workerId === 'w5');
            expect(lisaIdle).toBeDefined();
            expect(lisaIdle?.reason).toBe('no_matching_skills');

            // Check overall stats
            expect(result.stats.workersAssigned).toBeGreaterThanOrEqual(4);
            expect(result.deficitTasks.length).toBeLessThanOrEqual(1);
        });
    });
});
