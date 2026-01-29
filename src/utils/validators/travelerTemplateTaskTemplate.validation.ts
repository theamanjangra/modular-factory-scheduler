import * as yup from "yup";

export const createTravelerTemplateTaskTemplateSchema = yup.object({
  body: yup.object({
    taskTemplateId: yup
      .string()
      .uuid("Invalid task template ID")
      .required("Task template ID is required"),
    travelerTemplateId: yup
      .string()
      .uuid("Invalid traveler template ID")
      .required("Traveler template ID is required"),
  }),
});

export const getTravelerTemplateTaskTemplatesByTravelerIdSchema = yup.object({
  params: yup.object({
    travelerTemplateId: yup
      .string()
      .uuid("Invalid traveler template ID")
      .required("Traveler template ID is required"),
  }),
})

export const updateTravelerTemplateTaskTemplateSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Traveler template task template ID is required"),
  }),
  body: yup.object({
    taskTemplateId: yup
      .string()
      .uuid("Invalid task template ID")
      .required("Task template ID is required"),
    travelerTemplateId: yup
      .string()
      .uuid("Invalid traveler template ID")
      .required("Traveler template ID is required"),
  }),
});

export const getTravelerTemplateTaskTemplateByIdSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Traveler template task template ID is required"),
  }),
});

export const deleteTravelerTemplateTaskTemplateSchema = yup.object({
  params: yup.object({
    id: yup.string().required("Traveler template task template ID is required"),
  }),
});
