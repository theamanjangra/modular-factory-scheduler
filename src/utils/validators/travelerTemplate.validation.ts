import * as yup from "yup";

export const createTravelerTemplateSchema = yup.object({
  body: yup.object({
    name: yup.string().required("Traveler template name is required"),
  }),
});

export const getTravelerTemplateByIdSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid traveler template ID format")
      .required("Traveler template ID is required"),
  }),
});

export const updateTravelerTemplateSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid traveler template ID format")
      .required("Traveler template ID is required"),
  }),
  body: yup.object({
    name: yup.string().required("Traveler template name is required"),
  }),
});

export const deleteTravelerTemplateSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid traveler template ID format")
      .required("Traveler template ID is required"),
  }),
});
