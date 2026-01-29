import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const NoteType = {
  approval: "approval",
  rejection: "rejection",
  photoOnly: "photoOnly",
  move: "move",
  moveRequest: "moveRequest",
  normal: "normal",
}

export const TaskStatus = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
}

export const WorkerRole = {
  worker: "worker",
  lead: "lead",
  qam: "qam",
  supervisor: "supervisor",
  admin: "admin",
}

export const connectorConfig = {
  connector: 'vos-web',
  service: 'vederra-dev-d4327-service',
  location: 'us-central1'
};

export const addNoteRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddNote', inputVars);
}
addNoteRef.operationName = 'AddNote';

export function addNote(dcOrVars, vars) {
  return executeMutation(addNoteRef(dcOrVars, vars));
}

export const createTravelerTemplateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateTravelerTemplate', inputVars);
}
createTravelerTemplateRef.operationName = 'CreateTravelerTemplate';

export function createTravelerTemplate(dcOrVars, vars) {
  return executeMutation(createTravelerTemplateRef(dcOrVars, vars));
}

export const createStationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStation', inputVars);
}
createStationRef.operationName = 'CreateStation';

export function createStation(dcOrVars, vars) {
  return executeMutation(createStationRef(dcOrVars, vars));
}

export const travelerStationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'TravelerStation', inputVars);
}
travelerStationRef.operationName = 'TravelerStation';

export function travelerStation(dcOrVars, vars) {
  return executeMutation(travelerStationRef(dcOrVars, vars));
}

export const travelerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'Traveler', inputVars);
}
travelerRef.operationName = 'Traveler';

export function traveler(dcOrVars, vars) {
  return executeMutation(travelerRef(dcOrVars, vars));
}

export const getNotesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetNotes');
}
getNotesRef.operationName = 'GetNotes';

export function getNotes(dc) {
  return executeQuery(getNotesRef(dc));
}

export const getTravelerTemplatesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTravelerTemplates');
}
getTravelerTemplatesRef.operationName = 'GetTravelerTemplates';

export function getTravelerTemplates(dc) {
  return executeQuery(getTravelerTemplatesRef(dc));
}

export const getStationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStations');
}
getStationsRef.operationName = 'GetStations';

export function getStations(dc) {
  return executeQuery(getStationsRef(dc));
}

export const getStationByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStationById', inputVars);
}
getStationByIdRef.operationName = 'GetStationById';

export function getStationById(dcOrVars, vars) {
  return executeQuery(getStationByIdRef(dcOrVars, vars));
}

export const getTravelersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTravelers');
}
getTravelersRef.operationName = 'GetTravelers';

export function getTravelers(dc) {
  return executeQuery(getTravelersRef(dc));
}

export const getTravelerByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTravelerById', inputVars);
}
getTravelerByIdRef.operationName = 'GetTravelerById';

export function getTravelerById(dcOrVars, vars) {
  return executeQuery(getTravelerByIdRef(dcOrVars, vars));
}

export const getTravelerStationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTravelerStations');
}
getTravelerStationsRef.operationName = 'GetTravelerStations';

export function getTravelerStations(dc) {
  return executeQuery(getTravelerStationsRef(dc));
}

export const getTravelerStationsByTravelerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTravelerStationsByTraveler', inputVars);
}
getTravelerStationsByTravelerRef.operationName = 'GetTravelerStationsByTraveler';

export function getTravelerStationsByTraveler(dcOrVars, vars) {
  return executeQuery(getTravelerStationsByTravelerRef(dcOrVars, vars));
}

export const getWorkersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetWorkers');
}
getWorkersRef.operationName = 'GetWorkers';

export function getWorkers(dc) {
  return executeQuery(getWorkersRef(dc));
}

export const getWorkerTasksRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetWorkerTasks');
}
getWorkerTasksRef.operationName = 'GetWorkerTasks';

export function getWorkerTasks(dc) {
  return executeQuery(getWorkerTasksRef(dc));
}

export const getTasksRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTasks');
}
getTasksRef.operationName = 'GetTasks';

export function getTasks(dc) {
  return executeQuery(getTasksRef(dc));
}

