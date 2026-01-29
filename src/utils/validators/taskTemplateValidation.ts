import * as yup from "yup";

const leadTypes = [
  "closeup",
  "drywall",
  "electrical",
  "exterior",
  "floors",
  "hvac",
  "insulation",
  "interior",
  "office",
  "paint",
  "plumbing",
  "roofing",
  "shipping",
  "walls",
] as const;

const moduleCharacteristicTypes = [
  "squareFeet",
  "linearFeetExteriorWalls",
  "linearFeetInteriorWalls",
  "countInteriorWalls",
  "countToilets",
  "countSinks",
  "countWindows",
  "countExteriorDoors",
  "countInteriorDoors",
  "squareFeetExteriorCloseUp",
  "squareFeetRoofing",
  "linearFeetCabinets",
  "countElectricalTerminals",
  "linearFeetFirewall",
  "countStairs",
  "hasHvacDucting",
] as const;

const skills = [
  "framing",
  "finishCarpentry",
  "electricalTrim",
  "electricalRough",
  "plumbing",
  "drywallHanging",
  "drywallMud",
  "texture",
  "painting",
  "roofing",
  "flooring",
  "boxMoving",
  "cutting",
  "hvac",
] as const;

// ✅ Create
export const createTaskTemplateSchema = yup.object({
  body: yup.object({
    isPhotoRequired: yup.boolean().required("isPhotoRequired is required"),
    isVideoRequired: yup.boolean().required("isVideoRequired is required"),
    departmentId: yup.string().required("Department Id is required"),
    maxWorkers: yup
      .number()
      .integer("maxWorkers must be an integer")
      .required("maxWorkers is required"),
    minWorkers: yup
      .number()
      .integer("minWorkers must be an integer")
      .required("minWorkers is required"),
    name: yup.string().required("name is required"),
    order: yup.number().integer("order must be an integer"),
    rankedSkills: yup
      .array()
      .of(yup.mixed<(typeof skills)[number]>().oneOf(skills))
      .required("rankedSkills are required"),
    stationId: yup
      .string()
      .uuid("Invalid stationId")
      .required("stationId is required"),
    description: yup.string(),
    prerequisiteTaskTemplateId: yup.string().nullable(),
  }),
});

// ✅ Update
export const updateTaskTemplateSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("TaskTemplate ID is required"),
  }),
  body: yup.object({
    isPhotoRequired: yup.boolean().required(),
    isVideoRequired: yup.boolean().required(),
    departmentId: yup.string().required("Department Id is required"),
    maxWorkers: yup.number().integer().required(),
    minWorkers: yup.number().integer().required(),
    name: yup.string().required(),
    rankedSkills: yup
      .array()
      .of(yup.mixed<(typeof skills)[number]>().oneOf(skills))
      .required(),
    stationId: yup.string().uuid().required(),
    description: yup.string(),
    prerequisiteTaskTemplateId: yup.string(),
  }),
});

export const updateOrderTaskTemplateSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("TaskTemplate ID is required"),
  }),
  body: yup.object({
    oldOrder: yup.number().integer().required(),
    newOrder: yup.number().integer().required(),
  }),
});

// ✅ Get by ID
export const getTaskTemplateByIdSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("TaskTemplate ID is required"),
  }),
});

// ✅ Delete
export const deleteTaskTemplateSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("TaskTemplate ID is required"),
  }),
});
