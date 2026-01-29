/**
 * LaborCalculator Service
 *
 * Phase 2: Variable Throughput Engine
 *
 * Calculates labor hours based on box characteristics and labor ratios.
 * Formula: laborHours = characteristicValue / ratioPerHour
 *
 * Example:
 *   - Box length: 70.5 feet
 *   - Ratio: 7.12 feet per labor hour
 *   - Calculated hours: 70.5 / 7.12 = 9.9 hours
 */

import {
    BoxCharacteristics,
    CharacteristicType,
    LaborRatio,
    LaborCalculationResult,
    CharacteristicTask,
    SkillCode
} from '../types';

/**
 * Maps string characteristic names from Excel to CharacteristicType enum
 */
const CHARACTERISTIC_NAME_MAP: Record<string, CharacteristicType> = {
    'length of box': 'length',
    'length': 'length',
    'width': 'width',
    'square feet': 'squareFeet',
    'sqft': 'squareFeet',
    'number of plumbing fixtures': 'numberOfPlumbingFixtures',
    'plumbing fixtures': 'numberOfPlumbingFixtures',
    'number of j-boxes': 'numberOfJBoxes',
    'j-boxes': 'numberOfJBoxes',
    'lf of walls': 'lfOfWalls',
    'lf exterior walls': 'lfExteriorWalls',
    'lf interior walls': 'lfInteriorWalls',
    'lf of exterior walls': 'lfExteriorWalls',
    'lf of interior walls': 'lfInteriorWalls',
    'number of walls': 'numberOfWalls',
    'number of interior walls': 'numberOfWalls',
    'lf of ducting': 'lfOfDucting',
    'ducting': 'lfOfDucting',
    'lf of cabinets': 'lfOfCabinets',
    'lf of cabinets including uppers': 'lfOfCabinets',
    'roof sqft': 'roofSqft',
    'roof square footage': 'roofSqft',
    'lf of fascia': 'lfOfFascia',
    'siding sqft': 'sidingSqft',
    'number of doors': 'numberOfDoors',
    'doors': 'numberOfDoors',
    'number of windows': 'numberOfWindows',
    'windows': 'numberOfWindows',
    'sqft of vinyl flooring': 'sqftVinylFlooring',
    'sqft of vynyl flooring installed': 'sqftVinylFlooring',
    'vinyl flooring': 'sqftVinylFlooring',
    'number of appliances': 'numberOfAppliances',
    'appliances': 'numberOfAppliances',
    'number of tubs/showers': 'numberOfTubsShowers',
    'tubs/showers': 'numberOfTubsShowers'
};

export class LaborCalculator {
    private laborRatios: Map<number, LaborRatio> = new Map();
    private defaultRatios: Map<CharacteristicType, number> = new Map();

    constructor() {
        this.initializeDefaultRatios();
    }

    /**
     * Initialize default ratios based on Vederra Labor Optimization Master
     */
    private initializeDefaultRatios(): void {
        // Default ratios from time studies (units per labor hour)
        // These are fallbacks when specific task ratios aren't available
        this.defaultRatios.set('length', 7.12);           // 7.12 ft per hour
        this.defaultRatios.set('roofSqft', 28.57);        // 28.57 sqft per hour
        this.defaultRatios.set('numberOfPlumbingFixtures', 0.8);  // 0.8 fixtures per hour
        this.defaultRatios.set('numberOfJBoxes', 7.5);    // 7.5 j-boxes per hour
        this.defaultRatios.set('lfOfWalls', 12.0);        // 12 LF per hour
        this.defaultRatios.set('lfExteriorWalls', 10.0);
        this.defaultRatios.set('lfInteriorWalls', 15.0);
        this.defaultRatios.set('lfOfDucting', 12.0);
        this.defaultRatios.set('lfOfCabinets', 4.0);
        this.defaultRatios.set('numberOfDoors', 0.5);     // 0.5 doors per hour (2 hours per door)
        this.defaultRatios.set('numberOfWindows', 0.67);  // 0.67 windows per hour
        this.defaultRatios.set('sqftVinylFlooring', 25.0);
        this.defaultRatios.set('numberOfAppliances', 0.5);
        this.defaultRatios.set('numberOfTubsShowers', 0.25);
    }

    /**
     * Load labor ratios from parsed Excel data
     */
    loadRatios(ratios: LaborRatio[]): void {
        this.laborRatios.clear();
        for (const ratio of ratios) {
            this.laborRatios.set(ratio.globalTaskId, ratio);
        }
        console.log(`[LaborCalculator] Loaded ${ratios.length} labor ratios`);
    }

    /**
     * Get the ratio for a specific task
     */
    getRatioForTask(globalTaskId: number): LaborRatio | undefined {
        return this.laborRatios.get(globalTaskId);
    }

