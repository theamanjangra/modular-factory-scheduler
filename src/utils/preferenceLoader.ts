import fs from 'fs';
import path from 'path';

export interface WorkerPreferences {
    [workerName: string]: {
        [taskName: string]: number;
    };
}

export function loadWorkerPreferences(filePath: string): WorkerPreferences {
    return {};
}
