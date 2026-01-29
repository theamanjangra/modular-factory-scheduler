const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'chat',
  service: 'vederra-dev-d4327-service',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const createChatSessionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateChatSession', inputVars);
}
createChatSessionRef.operationName = 'CreateChatSession';
exports.createChatSessionRef = createChatSessionRef;

exports.createChatSession = function createChatSession(dcOrVars, vars) {
  return executeMutation(createChatSessionRef(dcOrVars, vars));
};

const getChatSessionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetChatSession', inputVars);
}
getChatSessionRef.operationName = 'GetChatSession';
exports.getChatSessionRef = getChatSessionRef;

exports.getChatSession = function getChatSession(dcOrVars, vars) {
  return executeQuery(getChatSessionRef(dcOrVars, vars));
};

const addChatMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddChatMessage', inputVars);
}
addChatMessageRef.operationName = 'AddChatMessage';
exports.addChatMessageRef = addChatMessageRef;

exports.addChatMessage = function addChatMessage(dcOrVars, vars) {
  return executeMutation(addChatMessageRef(dcOrVars, vars));
};

const listChatMessagesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListChatMessages', inputVars);
}
listChatMessagesRef.operationName = 'ListChatMessages';
exports.listChatMessagesRef = listChatMessagesRef;

exports.listChatMessages = function listChatMessages(dcOrVars, vars) {
  return executeQuery(listChatMessagesRef(dcOrVars, vars));
};

const deleteChatSessionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteChatSession', inputVars);
}
deleteChatSessionRef.operationName = 'DeleteChatSession';
exports.deleteChatSessionRef = deleteChatSessionRef;

exports.deleteChatSession = function deleteChatSession(dcOrVars, vars) {
  return executeMutation(deleteChatSessionRef(dcOrVars, vars));
};
