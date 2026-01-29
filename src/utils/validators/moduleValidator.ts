import * as yup from "yup";

export const createModuleSchema = yup.object({
  body: yup.object({
    moduleProfileId: yup.string().required("Module Profile Id is required"),
    travelerId: yup.string().nullable(),
    travelerTemplateId: yup
      .string()
      .required("Traveler Template Id is required"),
    order: yup.number().integer().min(1).optional(),
    serialNumber: yup.string().optional(),
  }),
});

export const updateModuleSchema = yup.object({
  body: yup.object({
    module_profile_id: yup.string(),
    traveler_id: yup.string().nullable(),
    traveler_template_id: yup.string(),
    order: yup.number().integer().min(1).optional(),
    serial_number: yup.string(),
  }),
});

export const updateOrderModuleSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Station ID is required"),
  }),
  body: yup.object({
    neworder: yup.number().integer("old Order must be an integer"),
    oldOrder: yup.number().integer("old Order must be an integer"),
  }),
});

export const paramModuleSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid UUID").required("Module Id is required"),
  }),
});