    /**
     * Parse characteristic name string to CharacteristicType
     */
    parseCharacteristicName(name: string): CharacteristicType | undefined {
        if (!name) return undefined;
        const normalized = name.toLowerCase().trim();
        return CHARACTERISTIC_NAME_MAP[normalized];
    }

    /**
     * Get characteristic value from box
     */
    getCharacteristicValue(
        box: BoxCharacteristics,
        characteristic: CharacteristicType
    ): number {
        switch (characteristic) {
            case 'length':
                return box.length;
            case 'width':
                return box.width;
            case 'squareFeet':
                return box.squareFeet;
            case 'numberOfPlumbingFixtures':
                return box.numberOfPlumbingFixtures;
            case 'numberOfJBoxes':
                return box.numberOfJBoxes;
            case 'lfExteriorWalls':
                return box.lfExteriorWalls;
            case 'lfInteriorWalls':
                return box.lfInteriorWalls;
            case 'lfOfWalls':
                // Combined: exterior + interior walls
                return box.lfExteriorWalls + box.lfInteriorWalls;
            case 'numberOfWalls':
                return box.numberOfInteriorWalls;
            case 'lfOfDucting':
                return box.lfOfDucting;
            case 'lfOfCabinets':
                return box.lfOfCabinets;
            case 'roofSqft':
                return box.roofSqft;
            case 'lfOfFascia':
                return box.lfOfFascia;
            case 'sidingSqft':
                return box.sidingSqft;
            case 'numberOfDoors':
                return box.numberOfDoors;
            case 'numberOfWindows':
                return box.numberOfWindows;
            case 'sqftVinylFlooring':
                return box.sqftVinylFlooring;
            case 'numberOfAppliances':
                return box.numberOfAppliances;
            case 'numberOfTubsShowers':
                return box.numberOfTubsShowers;
            default:
                console.warn(`[LaborCalculator] Unknown characteristic: ${characteristic}`);
                return 0;
        }
    }

    /**
     * Calculate labor hours for a task on a specific box
     *
     * Formula: laborHours = characteristicValue / ratioPerHour
     *
     * @param task - The task with linked characteristic
     * @param box - The box characteristics
     * @param productionRate - Optional throughput multiplier (default 1.0)
     * @returns Calculated labor hours or undefined if cannot calculate
     */
    calculateLaborHours(
        task: CharacteristicTask,
        box: BoxCharacteristics,
        productionRate: number = 1.0
    ): LaborCalculationResult | undefined {
        // Get the linked characteristic type
        const characteristic = task.linkedCharacteristic;
        if (!characteristic) {
            // No characteristic linked - use estimatedTotalLaborHours if available
            if (task.estimatedTotalLaborHours) {
                return {
                    taskId: task.taskId,
                    taskName: task.name || task.taskId,
                    boxSerialNumber: box.serialNumber,
                    characteristicUsed: 'length', // placeholder
                    characteristicValue: 0,
                    ratioPerHour: 0,
                    baselineHours: task.estimatedTotalLaborHours,
                    calculatedHours: task.estimatedTotalLaborHours / productionRate,
                    varianceFromBaseline: 0,
                    recommendedWorkers: task.minWorkers || 1
                };
            }
            return undefined;
        }

        // Get the characteristic value from the box
        const characteristicValue = this.getCharacteristicValue(box, characteristic);
        if (characteristicValue <= 0) {
            console.warn(`[LaborCalculator] Zero or negative characteristic value for ${characteristic}`);
            return undefined;
        }

        // Get the ratio (task-specific or default)
        let ratioPerHour: number;
        let baselineHours: number;

        const taskRatio = this.laborRatios.get(task.globalTaskId);
        if (taskRatio) {
            ratioPerHour = taskRatio.ratioPerHour;
            baselineHours = taskRatio.timeStudyHours;
        } else {
            // Use default ratio
            ratioPerHour = this.defaultRatios.get(characteristic) || 1;
            baselineHours = task.estimatedTotalLaborHours || 0;
        }

        if (ratioPerHour <= 0) {
            console.warn(`[LaborCalculator] Invalid ratio for task ${task.taskId}`);
            return undefined;
        }

        // Calculate: laborHours = characteristicValue / ratioPerHour
        const calculatedHours = characteristicValue / ratioPerHour;

        // Apply production rate (lower rate = more hours needed)
        const adjustedHours = calculatedHours / productionRate;

        // Calculate variance from baseline
        const varianceFromBaseline = baselineHours > 0
            ? ((adjustedHours - baselineHours) / baselineHours) * 100
            : 0;

        // Recommend workers based on hours and constraints
        const recommendedWorkers = this.recommendWorkerCount(
            adjustedHours,
            task.minWorkers || 1,
            task.maxWorkers || 4
        );

        return {
            taskId: task.taskId,
            taskName: task.name || task.taskId,
            boxSerialNumber: box.serialNumber,
            characteristicUsed: characteristic,
            characteristicValue,
            ratioPerHour,
            baselineHours,
            calculatedHours: adjustedHours,
            varianceFromBaseline,
            recommendedWorkers
        };
    }

