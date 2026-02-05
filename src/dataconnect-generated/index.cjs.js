const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

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
