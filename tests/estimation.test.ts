import { computeEstimatedTotalLaborHours } from '../src/utils/estimation';
import { Task } from '../src/types';

describe('Estimation utility', () => {
    it('computes scaled estimate from time study and module attributes (with manual adjustment)', () => {
        const task: Task = {
            taskId: 'T1',
            taskTemplateAttributeIds: ['A','B'],
            moduleAttributes: [ { attributeId: 'A', value: 80 }, { attributeId: 'B', value: 13 } ],
            timeStudy: { attributes: [ { attributeId: 'A', value: 100 }, { attributeId: 'B', value: 10 } ], totalLaborHours: 20 },
            manualLaborHoursAdjustment: -1
        };

        const estimated = computeEstimatedTotalLaborHours(task);
        // Changes: A: -20%, B: +30% -> net = +5% -> 20 * 1.05 = 21 -> minus 1 manual = 20
        expect(estimated).toBeCloseTo(20, 6);
    });

    it('returns undefined when attributes mismatch the time study', () => {
        const task: Task = {
            taskId: 'T2',
            taskTemplateAttributeIds: ['A','C'],
            moduleAttributes: [ { attributeId: 'A', value: 50 }, { attributeId: 'B', value: 10 } ],
            timeStudy: { attributes: [ { attributeId: 'A', value: 100 }, { attributeId: 'B', value: 10 } ], totalLaborHours: 10 }
        };

        const estimated = computeEstimatedTotalLaborHours(task);
        expect(estimated).toBeUndefined();
    });
});
