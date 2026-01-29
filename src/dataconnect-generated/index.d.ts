import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export enum NoteType {
  approval = "approval",
  rejection = "rejection",
  photoOnly = "photoOnly",
  move = "move",
  moveRequest = "moveRequest",
  normal = "normal",
};

export enum TaskStatus {
  pending = "pending",
  approved = "approved",
  rejected = "rejected",
};

export enum WorkerRole {
  worker = "worker",
  lead = "lead",
  qam = "qam",
  supervisor = "supervisor",
  admin = "admin",
};



export interface AddNoteData {
  note_insert: Note_Key;
}

export interface AddNoteVariables {
  id: string;
  text: string;
  type?: NoteType | null;
}

export interface AdhocInspectionItem_Key {
  id: string;
  __typename?: 'AdhocInspectionItem_Key';
}

export interface AdhocTask_Key {
  id: string;
  __typename?: 'AdhocTask_Key';
}

export interface CreateStationData {
  station_insert: Station_Key;
}

export interface CreateStationVariables {
  id: string;
  name?: string | null;
  order?: number | null;
  doesReceiveTravelers?: boolean | null;
}

export interface CreateTravelerTemplateData {
  travelerTemplate_insert: TravelerTemplate_Key;
}

export interface CreateTravelerTemplateVariables {
  id: string;
  name?: string | null;
}

export interface GetNotesData {
  notes: ({
    id: string;
    text?: string | null;
    type?: NoteType | null;
  } & Note_Key)[];
}

export interface GetStationByIdData {
  station?: {
    id: string;
    name?: string | null;
    order?: number | null;
    doesReceiveTravelers?: boolean | null;
  } & Station_Key;
}

export interface GetStationByIdVariables {
  id: string;
}

export interface GetStationsData {
  stations: ({
    id: string;
    name?: string | null;
    order?: number | null;
    doesReceiveTravelers?: boolean | null;
  } & Station_Key)[];
}

export interface GetTasksData {
  tasks: ({
    id: string;
    travelerId: string;
    taskTemplateId: string;
    leadStatus?: TaskStatus | null;
    qamStatus?: TaskStatus | null;
    createdAt: TimestampString;
  } & Task_Key)[];
}

export interface GetTravelerByIdData {
  traveler?: {
    id: string;
    moduleProfileId?: string | null;
    travelerTemplateId: string;
    isShipped?: boolean | null;
    notesRequiredUpload?: boolean | null;
    serialNumber?: string | null;
  } & Traveler_Key;
}

export interface GetTravelerByIdVariables {
  id: string;
}

export interface GetTravelerStationsByTravelerData {
  travelerStations: ({
    id: string;
    travelerId: string;
    stationId: string;
    leadInspectionProgress?: number | null;
    qamInspectionProgress?: number | null;
    taskProgress?: number | null;
    isCurrent?: boolean | null;
  } & TravelerStation_Key)[];
}

export interface GetTravelerStationsByTravelerVariables {
  travelerId: string;
}

export interface GetTravelerStationsData {
  travelerStations: ({
    id: string;
    travelerId: string;
    stationId: string;
    leadInspectionProgress?: number | null;
    qamInspectionProgress?: number | null;
    taskProgress?: number | null;
    isCurrent?: boolean | null;
  } & TravelerStation_Key)[];
}

export interface GetTravelerTemplatesData {
  travelerTemplates: ({
    id: string;
    name?: string | null;
  } & TravelerTemplate_Key)[];
}

export interface GetTravelersData {
  travelers: ({
    id: string;
    moduleProfileId?: string | null;
    travelerTemplateId: string;
    isShipped?: boolean | null;
    notesRequiredUpload?: boolean | null;
    serialNumber?: string | null;
  } & Traveler_Key)[];
}

export interface GetWorkerTasksData {
  workerTasks: ({
    id: string;
    workerId: string;
    taskId: string;
    startDate?: TimestampString | null;
    endDate?: TimestampString | null;
  } & WorkerTask_Key)[];
}

