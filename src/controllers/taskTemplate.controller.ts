import {
  createTaskTemplate,
  deleteTaskTemplate,
  getAllTaskTemplates,
  getTaskTemplateById,
  TaskTemplateInput,
  updateTaskTemplateOrder,
  getTaskTemplatesGroupedByStation,
  updateTaskTemplate,
  countTaskTemplate,
} from "./../queries/taskTemplate.query";
import { Request, Response } from "express";

import { v4 as uuidv4 } from "uuid";

// Create Task Template
export const createTaskTemplateController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = uuidv4();
    const { stationId } = req.body;
    const order = (await countTaskTemplate(stationId)) + 1;
    const input = { ...req.body, id, order };

    const taskTemplate = await createTaskTemplate(input);

    res.status(201).json({
      success: true,
      message: "Task Template created successfully",
      data: taskTemplate,
    });
  } catch (error: any) {
    console.error("Create task template error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// Get All Task Templates
export const getAllTaskTemplatesController = async (
  _req: Request,
  res: Response
) => {
  try {
    const taskTemplates = await getAllTaskTemplates();
    res.status(201).json(taskTemplates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Single Task Template
export const getTaskTemplateByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const taskTemplate = await getTaskTemplateById(req.params.id);
    if (!taskTemplate) return res.status(404).json({ message: "Not found" });
    res.status(201).json({ success: true, data: taskTemplate });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update Task Template
export const updateTaskTemplateController = async (
  req: Request,
  res: Response
) => {
  try {
    const station = await updateTaskTemplate(req.params.id, req.body);
    res.status(201).json({
      success: true,
      message: "Template updated successfully",
      data: station,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllTaskTemplatesGroupedController = async (
  _req: Request,
  res: Response
) => {
  try {
    const taskTemplates = await getTaskTemplatesGroupedByStation();
    res.status(201).json(taskTemplates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

interface TaskTemplate {
  id: string;
  order: number;
}

export const updateTaskTemplateOrderController = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { oldOrder, newOrder } = req.body;

  const grouped = (await getTaskTemplatesGroupedByStation()) as Record<
    string,
    TaskTemplate[]
  >;

  // 👇 Flatten all station groups into one array
  const list: TaskTemplate[] = Object.values(grouped).flat();

  const updates: { id: string; order: number }[] = [];
  let between: TaskTemplate[] = [];

  if (oldOrder < newOrder) {
    between = list.filter((x) => x.order > oldOrder && x.order <= newOrder);

    between.forEach((x) => updates.push({ id: x.id, order: x.order - 1 }));
  } else {
    between = list.filter((x) => x.order >= newOrder && x.order < oldOrder);

    between.forEach((x) => updates.push({ id: x.id, order: x.order + 1 }));
  }

  updates.push({ id, order: newOrder });

  try {
    await Promise.all(
      updates.map((item) => updateTaskTemplateOrder(item.id, item.order))
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reorder Station" });
  }
};

// export const updateStationOrderController = async (
//   req: Request,
//   res: Response
// ) => {
//   const {id} = req.params;
//   const { oldOrder, newOrder } = req.body;

//   const list: TaskTemplate[] = await getTaskTemplatesGroupedByStation();
//   const updates: { id: string; order: number }[] = [];

//   let between: TaskTemplate[] = [];

//   if (oldOrder < newOrder) {
//     between = list.filter(
//       (x: TaskTemplate) => x.order > oldOrder && x.order <= newOrder
//     );
//     between.forEach((x: TaskTemplate) =>
//       updates.push({ id: x.id, order: x.order - 1 })
//     );
//   } else {
//     between = list.filter(
//       (x: TaskTemplate) => x.order >= newOrder && x.order < oldOrder
//     );
//     between.forEach((x: TaskTemplate) =>
//       updates.push({ id: x.id, order: x.order + 1 })
//     );
//   }
//   updates.push({ id, order: newOrder });
//   try {
//     await Promise.all(
//       updates.map((item) => updateTaskTemplateOrder(item.id, item.order))
//     );

//     res.json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to reorder Station" });
//   }
// };

// Delete Task Template

export const deleteTaskTemplateController = async (
  req: Request,
  res: Response
) => {
  try {
    const taskTemplate = await deleteTaskTemplate(req.params.id);
    res.status(204).json({
      success: true,
      message: "Template deleted successfully",
      data: taskTemplate,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
