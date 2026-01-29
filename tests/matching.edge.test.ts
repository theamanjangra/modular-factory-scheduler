import { MatchingService } from '../src/services/matchingService';
import { Worker, Task, WorkerTask } from '../src/types';

describe('MatchingService - edge cases', () => {
    const svc = new MatchingService();

    it('splits demand when supply partially overlaps (creates assignment + unassigned remainder)', () => {
        const workers: Worker[] = [{ workerId: 'W1', skills: ['General'] }];
        const tasks: Task[] = [{ taskId: 'T1', requiredSkills: ['General'] }];

        const workerTasks: WorkerTask[] = [
            // supply: W1 available 8-10
            { workerId: 'W1', taskId: null, startDate: '2025-01-01T08:00:00Z', endDate: '2025-01-01T10:00:00Z' },
            // demand: T1 unassigned 9-11
            { workerId: null, taskId: 'T1', startDate: '2025-01-01T09:00:00Z', endDate: '2025-01-01T11:00:00Z' }
        ];

        const results = svc.match(workers, tasks, workerTasks);

        // Expect an assignment for overlap 9-10
        const assigned = results.find(r => r.workerId === 'W1' && r.taskId === 'T1');
        expect(assigned).toBeDefined();
        expect(assigned!.startDate).toBe('2025-01-01T09:00:00.000Z');
        expect(assigned!.endDate).toBe('2025-01-01T10:00:00.000Z');

        // Expect an unassigned remainder from 10-11
        const unassigned = results.find(r => r.workerId === null && r.taskId === 'T1' && r.startDate === '2025-01-01T10:00:00.000Z');
        expect(unassigned).toBeDefined();
        expect(unassigned!.endDate).toBe('2025-01-01T11:00:00.000Z');
    });

    it('leaves demand unassigned when no worker has required skills', () => {
        const workers: Worker[] = [{ workerId: 'W1', skills: ['Carpentry'] }];
        const tasks: Task[] = [{ taskId: 'T1', requiredSkills: ['Plumbing'] }];

        const workerTasks: WorkerTask[] = [
            { workerId: 'W1', taskId: null, startDate: '2025-01-01T08:00:00Z', endDate: '2025-01-01T12:00:00Z' },
            { workerId: null, taskId: 'T1', startDate: '2025-01-01T09:00:00Z', endDate: '2025-01-01T11:00:00Z' }
        ];

        const results = svc.match(workers, tasks, workerTasks);

        const unassigned = results.find((r: WorkerTask) => r.workerId === null && r.taskId === 'T1');
        expect(unassigned).toBeDefined();
        expect(unassigned!.startDate).toBe('2025-01-01T09:00:00.000Z');
        expect(unassigned!.endDate).toBe('2025-01-01T11:00:00.000Z');
    });
});
