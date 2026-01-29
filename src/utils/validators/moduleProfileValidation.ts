import * as yup from "yup";

export const createModuleProfileSchema = yup.object({
  body: yup.object({
    name: yup.string().required("Module profile name is required"),
    projectId: yup.string().uuid("Invalid project ID").required("Project ID is required"),
  }),
});

export const updateModuleProfileSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Module profile ID is required"),
  }),
  body: yup.object({
    name: yup.string().optional(),
    projectId: yup.string().uuid("Invalid project ID").optional(),
  }),
});

export const getModuleProfileByIdSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Module profile ID is required"),
  }),
});

export const deleteModuleProfileSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Module profile ID is required"),
  }),
});
