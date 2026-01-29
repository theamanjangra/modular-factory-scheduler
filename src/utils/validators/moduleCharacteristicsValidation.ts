import * as yup from "yup";

export const createModuleCharacteristicSchema = yup.object({
  body: yup.object({
    moduleProfileId: yup.string().required("moduleProfileId is required"),
    characteristicType: yup.string().nullable(),
    value: yup.number().nullable(),
  }),
});

export const createManyModuleCharacteristicsSchema = yup.object({
  items: yup
    .array()
    .of(
      yup.object({
        moduleProfileId: yup
          .string()
          .uuid("Invalid moduleProfileId")
          .required(),
        characteristicType: yup.string().nullable(),
        value: yup.number().nullable(),
      })
    )
    .min(1, "At least one item is required"),
});

export const updateModuleCharacteristicSchema = yup.object({
  moduleProfileId: yup.string().uuid("Invalid moduleProfileId").required(),
  characteristicType: yup.string().nullable(),
  value: yup.number().nullable(),
});

export const deleteModuleCharacteristicSchema = yup.object({
  id: yup.string().uuid("Invalid id").required(),
});
