const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const ModuleAttributeType = {
  number: "number",
  boolean: "boolean",
}
exports.ModuleAttributeType = ModuleAttributeType;

const TaskType = {
  default: "default",
  subassembly: "subassembly",
  nonWorker: "nonWorker",
}
exports.TaskType = TaskType;

const WorkerRole = {
  worker: "worker",
  lead: "lead",
  qam: "qam",
  supervisor: "supervisor",
  admin: "admin",
}
exports.WorkerRole = WorkerRole;

const connectorConfig = {
  connector: 'default',
  service: 'vederra-scheduler-2-service',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const upsertShiftRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertShift', inputVars);
}
upsertShiftRef.operationName = 'UpsertShift';
exports.upsertShiftRef = upsertShiftRef;

exports.upsertShift = function upsertShift(dcOrVars, vars) {
  return executeMutation(upsertShiftRef(dcOrVars, vars));
};

const upsertDepartmentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertDepartment', inputVars);
}
upsertDepartmentRef.operationName = 'UpsertDepartment';
exports.upsertDepartmentRef = upsertDepartmentRef;

exports.upsertDepartment = function upsertDepartment(dcOrVars, vars) {
  return executeMutation(upsertDepartmentRef(dcOrVars, vars));
};

const upsertModuleProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertModuleProfile', inputVars);
}
upsertModuleProfileRef.operationName = 'UpsertModuleProfile';
exports.upsertModuleProfileRef = upsertModuleProfileRef;

exports.upsertModuleProfile = function upsertModuleProfile(dcOrVars, vars) {
  return executeMutation(upsertModuleProfileRef(dcOrVars, vars));
};

const upsertTravelerTemplateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertTravelerTemplate', inputVars);
}
upsertTravelerTemplateRef.operationName = 'UpsertTravelerTemplate';
exports.upsertTravelerTemplateRef = upsertTravelerTemplateRef;

exports.upsertTravelerTemplate = function upsertTravelerTemplate(dcOrVars, vars) {
  return executeMutation(upsertTravelerTemplateRef(dcOrVars, vars));
};

const upsertStationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertStation', inputVars);
}
upsertStationRef.operationName = 'UpsertStation';
exports.upsertStationRef = upsertStationRef;

exports.upsertStation = function upsertStation(dcOrVars, vars) {
  return executeMutation(upsertStationRef(dcOrVars, vars));
};

const upsertWorkerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertWorker', inputVars);
}
upsertWorkerRef.operationName = 'UpsertWorker';
exports.upsertWorkerRef = upsertWorkerRef;

exports.upsertWorker = function upsertWorker(dcOrVars, vars) {
  return executeMutation(upsertWorkerRef(dcOrVars, vars));
};

const upsertProjectRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertProject', inputVars);
}
upsertProjectRef.operationName = 'UpsertProject';
exports.upsertProjectRef = upsertProjectRef;

exports.upsertProject = function upsertProject(dcOrVars, vars) {
  return executeMutation(upsertProjectRef(dcOrVars, vars));
};

const upsertModuleProfileWithProjectRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertModuleProfileWithProject', inputVars);
}
upsertModuleProfileWithProjectRef.operationName = 'UpsertModuleProfileWithProject';
exports.upsertModuleProfileWithProjectRef = upsertModuleProfileWithProjectRef;

exports.upsertModuleProfileWithProject = function upsertModuleProfileWithProject(dcOrVars, vars) {
  return executeMutation(upsertModuleProfileWithProjectRef(dcOrVars, vars));
};

const upsertModuleAttributeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertModuleAttribute', inputVars);
}
upsertModuleAttributeRef.operationName = 'UpsertModuleAttribute';
exports.upsertModuleAttributeRef = upsertModuleAttributeRef;

exports.upsertModuleAttribute = function upsertModuleAttribute(dcOrVars, vars) {
  return executeMutation(upsertModuleAttributeRef(dcOrVars, vars));
};

const upsertModuleProfileModuleAttributeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertModuleProfileModuleAttribute', inputVars);
}
upsertModuleProfileModuleAttributeRef.operationName = 'UpsertModuleProfileModuleAttribute';
exports.upsertModuleProfileModuleAttributeRef = upsertModuleProfileModuleAttributeRef;

exports.upsertModuleProfileModuleAttribute = function upsertModuleProfileModuleAttribute(dcOrVars, vars) {
  return executeMutation(upsertModuleProfileModuleAttributeRef(dcOrVars, vars));
};

const upsertTaskTemplateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertTaskTemplate', inputVars);
}
upsertTaskTemplateRef.operationName = 'UpsertTaskTemplate';
exports.upsertTaskTemplateRef = upsertTaskTemplateRef;

exports.upsertTaskTemplate = function upsertTaskTemplate(dcOrVars, vars) {
  return executeMutation(upsertTaskTemplateRef(dcOrVars, vars));
};

const linkTaskTemplatePrereqRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'LinkTaskTemplatePrereq', inputVars);
}
linkTaskTemplatePrereqRef.operationName = 'LinkTaskTemplatePrereq';
exports.linkTaskTemplatePrereqRef = linkTaskTemplatePrereqRef;

exports.linkTaskTemplatePrereq = function linkTaskTemplatePrereq(dcOrVars, vars) {
  return executeMutation(linkTaskTemplatePrereqRef(dcOrVars, vars));
};

const upsertTimeStudyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertTimeStudy', inputVars);
}
upsertTimeStudyRef.operationName = 'UpsertTimeStudy';
exports.upsertTimeStudyRef = upsertTimeStudyRef;

exports.upsertTimeStudy = function upsertTimeStudy(dcOrVars, vars) {
  return executeMutation(upsertTimeStudyRef(dcOrVars, vars));
};

const upsertTimeStudyModuleAttributeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertTimeStudyModuleAttribute', inputVars);
}
upsertTimeStudyModuleAttributeRef.operationName = 'UpsertTimeStudyModuleAttribute';
exports.upsertTimeStudyModuleAttributeRef = upsertTimeStudyModuleAttributeRef;

exports.upsertTimeStudyModuleAttribute = function upsertTimeStudyModuleAttribute(dcOrVars, vars) {
  return executeMutation(upsertTimeStudyModuleAttributeRef(dcOrVars, vars));
};

const listShiftsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListShifts');
}
listShiftsRef.operationName = 'ListShifts';
exports.listShiftsRef = listShiftsRef;

exports.listShifts = function listShifts(dc) {
  return executeQuery(listShiftsRef(dc));
};

const listDepartmentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDepartments');
}
listDepartmentsRef.operationName = 'ListDepartments';
exports.listDepartmentsRef = listDepartmentsRef;

exports.listDepartments = function listDepartments(dc) {
  return executeQuery(listDepartmentsRef(dc));
};

const listModuleProfilesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListModuleProfiles');
}
listModuleProfilesRef.operationName = 'ListModuleProfiles';
exports.listModuleProfilesRef = listModuleProfilesRef;

exports.listModuleProfiles = function listModuleProfiles(dc) {
  return executeQuery(listModuleProfilesRef(dc));
};

const listTravelerTemplatesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTravelerTemplates');
}
listTravelerTemplatesRef.operationName = 'ListTravelerTemplates';
exports.listTravelerTemplatesRef = listTravelerTemplatesRef;

exports.listTravelerTemplates = function listTravelerTemplates(dc) {
  return executeQuery(listTravelerTemplatesRef(dc));
};
