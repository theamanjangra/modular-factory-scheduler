import { Request, Response, NextFunction } from "express";
import { dataConnect } from "../config/dataConnectClient";
import {
  createModuleCharacterstics,
  DELETE_MODULE_CHARACTERISTIC,
  DELETE_MODULE_CHARACTERISTICS_BY_ID,
  getAllModuleChracterstics,
  GET_MODULE_CHARACTERISTICS_BY_ID,
  ModuleCharacteristicType,
  UPDATE_MODULE_CHARACTERISTIC,
} from "../queries/moduleCharacteristic.query";
import { v4 as uuidv4 } from "uuid";
import { ApiResponse } from "../types/@server";
import { string } from "yup";

interface moduleCharacteristicData {
  moduleProfileId: string;
  characteristicType: ModuleCharacteristicType;
  value: number;
}

export const createModuleCharacteristic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { moduleProfileId, characteristicType, value } =
      req.body as moduleCharacteristicData;
    if (!moduleProfileId) {
      return res.status(400).json({
        success: false,
        message: "moduleProfileId is required",
      });
    }

    const id = uuidv4();

    const moduleCharacteristic = await createModuleCharacterstics({
      id,
      moduleProfileId,
      characteristicType,
      value,
    });

    const response: ApiResponse = {
      success: true,
      message: "Created module characteristic successfully",
      data: moduleCharacteristic,
    };

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Create module characteristic error:", error);
    const response: ApiResponse = {
      success: false,
      message: `Create module characteristic error:${error}`,
    };
  }
};

export const createManyModuleCharacteristics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body must include a non-empty 'items' array",
      });
    }

    const itemsWithIds = items.map((item: any) => ({
      id: crypto.randomUUID(),
      moduleProfileId: item.moduleProfileId,
      characteristicType: item.characteristicType,
      value: item.value,
    }));

    const valuesString = itemsWithIds
      .map(
        (item) => `{
          id: "${item.id}",
          moduleProfileId: "${item.moduleProfileId}",
          characteristicType: ${item.characteristicType},
          value: ${item.value ?? 0}
        }`
      )
      .join(", ");

    const mutation = `
      mutation {
        moduleCharacteristic_insertMany(
          data: [${valuesString}]
        )
      }
    `;

    const result = await dataConnect.executeGraphql(mutation);

    const response: ApiResponse = {
      success: true,
      message: "Created characteristics successfully",
      data: result.data,
    };

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error inserting module characteristics:", error);
    next(error);
  }
};

export const getAllModuleCharacteristics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const result = await getAllModuleChracterstics();
    const response: ApiResponse = {
      success: true,
      message: "Get characteristics successfully",
      data: result,
    };

    res.status(201).json(response.data);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Error Get characteristics:${error}`,
    };
    res.status(200).json(response);
  }
};

export const getModuleCharacteristicsByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const profile = await GET_MODULE_CHARACTERISTICS_BY_ID(req.params.id);
    if (!profile) return res.status(404).json({ message: "Not found" });
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


export const updateModuleCharacteristic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const { characteristicType, value, moduleProfileId } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required for update",
      });
    }

    const result = await dataConnect.executeGraphql(
      UPDATE_MODULE_CHARACTERISTIC,
      {
        variables: {
          id,
          moduleProfileId,
          characteristicType: characteristicType || null,
          value: value ? parseFloat(value) : null,
        },
      }
    );

    const response: ApiResponse = {
      success: true,
      message: "Updated characteristic successfully",
      data: result.data,
    };

    res.status(200).json(response.data);
  } catch (error) {
    next(error);
  }
};

export const updateManyModuleCharacteristics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body must include an 'items' array with update data",
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.id) {
        return res.status(400).json({
          success: false,
          message: "Each item must include an 'id'",
        });
      }
    }

    // Perform updates in parallel
    const updatePromises = items.map(async (item) => {
      const mutation = `
        mutation UpdateModuleCharacteristic($id: String!, $data: ModuleCharacteristic_UpdateInput!) {
          moduleCharacteristic_update(id: $id, data: $data) {
            id
            characteristicType
            value
          }
        }
      `;

      const variables = {
        id: item.id,
        data: {
          ...(item.characteristicType && {
            characteristicType: item.characteristicType,
          }),
          ...(item.value !== undefined && { value: item.value }),
        },
      };

      return dataConnect.executeGraphql(mutation, { variables });
    });

    const results = await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: "ModuleCharacteristics updated successfully",
      data: results.map((r) => r.data),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteModuleCharacteristic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const result = await dataConnect.executeGraphql(
      DELETE_MODULE_CHARACTERISTIC,
      {
        variables: { id },
      }
    );

    const response: ApiResponse = {
      success: true,
      message: "Deleted characteristic successfully",
      data: result.data,
    };

    res.status(201).json(response.data);
  } catch (error) {
    next(error);
  }
};

export const deleteModuleCharacteristicsByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const profile = await DELETE_MODULE_CHARACTERISTICS_BY_ID(req.params.id);
    if (!profile) return res.status(404).json({ message: "Not found" });
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