export interface GetWorkersData {
  workers: ({
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    role?: WorkerRole | null;
    employeeId?: string | null;
  } & Worker_Key)[];
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

export interface TravelerData {
  traveler_insert: Traveler_Key;
}

export interface TravelerStationData {
  travelerStation_insert: TravelerStation_Key;
}

export interface TravelerStationVariables {
  id: string;
  travelerId: string;
  stationId: string;
  isCurrent?: boolean | null;
  leadInspectionProgress?: number | null;
  qamInspectionProgress?: number | null;
  taskProgress?: number | null;
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

export interface TravelerVariables {
  id: string;
  moduleProfileId?: string | null;
  travelerTemplateId: string;
  isShipped?: boolean | null;
  notesRequiredUpload?: boolean | null;
  serialNumber?: string | null;
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

interface GetNotesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetNotesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetNotesData, undefined>;
  operationName: string;
}
export const getNotesRef: GetNotesRef;

export function getNotes(): QueryPromise<GetNotesData, undefined>;
export function getNotes(dc: DataConnect): QueryPromise<GetNotesData, undefined>;

interface GetTravelerTemplatesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTravelerTemplatesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetTravelerTemplatesData, undefined>;
  operationName: string;
}
export const getTravelerTemplatesRef: GetTravelerTemplatesRef;

export function getTravelerTemplates(): QueryPromise<GetTravelerTemplatesData, undefined>;
export function getTravelerTemplates(dc: DataConnect): QueryPromise<GetTravelerTemplatesData, undefined>;

interface GetStationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetStationsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetStationsData, undefined>;
  operationName: string;
}
export const getStationsRef: GetStationsRef;

export function getStations(): QueryPromise<GetStationsData, undefined>;
export function getStations(dc: DataConnect): QueryPromise<GetStationsData, undefined>;

interface GetStationByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStationByIdVariables): QueryRef<GetStationByIdData, GetStationByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetStationByIdVariables): QueryRef<GetStationByIdData, GetStationByIdVariables>;
  operationName: string;
}
export const getStationByIdRef: GetStationByIdRef;

export function getStationById(vars: GetStationByIdVariables): QueryPromise<GetStationByIdData, GetStationByIdVariables>;
export function getStationById(dc: DataConnect, vars: GetStationByIdVariables): QueryPromise<GetStationByIdData, GetStationByIdVariables>;

interface GetTravelersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTravelersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetTravelersData, undefined>;
  operationName: string;
}
export const getTravelersRef: GetTravelersRef;

export function getTravelers(): QueryPromise<GetTravelersData, undefined>;
export function getTravelers(dc: DataConnect): QueryPromise<GetTravelersData, undefined>;

interface GetTravelerByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTravelerByIdVariables): QueryRef<GetTravelerByIdData, GetTravelerByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetTravelerByIdVariables): QueryRef<GetTravelerByIdData, GetTravelerByIdVariables>;
  operationName: string;
}
export const getTravelerByIdRef: GetTravelerByIdRef;

export function getTravelerById(vars: GetTravelerByIdVariables): QueryPromise<GetTravelerByIdData, GetTravelerByIdVariables>;
export function getTravelerById(dc: DataConnect, vars: GetTravelerByIdVariables): QueryPromise<GetTravelerByIdData, GetTravelerByIdVariables>;

interface GetTravelerStationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTravelerStationsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetTravelerStationsData, undefined>;
  operationName: string;
}
export const getTravelerStationsRef: GetTravelerStationsRef;

export function getTravelerStations(): QueryPromise<GetTravelerStationsData, undefined>;
export function getTravelerStations(dc: DataConnect): QueryPromise<GetTravelerStationsData, undefined>;

interface GetTravelerStationsByTravelerRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTravelerStationsByTravelerVariables): QueryRef<GetTravelerStationsByTravelerData, GetTravelerStationsByTravelerVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetTravelerStationsByTravelerVariables): QueryRef<GetTravelerStationsByTravelerData, GetTravelerStationsByTravelerVariables>;
  operationName: string;
}
export const getTravelerStationsByTravelerRef: GetTravelerStationsByTravelerRef;

