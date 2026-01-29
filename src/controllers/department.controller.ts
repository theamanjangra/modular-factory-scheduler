import { Request, Response } from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../queries/department.query";
import { v4 as uuidv4 } from "uuid";

// ✅ Create Department
export const createDepartmentController = async (
  req: Request,
  res: Response
) => {
  try {
    const { name } = req.body;
    const id = uuidv4();

    const Department = await createDepartment({ id, name });

    res.status(201).json({
      success: true,
      message: "Departments created successfully",
      data: Department,
    });
  } catch (error: any) {
    console.error("Create Departments error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get All Departments
export const getAllDepartmentsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const Departments = await getAllDepartments();
    res.status(200).json({
      success: true,
      data: Departments,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get Department by ID
export const getDepartmentByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const Department = await getDepartmentById(req.params.id);
    if (!Department) {
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    }
    res.status(200).json({ success: true, data: Department });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Update Department
export const updateDepartmentController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: "Department ID and name are required",
      });
    }

    const Department = await updateDepartment(id, { name });

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: Department,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Delete Department
export const deleteDepartmentController = async (
  req: Request,
  res: Response
) => {
  try {
    await deleteDepartment(req.params.id);
  res.status(200).json({
      success: true,
      message: "Department Deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
