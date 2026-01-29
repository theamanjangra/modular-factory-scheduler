const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const NoteType = {
  approval: "approval",
  rejection: "rejection",
  photoOnly: "photoOnly",
  move: "move",
  moveRequest: "moveRequest",
  normal: "normal",
}
exports.NoteType = NoteType;

const TaskStatus = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
}
exports.TaskStatus = TaskStatus;

const WorkerRole = {
  worker: "worker",
  lead: "lead",
  qam: "qam",
  supervisor: "supervisor",
  admin: "admin",
}
exports.WorkerRole = WorkerRole;

const connectorConfig = {
  connector: 'vos-web',
  service: 'vederra-dev-d4327-service',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const addNoteRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddNote', inputVars);
}
addNoteRef.operationName = 'AddNote';
exports.addNoteRef = addNoteRef;

exports.addNote = function addNote(dcOrVars, vars) {
  return executeMutation(addNoteRef(dcOrVars, vars));
};

const createTravelerTemplateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateTravelerTemplate', inputVars);
}
createTravelerTemplateRef.operationName = 'CreateTravelerTemplate';
exports.createTravelerTemplateRef = createTravelerTemplateRef;

exports.createTravelerTemplate = function createTravelerTemplate(dcOrVars, vars) {
  return executeMutation(createTravelerTemplateRef(dcOrVars, vars));
};

const createStationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStation', inputVars);
}
createStationRef.operationName = 'CreateStation';
exports.createStationRef = createStationRef;

exports.createStation = function createStation(dcOrVars, vars) {
  return executeMutation(createStationRef(dcOrVars, vars));
};

const travelerStationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'TravelerStation', inputVars);
}
travelerStationRef.operationName = 'TravelerStation';
exports.travelerStationRef = travelerStationRef;

exports.travelerStation = function travelerStation(dcOrVars, vars) {
  return executeMutation(travelerStationRef(dcOrVars, vars));
};

const travelerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'Traveler', inputVars);
}
travelerRef.operationName = 'Traveler';
exports.travelerRef = travelerRef;

exports.traveler = function traveler(dcOrVars, vars) {
  return executeMutation(travelerRef(dcOrVars, vars));
};

const getNotesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetNotes');
}
getNotesRef.operationName = 'GetNotes';
exports.getNotesRef = getNotesRef;

exports.getNotes = function getNotes(dc) {
  return executeQuery(getNotesRef(dc));
};

const getTravelerTemplatesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTravelerTemplates');
}
getTravelerTemplatesRef.operationName = 'GetTravelerTemplates';
exports.getTravelerTemplatesRef = getTravelerTemplatesRef;

exports.getTravelerTemplates = function getTravelerTemplates(dc) {
  return executeQuery(getTravelerTemplatesRef(dc));
};

const getStationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStations');
}
getStationsRef.operationName = 'GetStations';
exports.getStationsRef = getStationsRef;

exports.getStations = function getStations(dc) {
  return executeQuery(getStationsRef(dc));
};

const getStationByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStationById', inputVars);
}
getStationByIdRef.operationName = 'GetStationById';
exports.getStationByIdRef = getStationByIdRef;

exports.getStationById = function getStationById(dcOrVars, vars) {
  return executeQuery(getStationByIdRef(dcOrVars, vars));
};

const getTravelersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTravelers');
}
getTravelersRef.operationName = 'GetTravelers';
exports.getTravelersRef = getTravelersRef;

exports.getTravelers = function getTravelers(dc) {
  return executeQuery(getTravelersRef(dc));
};

const getTravelerByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTravelerById', inputVars);
}
getTravelerByIdRef.operationName = 'GetTravelerById';
exports.getTravelerByIdRef = getTravelerByIdRef;

exports.getTravelerById = function getTravelerById(dcOrVars, vars) {
  return executeQuery(getTravelerByIdRef(dcOrVars, vars));
};

const getTravelerStationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTravelerStations');
}
getTravelerStationsRef.operationName = 'GetTravelerStations';
exports.getTravelerStationsRef = getTravelerStationsRef;

exports.getTravelerStations = function getTravelerStations(dc) {
  return executeQuery(getTravelerStationsRef(dc));
};

const getTravelerStationsByTravelerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTravelerStationsByTraveler', inputVars);
}
getTravelerStationsByTravelerRef.operationName = 'GetTravelerStationsByTraveler';
exports.getTravelerStationsByTravelerRef = getTravelerStationsByTravelerRef;

exports.getTravelerStationsByTraveler = function getTravelerStationsByTraveler(dcOrVars, vars) {
  return executeQuery(getTravelerStationsByTravelerRef(dcOrVars, vars));
};

const getWorkersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetWorkers');
}
getWorkersRef.operationName = 'GetWorkers';
exports.getWorkersRef = getWorkersRef;

exports.getWorkers = function getWorkers(dc) {
  return executeQuery(getWorkersRef(dc));
};

const getWorkerTasksRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetWorkerTasks');
}
getWorkerTasksRef.operationName = 'GetWorkerTasks';
exports.getWorkerTasksRef = getWorkerTasksRef;

exports.getWorkerTasks = function getWorkerTasks(dc) {
  return executeQuery(getWorkerTasksRef(dc));
};

const getTasksRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTasks');
}
getTasksRef.operationName = 'GetTasks';
exports.getTasksRef = getTasksRef;

exports.getTasks = function getTasks(dc) {
  return executeQuery(getTasksRef(dc));
};
