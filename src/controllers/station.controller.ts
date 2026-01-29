import { Request, Response } from "express";

import { v4 as uuidv4 } from "uuid";
import {
  createStation,
  deleteStation,
  getAllStations,
  getStationById,
  updateStation,
  UpdateStationOrder,
  stationsCounts,
} from "../queries/station.query";

// Create Station
export const createStationController = async (req: Request, res: Response) => {
  try {
    const {
      name,
      doesReceiveTravelers,
      canReceiveMultipleTravelers,
      inspectionAreaId,
    } = req.body;
    const id = uuidv4();
    const totalStations = stationsCounts();
    const order = (await totalStations) + 1;

    const station = await createStation({
      id,
      name,
      order,
      doesReceiveTravelers,
      canReceiveMultipleTravelers,
      inspectionAreaId,
    });

    res.status(201).json({
      success: true,
      message: "Station created successfully",
      data: station,
    });
  } catch (error: any) {
    console.error("Create station error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get All stations
export const getAllStationsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const stations = await getAllStations();
    res.status(200).json({
      success: true,
      data: { stations: stations },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get Single station
export const getStationByIDController = async (req: Request, res: Response) => {
  try {
    const station = await getStationById(req.params.id);
    if (!station) return res.status(404).json({ message: "Not found" });
    res.status(201).json({ success: true, data: station });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update Station
export const updateStationController = async (req: Request, res: Response) => {
  try {
    const station = await updateStation(req.params.id, req.body);
    res.status(201).json({
      success: true,
      message: "Station updated successfully",
      data: station,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

interface Station {
  id: string;
  order: number;
}

export const updateStationOrderController = async (
  req: Request,
  res: Response
) => {
  const {id} = req.params;
  const { oldOrder, newOrder } = req.body;

  const list: Station[] = await getAllStations();
  const updates: { id: string; order: number }[] = [];

  let between: Station[] = [];

  if (oldOrder < newOrder) {
    between = list.filter(
      (x: Station) => x.order > oldOrder && x.order <= newOrder
    );
    between.forEach((x: Station) =>
      updates.push({ id: x.id, order: x.order - 1 })
    );
  } else {
    between = list.filter(
      (x: Station) => x.order >= newOrder && x.order < oldOrder
    );
    between.forEach((x: Station) =>
      updates.push({ id: x.id, order: x.order + 1 })
    );
  }
  updates.push({ id, order: newOrder });
  try {
    await Promise.all(
      updates.map((item) => UpdateStationOrder(item.id, item.order))
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reorder Station" });
  }
};

// Delete Station
export const deleteStationController = async (req: Request, res: Response) => {
  try {
    await deleteStation(req.params.id);
    res.status(200).json({
      success: true,
      message: "Station deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
