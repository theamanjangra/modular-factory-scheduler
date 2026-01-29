import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'chat',
  service: 'vederra-dev-d4327-service',
  location: 'us-central1'
};

export const createChatSessionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateChatSession', inputVars);
}
createChatSessionRef.operationName = 'CreateChatSession';

export function createChatSession(dcOrVars, vars) {
  return executeMutation(createChatSessionRef(dcOrVars, vars));
}

export const getChatSessionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetChatSession', inputVars);
}
getChatSessionRef.operationName = 'GetChatSession';

export function getChatSession(dcOrVars, vars) {
  return executeQuery(getChatSessionRef(dcOrVars, vars));
}

export const addChatMessageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddChatMessage', inputVars);
}
addChatMessageRef.operationName = 'AddChatMessage';

export function addChatMessage(dcOrVars, vars) {
  return executeMutation(addChatMessageRef(dcOrVars, vars));
}

export const listChatMessagesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListChatMessages', inputVars);
}
listChatMessagesRef.operationName = 'ListChatMessages';

export function listChatMessages(dcOrVars, vars) {
  return executeQuery(listChatMessagesRef(dcOrVars, vars));
}

export const deleteChatSessionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteChatSession', inputVars);
}
deleteChatSessionRef.operationName = 'DeleteChatSession';

export function deleteChatSession(dcOrVars, vars) {
  return executeMutation(deleteChatSessionRef(dcOrVars, vars));
}

