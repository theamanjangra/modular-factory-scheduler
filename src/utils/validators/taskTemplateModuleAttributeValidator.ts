import * as yup from "yup";

export const createtaskTemplateModuleAttributeSchema = yup.object({
  body: yup.object({
    taskTemplateId: yup
      .string()
      .uuid("Invalid Task Template ID ")
      .required("Task Template ID is required"),
    moduleAttributeId: yup
      .string()
      .uuid("Invalid Module Attribute ID")
      .required("Module Attribute ID is required"),
  }),
});

export const gettaskTemplateModuleAttributeIdSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid Task Template Module Attribute ID")
      .required("Task Template Module Attribute ID is required"),
  }),
});

export const updatetaskTemplateModuleAttributeSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Task Template Module Attribute ID is required"),
  }),
  body: yup.object({
    taskTemplateId: yup
      .string()
      .uuid("Invalid Task Template ID ")
      .required("Task Template ID is required"),
    moduleAttributeId: yup
      .string()
      .uuid("Invalid Module Attribute ID")
      .required("Module Attribute ID is required"),
  }),
});

export const deletetaskTemplateModuleAttributeSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Task Template Module Attribute ID is required"),
  }),
});

export const gettaskTemplateModuleAttributeByTaskTemplateIdSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Task Template ID is required"),
  }),
});
