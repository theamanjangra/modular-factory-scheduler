import * as yup from "yup";

export const createMduleAttributeSchema = yup.object({
  body: yup.object({
    name: yup.string().required("Name is required"),
    moduleAttributeType: yup.string().required("Module Type is required"),
  }),
});

export const updateModuleAttributeSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid ID")
      .required("Module Attribute ID is required"),
  }),
  body: yup.object({
    name: yup.string().required("Name is required"),
    moduleAttributeType: yup.string().required("Module Type is required"),
  }),
});

export const deleteModuleAttributeSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid ID")
      .required("Module Attribute ID is required"),
  }),
});

export const getStationByIdSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid ID")
      .required("Module Attribute is required"),
  }),
});
