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
                    select: { workers: true, taskTemplates: true }
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
 * List all module profiles with attributes count
 */
router.get('/module-profiles', async (req: Request, res: Response) => {
    try {
        const profiles = await prisma.moduleProfile.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { moduleAttributes: true }
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
 * Get a module profile with all attributes
 */
router.get('/module-profiles/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
        const id = req.params.id;
        const profile = await prisma.moduleProfile.findUnique({
            where: { id },
            include: {
                moduleAttributes: true
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
                    select: { taskTemplates: true, timeStudies: true }
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
 * Get a traveler template with all tasks and time studies
 */
router.get('/traveler-templates/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
        const id = req.params.id;
        const template = await prisma.travelerTemplate.findUnique({
            where: { id },
            include: {
                taskTemplates: {
                    include: {
                        department: true
                    },
                    orderBy: { taskName: 'asc' }
                },
                timeStudies: true
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
 * GET /api/v1/master/workers
 * List all workers with optional filtering
 */
router.get('/workers', async (req: Request, res: Response) => {
    try {
        const { shiftId, departmentId } = req.query;

        const where: any = {};
        if (shiftId) where.shiftId = shiftId as string;
        if (departmentId) where.departmentId = departmentId as string;

        const workers = await prisma.worker.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                shift: true,
                department: true
            }
        });
        res.json({ success: true, data: workers });
    } catch (error) {
        console.error('Error fetching workers:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch workers' });
    }
});

export default router;
