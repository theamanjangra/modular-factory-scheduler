import * as yup from "yup";
export const PTO_STATUSES = ["pending", "approved", "rejected"] as const;
export const PTO_TYPE = [
  "sick",
  "vacation",
  "juryDuty",
  "bereavement",
  "court",
] as const;

export const updatePtoSchema = yup.object().shape({
  workerId: yup.string().optional(),
  startDate: yup.date().required("Start date is required."),
  endDate: yup
    .date()
    .required("End date is required.")
    .min(
      yup.ref("startDate"),
      "End date can't be before start date if both are provided."
    ),
  status: yup
    .string()
    .oneOf(PTO_STATUSES, `Status must be one of: ${PTO_STATUSES.join(", ")}`),
  type: yup
    .string()
    .oneOf(PTO_TYPE, `Status must be one of: ${PTO_TYPE.join(", ")}`),
  hoursRequested: yup
    .number()
    .optional()
    .min(0.1, "Hours requested must be greater than 0."),
  note: yup
    .string()
    .optional()
    .max(500, "Note must be less than 500 characters."),
});

interface UpdatePtoRequestInput {
  startDate?: Date | string;
  endDate?: Date | string;
  status?: string;
  type?: string;
  hoursRequested?: number | string;
  note?: string;
}

export const validateUpdatePTO = async (data: UpdatePtoRequestInput) => {
  try {
    return await updatePtoSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      throw new Error(`Validation failed: ${error.errors.join("; ")}`);
    }
    throw error;
  }
};

// import * as yup from "yup";
// import { CreatePtoRequest } from "../../types/@server";

// export const createPtoSchema = yup.object().shape({
//   employeeId: yup.string().required("employee Id is required"),
//   employeeName: yup
//     .string()
//     .min(2, "Name must be at least 2 characters")
//     .max(100, "Name must be less than 100 characters")
//     .required("employee Name is required"),
//   ptoType: yup.string().required("ptoType is required"),
//   ptoStatus: yup.string().required("ptoStatus is required"),
//   ptoHours: yup.number().required("passcode is required"),
//   ptoNotes: yup.string().optional(),
//   startDate: yup
//     .date()
//     .min(1, "At least one crew must be assigned")
//     .required("Crews are required"),
//   endDate: yup
//     .date()
//     .min(1, "At least one crew must be assigned")
//     .required("Crews are required"),
// });

// export const validateCreatePTO = async (data: CreatePtoRequest) => {
//   try {
//     return await createPtoSchema.validate(data, { abortEarly: false });
//   } catch (error) {
//     if (error instanceof yup.ValidationError) {
//       throw new Error(error.errors.join(", "));
//     }
//     throw error;
//   }
// };
