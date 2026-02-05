import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

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