export function getTravelerStationsByTraveler(vars: GetTravelerStationsByTravelerVariables): QueryPromise<GetTravelerStationsByTravelerData, GetTravelerStationsByTravelerVariables>;
export function getTravelerStationsByTraveler(dc: DataConnect, vars: GetTravelerStationsByTravelerVariables): QueryPromise<GetTravelerStationsByTravelerData, GetTravelerStationsByTravelerVariables>;

interface GetWorkersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetWorkersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetWorkersData, undefined>;
  operationName: string;
}
export const getWorkersRef: GetWorkersRef;

export function getWorkers(): QueryPromise<GetWorkersData, undefined>;
export function getWorkers(dc: DataConnect): QueryPromise<GetWorkersData, undefined>;

interface GetWorkerTasksRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetWorkerTasksData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetWorkerTasksData, undefined>;
  operationName: string;
}
export const getWorkerTasksRef: GetWorkerTasksRef;

export function getWorkerTasks(): QueryPromise<GetWorkerTasksData, undefined>;
export function getWorkerTasks(dc: DataConnect): QueryPromise<GetWorkerTasksData, undefined>;

interface GetTasksRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTasksData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetTasksData, undefined>;
  operationName: string;
}
export const getTasksRef: GetTasksRef;

export function getTasks(): QueryPromise<GetTasksData, undefined>;
export function getTasks(dc: DataConnect): QueryPromise<GetTasksData, undefined>;

interface AddNoteRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddNoteVariables): MutationRef<AddNoteData, AddNoteVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddNoteVariables): MutationRef<AddNoteData, AddNoteVariables>;
  operationName: string;
}
export const addNoteRef: AddNoteRef;

export function addNote(vars: AddNoteVariables): MutationPromise<AddNoteData, AddNoteVariables>;
export function addNote(dc: DataConnect, vars: AddNoteVariables): MutationPromise<AddNoteData, AddNoteVariables>;

interface CreateTravelerTemplateRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTravelerTemplateVariables): MutationRef<CreateTravelerTemplateData, CreateTravelerTemplateVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateTravelerTemplateVariables): MutationRef<CreateTravelerTemplateData, CreateTravelerTemplateVariables>;
  operationName: string;
}
export const createTravelerTemplateRef: CreateTravelerTemplateRef;

export function createTravelerTemplate(vars: CreateTravelerTemplateVariables): MutationPromise<CreateTravelerTemplateData, CreateTravelerTemplateVariables>;
export function createTravelerTemplate(dc: DataConnect, vars: CreateTravelerTemplateVariables): MutationPromise<CreateTravelerTemplateData, CreateTravelerTemplateVariables>;

interface CreateStationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStationVariables): MutationRef<CreateStationData, CreateStationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateStationVariables): MutationRef<CreateStationData, CreateStationVariables>;
  operationName: string;
}
export const createStationRef: CreateStationRef;

export function createStation(vars: CreateStationVariables): MutationPromise<CreateStationData, CreateStationVariables>;
export function createStation(dc: DataConnect, vars: CreateStationVariables): MutationPromise<CreateStationData, CreateStationVariables>;

interface TravelerStationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: TravelerStationVariables): MutationRef<TravelerStationData, TravelerStationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: TravelerStationVariables): MutationRef<TravelerStationData, TravelerStationVariables>;
  operationName: string;
}
export const travelerStationRef: TravelerStationRef;

export function travelerStation(vars: TravelerStationVariables): MutationPromise<TravelerStationData, TravelerStationVariables>;
export function travelerStation(dc: DataConnect, vars: TravelerStationVariables): MutationPromise<TravelerStationData, TravelerStationVariables>;

interface TravelerRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: TravelerVariables): MutationRef<TravelerData, TravelerVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: TravelerVariables): MutationRef<TravelerData, TravelerVariables>;
  operationName: string;
}
export const travelerRef: TravelerRef;

export function traveler(vars: TravelerVariables): MutationPromise<TravelerData, TravelerVariables>;
export function traveler(dc: DataConnect, vars: TravelerVariables): MutationPromise<TravelerData, TravelerVariables>;