    /**
     * Calculate labor hours for all tasks on a box
     */
    calculateAllTaskHours(
        tasks: CharacteristicTask[],
        box: BoxCharacteristics,
        productionRate: number = 1.0
    ): LaborCalculationResult[] {
        const results: LaborCalculationResult[] = [];

        for (const task of tasks) {
            const result = this.calculateLaborHours(task, box, productionRate);
            if (result) {
                results.push(result);
            }
        }

        return results;
    }

    /**
     * Calculate total labor hours for a box across all tasks
     */
    calculateTotalBoxHours(
        tasks: CharacteristicTask[],
        box: BoxCharacteristics,
        productionRate: number = 1.0
    ): { totalHours: number; taskBreakdown: LaborCalculationResult[] } {
        const taskBreakdown = this.calculateAllTaskHours(tasks, box, productionRate);
        const totalHours = taskBreakdown.reduce((sum, r) => sum + r.calculatedHours, 0);

        return { totalHours, taskBreakdown };
    }

    /**
     * Recommend optimal worker count based on hours and shift constraints
     */
    private recommendWorkerCount(
        hours: number,
        minWorkers: number,
        maxWorkers: number,
        targetShiftHours: number = 10
    ): number {
        // Goal: Complete task within target shift hours
        // workers = hours / targetShiftHours, clamped to min/max
        const idealWorkers = Math.ceil(hours / targetShiftHours);
        return Math.max(minWorkers, Math.min(maxWorkers, idealWorkers));
    }

    /**
     * Compare two boxes and estimate labor hour difference
     */
    compareBoxes(
        tasks: CharacteristicTask[],
        boxA: BoxCharacteristics,
        boxB: BoxCharacteristics,
        productionRate: number = 1.0
    ): {
        boxATotal: number;
        boxBTotal: number;
        difference: number;
        percentageDifference: number;
    } {
        const resultA = this.calculateTotalBoxHours(tasks, boxA, productionRate);
        const resultB = this.calculateTotalBoxHours(tasks, boxB, productionRate);

        const difference = resultB.totalHours - resultA.totalHours;
        const percentageDifference = resultA.totalHours > 0
            ? (difference / resultA.totalHours) * 100
            : 0;

        return {
            boxATotal: resultA.totalHours,
            boxBTotal: resultB.totalHours,
            difference,
            percentageDifference
        };
    }

    /**
     * Estimate completion time based on available workers
     */
    estimateCompletionTime(
        calculatedHours: number,
        availableWorkers: number,
        efficiencyFactor: number = 0.85  // 85% efficiency for parallel work
    ): number {
        if (availableWorkers <= 0) return Infinity;
        if (availableWorkers === 1) return calculatedHours;

        // Diminishing returns: Each additional worker adds less than 100% capacity
        // Formula: effectiveWorkers = 1 + (workers - 1) * efficiency
        const effectiveWorkers = 1 + (availableWorkers - 1) * efficiencyFactor;
        return calculatedHours / effectiveWorkers;
    }

    /**
     * Create a default/empty BoxCharacteristics object
     */
    static createEmptyBox(serialNumber: string): BoxCharacteristics {
        return {
            serialNumber,
            length: 0,
            width: 0,
            squareFeet: 0,
            numberOfPlumbingFixtures: 0,
            numberOfJBoxes: 0,
            lfExteriorWalls: 0,
            lfExteriorFireWall: 0,
            lfInteriorWalls: 0,
            numberOfInteriorWalls: 0,
            lfInteriorFireSoundWalls: 0,
            lfOfDucting: 0,
            lfOfCabinets: 0,
            roofSqft: 0,
            lfOfFascia: 0,
            sidingSqft: 0,
            numberOfDoors: 0,
            numberOfWindows: 0,
            sqftVinylFlooring: 0,
            numberOfAppliances: 0,
            numberOfTubsShowers: 0
        };
    }

    /**
     * Create a sample box for testing (based on Time Study serial 51501)
     */
    static createSampleBox(): BoxCharacteristics {
        return {
            serialNumber: '51501',
            length: 70.5,
            width: 14,
            squareFeet: 987,
            numberOfPlumbingFixtures: 8,
            numberOfJBoxes: 45,
            lfExteriorWalls: 130,
            lfExteriorFireWall: 0,
            lfInteriorWalls: 85,
            numberOfInteriorWalls: 6,
            lfInteriorFireSoundWalls: 20,
            lfOfDucting: 120,
            lfOfCabinets: 35,
            roofSqft: 800,
            lfOfFascia: 60,
            sidingSqft: 650,
            numberOfDoors: 6,
            numberOfWindows: 12,
            sqftVinylFlooring: 400,
            numberOfAppliances: 4,
            numberOfTubsShowers: 2
        };
    }
}

// Export singleton instance
export const laborCalculator = new LaborCalculator();
