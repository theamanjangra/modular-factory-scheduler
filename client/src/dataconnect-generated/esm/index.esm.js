import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const ModuleAttributeType = {
  number: "number",
  boolean: "boolean",
}

export const TaskType = {
  default: "default",
  subassembly: "subassembly",
  nonWorker: "nonWorker",
}

export const WorkerRole = {
  worker: "worker",
  lead: "lead",
  qam: "qam",
  supervisor: "supervisor",
  admin: "admin",
}

export const connectorConfig = {
  connector: 'default',
  service: 'vederra-scheduler-2-service',
  location: 'us-central1'
};

export const upsertShiftRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertShift', inputVars);
}
upsertShiftRef.operationName = 'UpsertShift';

export function upsertShift(dcOrVars, vars) {
  return executeMutation(upsertShiftRef(dcOrVars, vars));
}

export const upsertDepartmentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertDepartment', inputVars);
}
upsertDepartmentRef.operationName = 'UpsertDepartment';

export function upsertDepartment(dcOrVars, vars) {
  return executeMutation(upsertDepartmentRef(dcOrVars, vars));
}

export const upsertModuleProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertModuleProfile', inputVars);
}
upsertModuleProfileRef.operationName = 'UpsertModuleProfile';

export function upsertModuleProfile(dcOrVars, vars) {
  return executeMutation(upsertModuleProfileRef(dcOrVars, vars));
}

export const upsertTravelerTemplateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertTravelerTemplate', inputVars);
}
upsertTravelerTemplateRef.operationName = 'UpsertTravelerTemplate';

export function upsertTravelerTemplate(dcOrVars, vars) {
  return executeMutation(upsertTravelerTemplateRef(dcOrVars, vars));
}

export const upsertStationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertStation', inputVars);
}
upsertStationRef.operationName = 'UpsertStation';

export function upsertStation(dcOrVars, vars) {
  return executeMutation(upsertStationRef(dcOrVars, vars));
}

export const upsertWorkerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertWorker', inputVars);
}
upsertWorkerRef.operationName = 'UpsertWorker';

export function upsertWorker(dcOrVars, vars) {
  return executeMutation(upsertWorkerRef(dcOrVars, vars));
}

export const upsertProjectRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertProject', inputVars);
}
upsertProjectRef.operationName = 'UpsertProject';

export function upsertProject(dcOrVars, vars) {
  return executeMutation(upsertProjectRef(dcOrVars, vars));
}

export const upsertModuleProfileWithProjectRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertModuleProfileWithProject', inputVars);
}
upsertModuleProfileWithProjectRef.operationName = 'UpsertModuleProfileWithProject';

export function upsertModuleProfileWithProject(dcOrVars, vars) {
  return executeMutation(upsertModuleProfileWithProjectRef(dcOrVars, vars));
}

export const upsertModuleAttributeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertModuleAttribute', inputVars);
}
upsertModuleAttributeRef.operationName = 'UpsertModuleAttribute';

export function upsertModuleAttribute(dcOrVars, vars) {
  return executeMutation(upsertModuleAttributeRef(dcOrVars, vars));
}

export const upsertModuleProfileModuleAttributeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertModuleProfileModuleAttribute', inputVars);
}
upsertModuleProfileModuleAttributeRef.operationName = 'UpsertModuleProfileModuleAttribute';

export function upsertModuleProfileModuleAttribute(dcOrVars, vars) {
  return executeMutation(upsertModuleProfileModuleAttributeRef(dcOrVars, vars));
}

export const upsertTaskTemplateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertTaskTemplate', inputVars);
}
upsertTaskTemplateRef.operationName = 'UpsertTaskTemplate';

export function upsertTaskTemplate(dcOrVars, vars) {
  return executeMutation(upsertTaskTemplateRef(dcOrVars, vars));
}

export const linkTaskTemplatePrereqRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'LinkTaskTemplatePrereq', inputVars);
}
linkTaskTemplatePrereqRef.operationName = 'LinkTaskTemplatePrereq';

export function linkTaskTemplatePrereq(dcOrVars, vars) {
  return executeMutation(linkTaskTemplatePrereqRef(dcOrVars, vars));
}

export const upsertTimeStudyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertTimeStudy', inputVars);
}
upsertTimeStudyRef.operationName = 'UpsertTimeStudy';

export function upsertTimeStudy(dcOrVars, vars) {
  return executeMutation(upsertTimeStudyRef(dcOrVars, vars));
}

export const upsertTimeStudyModuleAttributeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertTimeStudyModuleAttribute', inputVars);
}
upsertTimeStudyModuleAttributeRef.operationName = 'UpsertTimeStudyModuleAttribute';

export function upsertTimeStudyModuleAttribute(dcOrVars, vars) {
  return executeMutation(upsertTimeStudyModuleAttributeRef(dcOrVars, vars));
}

export const listShiftsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListShifts');
}
listShiftsRef.operationName = 'ListShifts';

export function listShifts(dc) {
  return executeQuery(listShiftsRef(dc));
}

export const listDepartmentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDepartments');
}
listDepartmentsRef.operationName = 'ListDepartments';

export function listDepartments(dc) {
  return executeQuery(listDepartmentsRef(dc));
}

export const listModuleProfilesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListModuleProfiles');
}
listModuleProfilesRef.operationName = 'ListModuleProfiles';

export function listModuleProfiles(dc) {
  return executeQuery(listModuleProfilesRef(dc));
}

export const listTravelerTemplatesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTravelerTemplates');
}
listTravelerTemplatesRef.operationName = 'ListTravelerTemplates';

export function listTravelerTemplates(dc) {
  return executeQuery(listTravelerTemplatesRef(dc));
}

