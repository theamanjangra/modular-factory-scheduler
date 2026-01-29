import { Request, Response } from "express";
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "../queries/project.query";
import { v4 as uuidv4 } from "uuid";

// ✅ Create Project
export const createProjectController = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const id = uuidv4();

    const project = await createProject({ id, name });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error: any) {
    console.error("Create project error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get All Projects
export const getAllProjectsController = async (_req: Request, res: Response) => {
  try {
    const projects = await getAllProjects();
    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get Project by ID
export const getProjectByIdController = async (req: Request, res: Response) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    res.status(200).json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Update Project
export const updateProjectController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: "Project ID and name are required",
      });
    }

    const project = await updateProject(id, { name });

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Delete Project
export const deleteProjectController = async (req: Request, res: Response) => {
  try {
    await deleteProject(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
