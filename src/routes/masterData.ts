import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/master/shifts
 * List all shifts
 */
router.get('/shifts', async (req: Request, res: Response) => {
    try {
        const shifts = await prisma.shift.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { workers: true }
                }
            }
        });
        res.json({ success: true, data: shifts });
    } catch (error) {
        console.error('Error fetching shifts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch shifts' });
    }
});

/**
 * GET /api/v1/master/departments
 * List all departments
 */
router.get('/departments', async (req: Request, res: Response) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { taskTemplates: true, workerDepartments: true }
                }
            }
        });
        res.json({ success: true, data: departments });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch departments' });
    }
});

/**
 * GET /api/v1/master/module-profiles
 * List all module profiles
 */
router.get('/module-profiles', async (req: Request, res: Response) => {
    try {
        const profiles = await prisma.moduleProfile.findMany({
            orderBy: { name: 'asc' },
            include: {
                project: true,
                _count: {
                    select: { moduleCharacteristics: true, modules: true }
                }
            }
        });
        res.json({ success: true, data: profiles });
    } catch (error) {
        console.error('Error fetching module profiles:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch module profiles' });
    }
});

/**
 * GET /api/v1/master/module-profiles/:id
 * Get a module profile with all characteristics and attributes
 */
router.get('/module-profiles/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
        const id = req.params.id;
        const profile = await prisma.moduleProfile.findUnique({
            where: { id },
            include: {
                project: true,
                moduleCharacteristics: true,
                moduleProfileModuleAttributes: {
                    include: {
                        moduleAttribute: true
                    }
                }
            }
        });
        if (!profile) {
            return res.status(404).json({ success: false, error: 'Module profile not found' });
        }
        res.json({ success: true, data: profile });
    } catch (error) {
        console.error('Error fetching module profile:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch module profile' });
    }
});

/**
 * GET /api/v1/master/traveler-templates
 * List all traveler templates
 */
router.get('/traveler-templates', async (req: Request, res: Response) => {
    try {
        const templates = await prisma.travelerTemplate.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: {
                        travelers: true,
                        travelerTemplateTaskTemplates: true
                    }
                }
            }
        });
        res.json({ success: true, data: templates });
    } catch (error) {
        console.error('Error fetching traveler templates:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch traveler templates' });
    }
});

/**
 * GET /api/v1/master/traveler-templates/:id
 * Get a traveler template with all task templates
 */
router.get('/traveler-templates/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
        const id = req.params.id;
        const template = await prisma.travelerTemplate.findUnique({
            where: { id },
            include: {
                travelerTemplateTaskTemplates: {
                    include: {
                        taskTemplate: {
                            include: {
                                department: true,
                                station: true
                            }
                        }
                    }
                }
            }
        });
        if (!template) {
            return res.status(404).json({ success: false, error: 'Traveler template not found' });
        }
        res.json({ success: true, data: template });
    } catch (error) {
        console.error('Error fetching traveler template:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch traveler template' });
    }
});

/**
 * GET /api/v1/master/task-templates
 * List all task templates with optional filtering
 */
router.get('/task-templates', async (req: Request, res: Response) => {
    try {
        const { departmentId, stationId } = req.query;

        const where: any = {};
        if (departmentId) where.departmentId = departmentId as string;
        if (stationId) where.stationId = stationId as string;

        const taskTemplates = await prisma.taskTemplate.findMany({
            where,
            orderBy: { order: 'asc' },
            include: {
                department: true,
                station: true,
                _count: {
                    select: { tasks: true, timeStudies: true }
                }
            }
        });
        res.json({ success: true, data: taskTemplates });
    } catch (error) {
        console.error('Error fetching task templates:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch task templates' });
    }
});

/**
 * GET /api/v1/master/workers
 * List all workers with optional filtering
 */
router.get('/workers', async (req: Request, res: Response) => {
    try {
        const { shiftId, departmentId, stationId } = req.query;

        const where: any = {};
        if (shiftId) where.shiftId = shiftId as string;
        if (stationId) where.stationId = stationId as string;

        // For departmentId, we need to filter through workerDepartments
        let workers;
        if (departmentId) {
            workers = await prisma.worker.findMany({
                where: {
                    ...where,
                    workerDepartments: {
                        some: {
                            departmentId: departmentId as string
                        }
                    }
                },
                orderBy: { firstName: 'asc' },
                include: {
                    shift: true,
                    station: true,
                    workerDepartments: {
                        include: {
                            department: true
                        }
                    }
                }
            });
        } else {
            workers = await prisma.worker.findMany({
                where,
                orderBy: { firstName: 'asc' },
                include: {
                    shift: true,
                    station: true,
                    workerDepartments: {
                        include: {
                            department: true
                        }
                    }
                }
            });
        }

        res.json({ success: true, data: workers });
    } catch (error) {
        console.error('Error fetching workers:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch workers' });
    }
});

/**
 * GET /api/v1/master/stations
 * List all stations
 */
router.get('/stations', async (req: Request, res: Response) => {
    try {
        const stations = await prisma.station.findMany({
            orderBy: { order: 'asc' },
            include: {
                inspectionArea: true,
                _count: {
                    select: { workers: true, taskTemplates: true }
                }
            }
        });
        res.json({ success: true, data: stations });
    } catch (error) {
        console.error('Error fetching stations:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stations' });
    }
});

/**
 * GET /api/v1/master/projects
 * List all projects
 */
router.get('/projects', async (req: Request, res: Response) => {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { moduleProfiles: true }
                }
            }
        });
        res.json({ success: true, data: projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
});

/**
 * GET /api/v1/master/time-studies
 * List time studies with optional filtering
 */
router.get('/time-studies', async (req: Request, res: Response) => {
    try {
        const { taskTemplateId } = req.query;

        const where: any = {};
        if (taskTemplateId) where.taskTemplateId = taskTemplateId as string;

        const timeStudies = await prisma.timeStudy.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                taskTemplate: true,
                module: true
            },
            take: 100 // Limit results
        });
        res.json({ success: true, data: timeStudies });
    } catch (error) {
        console.error('Error fetching time studies:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch time studies' });
    }
});

export default router;
