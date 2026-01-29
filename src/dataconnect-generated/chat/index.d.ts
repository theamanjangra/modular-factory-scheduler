import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddChatMessageData {
  chatMessage_insert: ChatMessage_Key;
}

export interface AddChatMessageVariables {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  timestamp: TimestampString;
  attachmentType?: string | null;
  attachmentFilename?: string | null;
}

export interface AdhocInspectionItem_Key {
  id: string;
  __typename?: 'AdhocInspectionItem_Key';
}

export interface AdhocTask_Key {
  id: string;
  __typename?: 'AdhocTask_Key';
}

export interface ChatMessage_Key {
  id: string;
  __typename?: 'ChatMessage_Key';
}

export interface ChatSession_Key {
  id: string;
  __typename?: 'ChatSession_Key';
}

export interface CreateChatSessionData {
  chatSession_insert: ChatSession_Key;
}

export interface CreateChatSessionVariables {
  id: string;
  userId?: string | null;
  metadata?: string | null;
  createdAt: TimestampString;
  updatedAt: TimestampString;
  expiresAt: TimestampString;
}

export interface DeleteChatSessionData {
  chatSession_delete?: ChatSession_Key | null;
}

export interface DeleteChatSessionVariables {
  id: string;
}

export interface GetChatSessionData {
  chatSession?: {
    id: string;
    userId?: string | null;
    metadata?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    expiresAt: TimestampString;
  } & ChatSession_Key;
}

export interface GetChatSessionVariables {
  id: string;
}

export interface InspectionArea_Key {
  id: string;
  __typename?: 'InspectionArea_Key';
}

export interface InspectionItemTemplate_Key {
  id: string;
  __typename?: 'InspectionItemTemplate_Key';
}

export interface InspectionItem_Key {
  id: string;
  __typename?: 'InspectionItem_Key';
}

export interface Issue_Key {
  id: string;
  __typename?: 'Issue_Key';
}

export interface ListChatMessagesData {
  chatMessages: ({
    id: string;
    role: string;
    content: string;
    timestamp: TimestampString;
    attachmentType?: string | null;
    attachmentFilename?: string | null;
  } & ChatMessage_Key)[];
}

export interface ListChatMessagesVariables {
  sessionId: string;
}

export interface ManagedFile_Key {
  id: string;
  __typename?: 'ManagedFile_Key';
}

export interface ModuleCharacteristic_Key {
  id: string;
  __typename?: 'ModuleCharacteristic_Key';
}

export interface ModuleProfile_Key {
  id: string;
  __typename?: 'ModuleProfile_Key';
}

export interface Note_Key {
  id: string;
  __typename?: 'Note_Key';
}

export interface Project_Key {
  id: string;
  __typename?: 'Project_Key';
}

export interface Station_Key {
  id: string;
  __typename?: 'Station_Key';
}

export interface TaskTemplate_Key {
  id: string;
  __typename?: 'TaskTemplate_Key';
}

export interface Task_Key {
  id: string;
  __typename?: 'Task_Key';
}

export interface TimeLog_Key {
  id: string;
  __typename?: 'TimeLog_Key';
}

export interface TravelerStation_Key {
  id: string;
  __typename?: 'TravelerStation_Key';
}

export interface TravelerTemplateInspectionItemTemplate_Key {
  id: string;
  __typename?: 'TravelerTemplateInspectionItemTemplate_Key';
}

export interface TravelerTemplateTaskTemplate_Key {
  id: string;
  __typename?: 'TravelerTemplateTaskTemplate_Key';
}

export interface TravelerTemplate_Key {
  id: string;
  __typename?: 'TravelerTemplate_Key';
}

export interface Traveler_Key {
  id: string;
  __typename?: 'Traveler_Key';
}

export interface User_Key {
  id: string;
  __typename?: 'User_Key';
}

export interface WorkerTask_Key {
  id: string;
  __typename?: 'WorkerTask_Key';
}

export interface Worker_Key {
  id: string;
  __typename?: 'Worker_Key';
}

interface CreateChatSessionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateChatSessionVariables): MutationRef<CreateChatSessionData, CreateChatSessionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateChatSessionVariables): MutationRef<CreateChatSessionData, CreateChatSessionVariables>;
  operationName: string;
}
export const createChatSessionRef: CreateChatSessionRef;

export function createChatSession(vars: CreateChatSessionVariables): MutationPromise<CreateChatSessionData, CreateChatSessionVariables>;
export function createChatSession(dc: DataConnect, vars: CreateChatSessionVariables): MutationPromise<CreateChatSessionData, CreateChatSessionVariables>;

interface GetChatSessionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetChatSessionVariables): QueryRef<GetChatSessionData, GetChatSessionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetChatSessionVariables): QueryRef<GetChatSessionData, GetChatSessionVariables>;
  operationName: string;
}
export const getChatSessionRef: GetChatSessionRef;

export function getChatSession(vars: GetChatSessionVariables): QueryPromise<GetChatSessionData, GetChatSessionVariables>;
export function getChatSession(dc: DataConnect, vars: GetChatSessionVariables): QueryPromise<GetChatSessionData, GetChatSessionVariables>;

interface AddChatMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddChatMessageVariables): MutationRef<AddChatMessageData, AddChatMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddChatMessageVariables): MutationRef<AddChatMessageData, AddChatMessageVariables>;
  operationName: string;
}
export const addChatMessageRef: AddChatMessageRef;

export function addChatMessage(vars: AddChatMessageVariables): MutationPromise<AddChatMessageData, AddChatMessageVariables>;
export function addChatMessage(dc: DataConnect, vars: AddChatMessageVariables): MutationPromise<AddChatMessageData, AddChatMessageVariables>;

interface ListChatMessagesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListChatMessagesVariables): QueryRef<ListChatMessagesData, ListChatMessagesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListChatMessagesVariables): QueryRef<ListChatMessagesData, ListChatMessagesVariables>;
  operationName: string;
}
export const listChatMessagesRef: ListChatMessagesRef;

export function listChatMessages(vars: ListChatMessagesVariables): QueryPromise<ListChatMessagesData, ListChatMessagesVariables>;
export function listChatMessages(dc: DataConnect, vars: ListChatMessagesVariables): QueryPromise<ListChatMessagesData, ListChatMessagesVariables>;

interface DeleteChatSessionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteChatSessionVariables): MutationRef<DeleteChatSessionData, DeleteChatSessionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteChatSessionVariables): MutationRef<DeleteChatSessionData, DeleteChatSessionVariables>;
  operationName: string;
}
export const deleteChatSessionRef: DeleteChatSessionRef;

export function deleteChatSession(vars: DeleteChatSessionVariables): MutationPromise<DeleteChatSessionData, DeleteChatSessionVariables>;
export function deleteChatSession(dc: DataConnect, vars: DeleteChatSessionVariables): MutationPromise<DeleteChatSessionData, DeleteChatSessionVariables>;

