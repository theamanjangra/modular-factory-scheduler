import { Request, Response, Router } from 'express';
import { SchedulingAdapterService, ExternalSchedulingInput } from '../services/schedulingAdapterService';

export class SchedulingController {
    public router = Router();
    private adapterService = new SchedulingAdapterService();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/run', this.runSchedule);
        this.router.post('/simulate', this.runSimulation);
        this.router.get('/health', this.checkDb);
    }

    public runSchedule = async (req: Request, res: Response) => {
        try {
            // Validate input structure loosely (TS will handle some, but runtime checks are good)
            const input: ExternalSchedulingInput = req.body;

            if (!input.shifts || !Array.isArray(input.shifts)) {
                res.status(400).json({ error: "Invalid payload: 'shifts' array is required." });
                return;
            }
            if (!input.tasks || !Array.isArray(input.tasks)) {
                res.status(400).json({ error: "Invalid payload: 'tasks' array is required." });
                return;
            }
            if (!input.startDate || !input.endDate) {
                res.status(400).json({ error: "Invalid payload: startDate and endDate are required." });
                return;
            }

            const result = await this.adapterService.run(input);
            res.status(200).json(result);
        } catch (error) {
            console.error("[SchedulingController] Error running schedule:", error);
            res.status(500).json({
                error: "Scheduling failed",
                details: error instanceof Error ? error.message : "Unknown error"
            });
        }
    };

    public runSimulation = async (req: Request, res: Response) => {
        try {
            console.log("[SchedulingController] Triggering Simulation...");
            const result = await this.adapterService.simulateFromDB();
            res.status(200).json(result);
        } catch (error) {
            console.error("[SchedulingController] Simulation failed:", error);
            res.status(500).json({
                error: "Simulation failed",
                details: error instanceof Error ? error.message : "Unknown error"
            });
        }
    };
}
