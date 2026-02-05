import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export enum ModuleAttributeType {
  number = "number",
  boolean = "boolean",
};

export enum TaskType {
  default = "default",
  subassembly = "subassembly",
  nonWorker = "nonWorker",
};

export enum WorkerRole {
  worker = "worker",
  lead = "lead",
  qam = "qam",
  supervisor = "supervisor",
  admin = "admin",
};



export interface AdhocInspectionItem_Key {
  id: UUIDString;
  __typename?: 'AdhocInspectionItem_Key';
}

export interface AdhocTask_Key {
  id: UUIDString;
  __typename?: 'AdhocTask_Key';
}

export interface Applicant_Key {
  id: UUIDString;
  __typename?: 'Applicant_Key';
}

export interface ApplicationAvailability_Key {
  id: UUIDString;
  __typename?: 'ApplicationAvailability_Key';
}

export interface ApplicationPrimaryExperience_Key {
  id: UUIDString;
  __typename?: 'ApplicationPrimaryExperience_Key';
}

export interface ApplicationReference_Key {
  id: UUIDString;
  __typename?: 'ApplicationReference_Key';
}

export interface ApplicationTool_Key {
  id: UUIDString;
  __typename?: 'ApplicationTool_Key';
}

export interface ApplicationTradeSkill_Key {
  id: UUIDString;
  __typename?: 'ApplicationTradeSkill_Key';
}

export interface ChatMessage_Key {
  id: UUIDString;
  __typename?: 'ChatMessage_Key';
}

export interface ChatSession_Key {
  id: UUIDString;
  __typename?: 'ChatSession_Key';
}

export interface Department_Key {
  id: UUIDString;
  __typename?: 'Department_Key';
}

export interface Device_Key {
  id: UUIDString;
  __typename?: 'Device_Key';
}

export interface ExtraClockTime_Key {
  id: UUIDString;
  __typename?: 'ExtraClockTime_Key';
}

export interface InspectionArea_Key {
  id: UUIDString;
  __typename?: 'InspectionArea_Key';
}

export interface InspectionItemTemplate_Key {
  id: UUIDString;
  __typename?: 'InspectionItemTemplate_Key';
}

export interface InspectionItem_Key {
  id: UUIDString;
  __typename?: 'InspectionItem_Key';
}

export interface Issue_Key {
  id: UUIDString;
  __typename?: 'Issue_Key';
}

export interface JobApplication_Key {
  id: UUIDString;
  __typename?: 'JobApplication_Key';
}

export interface LinkTaskTemplatePrereqData {
  taskTemplate_update?: TaskTemplate_Key | null;
}

export interface LinkTaskTemplatePrereqVariables {
  id: UUIDString;
  prereqId: UUIDString;
}

export interface ListDepartmentsData {
  departments: ({
    id: UUIDString;
    name?: string | null;
  } & Department_Key)[];
}

export interface ListModuleProfilesData {
  moduleProfiles: ({
    id: UUIDString;
    name?: string | null;
  } & ModuleProfile_Key)[];
}

export interface ListShiftsData {
  shifts: ({
    id: UUIDString;
    name?: string | null;
    startTime?: TimestampString | null;
    endTime?: TimestampString | null;
  } & Shift_Key)[];
}

export interface ListTravelerTemplatesData {
  travelerTemplates: ({
    id: UUIDString;
    name?: string | null;
  } & TravelerTemplate_Key)[];
}

export interface ManagedFile_Key {
  id: UUIDString;
  __typename?: 'ManagedFile_Key';
}

export interface ModuleAttribute_Key {
  id: UUIDString;
  __typename?: 'ModuleAttribute_Key';
}

export interface ModuleCharacteristic_Key {
  id: UUIDString;
  __typename?: 'ModuleCharacteristic_Key';
}

export interface ModuleProfileModuleAttribute_Key {
  id: UUIDString;
  __typename?: 'ModuleProfileModuleAttribute_Key';
}

export interface ModuleProfile_Key {
  id: UUIDString;
  __typename?: 'ModuleProfile_Key';
}

export interface Module_Key {
  id: UUIDString;
  __typename?: 'Module_Key';
}

export interface Note_Key {
  id: UUIDString;
  __typename?: 'Note_Key';
}

export interface Notification_Key {
  id: UUIDString;
  __typename?: 'Notification_Key';
}

export interface ProductionPlanShift_Key {
  id: UUIDString;
  __typename?: 'ProductionPlanShift_Key';
}

export interface ProductionPlan_Key {
  id: UUIDString;
  __typename?: 'ProductionPlan_Key';
}

export interface ProjectContact_Key {
  id: UUIDString;
  __typename?: 'ProjectContact_Key';
}

export interface Project_Key {
  id: UUIDString;
  __typename?: 'Project_Key';
}

export interface PtoRequest_Key {
  id: UUIDString;
  __typename?: 'PtoRequest_Key';
}

export interface Shift_Key {
  id: UUIDString;
  __typename?: 'Shift_Key';
}

export interface Station_Key {
  id: UUIDString;
  __typename?: 'Station_Key';
}

export interface TaskInterruption_Key {
  id: UUIDString;
  __typename?: 'TaskInterruption_Key';
}

export interface TaskTemplateModuleAttribute_Key {
  id: UUIDString;
  __typename?: 'TaskTemplateModuleAttribute_Key';
}

export interface TaskTemplate_Key {
  id: UUIDString;
  __typename?: 'TaskTemplate_Key';
}

export interface Task_Key {
  id: UUIDString;
  __typename?: 'Task_Key';
}

export interface TimeLog_Key {
  id: UUIDString;
  __typename?: 'TimeLog_Key';
}

export interface TimeStudyModuleAttribute_Key {
  id: UUIDString;
  __typename?: 'TimeStudyModuleAttribute_Key';
}

export interface TimeStudy_Key {
  id: UUIDString;
  __typename?: 'TimeStudy_Key';
}

export interface TravelerInspectionArea_Key {
  id: UUIDString;
  __typename?: 'TravelerInspectionArea_Key';
}

export interface TravelerStation_Key {
  id: UUIDString;
  __typename?: 'TravelerStation_Key';
}

export interface TravelerTemplateInspectionItemTemplate_Key {
  id: UUIDString;
  __typename?: 'TravelerTemplateInspectionItemTemplate_Key';
}

export interface TravelerTemplateTaskTemplate_Key {
  id: UUIDString;
  __typename?: 'TravelerTemplateTaskTemplate_Key';
}

export interface TravelerTemplate_Key {
  id: UUIDString;
  __typename?: 'TravelerTemplate_Key';
}

export interface Traveler_Key {
  id: UUIDString;
  __typename?: 'Traveler_Key';
}

export interface UpsertDepartmentData {
  department_upsert: Department_Key;
}

export interface UpsertDepartmentVariables {
  id: UUIDString;
  name: string;
}

export interface UpsertModuleAttributeData {
  moduleAttribute_upsert: ModuleAttribute_Key;
}

export interface UpsertModuleAttributeVariables {
  id: UUIDString;
  name: string;
  type: ModuleAttributeType;
}

export interface UpsertModuleProfileData {
  moduleProfile_upsert: ModuleProfile_Key;
}

export interface UpsertModuleProfileModuleAttributeData {
  moduleProfileModuleAttribute_upsert: ModuleProfileModuleAttribute_Key;
}

export interface UpsertModuleProfileModuleAttributeVariables {
  id: UUIDString;
  profileId: UUIDString;
  attributeId: UUIDString;
  value: string;
}

export interface UpsertModuleProfileVariables {
  id: UUIDString;
  name: string;
}

export interface UpsertModuleProfileWithProjectData {
  moduleProfile_upsert: ModuleProfile_Key;
}

export interface UpsertModuleProfileWithProjectVariables {
  id: UUIDString;
  name: string;
  projectId: UUIDString;
}

export interface UpsertProjectData {
  project_upsert: Project_Key;
}

export interface UpsertProjectVariables {
  id: UUIDString;
  name: string;
}

export interface UpsertShiftData {
  shift_upsert: Shift_Key;
}

export interface UpsertShiftVariables {
  id: UUIDString;
  name: string;
  startTime?: TimestampString | null;
  endTime?: TimestampString | null;
}

export interface UpsertStationData {
  station_upsert: Station_Key;
}

export interface UpsertStationVariables {
  id: UUIDString;
  name: string;
  order?: number | null;
}

export interface UpsertTaskTemplateData {
  taskTemplate_upsert: TaskTemplate_Key;
}

export interface UpsertTaskTemplateVariables {
  id: UUIDString;
  name: string;
  stationId: UUIDString;
  departmentId: UUIDString;
  order: number;
  minWorkers: number;
  maxWorkers: number;
  type: TaskType;
}

export interface UpsertTimeStudyData {
  timeStudy_upsert: TimeStudy_Key;
}

export interface UpsertTimeStudyModuleAttributeData {
  timeStudyModuleAttribute_upsert: TimeStudyModuleAttribute_Key;
}

export interface UpsertTimeStudyModuleAttributeVariables {
  id: UUIDString;
  timeStudyId: UUIDString;
  attributeId: UUIDString;
  value: string;
}

export interface UpsertTimeStudyVariables {
  id: UUIDString;
  taskTemplateId: UUIDString;
  clockTime: number;
  workerCount: number;
}

export interface UpsertTravelerTemplateData {
  travelerTemplate_upsert: TravelerTemplate_Key;
}

export interface UpsertTravelerTemplateVariables {
  id: UUIDString;
  name: string;
}

export interface UpsertWorkerData {
  worker_upsert: Worker_Key;
}

export interface UpsertWorkerVariables {
  id: UUIDString;
  firstName: string;
  lastName: string;
  stationId?: UUIDString | null;
  role?: WorkerRole | null;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface WarrantyClaims_Key {
  id: UUIDString;
  __typename?: 'WarrantyClaims_Key';
}

export interface WorkHistory_Key {
  id: UUIDString;
  __typename?: 'WorkHistory_Key';
}

export interface WorkerDepartment_Key {
  id: UUIDString;
  __typename?: 'WorkerDepartment_Key';
}

export interface WorkerTaskTemplate_Key {
  id: UUIDString;
  __typename?: 'WorkerTaskTemplate_Key';
}

export interface WorkerTask_Key {
  id: UUIDString;
  __typename?: 'WorkerTask_Key';
}

export interface Worker_Key {
  id: UUIDString;
  __typename?: 'Worker_Key';
}

interface UpsertShiftRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertShiftVariables): MutationRef<UpsertShiftData, UpsertShiftVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertShiftVariables): MutationRef<UpsertShiftData, UpsertShiftVariables>;
  operationName: string;
}
export const upsertShiftRef: UpsertShiftRef;

export function upsertShift(vars: UpsertShiftVariables): MutationPromise<UpsertShiftData, UpsertShiftVariables>;
export function upsertShift(dc: DataConnect, vars: UpsertShiftVariables): MutationPromise<UpsertShiftData, UpsertShiftVariables>;

interface UpsertDepartmentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertDepartmentVariables): MutationRef<UpsertDepartmentData, UpsertDepartmentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertDepartmentVariables): MutationRef<UpsertDepartmentData, UpsertDepartmentVariables>;
  operationName: string;
}
export const upsertDepartmentRef: UpsertDepartmentRef;

export function upsertDepartment(vars: UpsertDepartmentVariables): MutationPromise<UpsertDepartmentData, UpsertDepartmentVariables>;
export function upsertDepartment(dc: DataConnect, vars: UpsertDepartmentVariables): MutationPromise<UpsertDepartmentData, UpsertDepartmentVariables>;

interface UpsertModuleProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertModuleProfileVariables): MutationRef<UpsertModuleProfileData, UpsertModuleProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertModuleProfileVariables): MutationRef<UpsertModuleProfileData, UpsertModuleProfileVariables>;
  operationName: string;
}
export const upsertModuleProfileRef: UpsertModuleProfileRef;

export function upsertModuleProfile(vars: UpsertModuleProfileVariables): MutationPromise<UpsertModuleProfileData, UpsertModuleProfileVariables>;
export function upsertModuleProfile(dc: DataConnect, vars: UpsertModuleProfileVariables): MutationPromise<UpsertModuleProfileData, UpsertModuleProfileVariables>;

interface UpsertTravelerTemplateRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertTravelerTemplateVariables): MutationRef<UpsertTravelerTemplateData, UpsertTravelerTemplateVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertTravelerTemplateVariables): MutationRef<UpsertTravelerTemplateData, UpsertTravelerTemplateVariables>;
  operationName: string;
}
export const upsertTravelerTemplateRef: UpsertTravelerTemplateRef;

export function upsertTravelerTemplate(vars: UpsertTravelerTemplateVariables): MutationPromise<UpsertTravelerTemplateData, UpsertTravelerTemplateVariables>;
export function upsertTravelerTemplate(dc: DataConnect, vars: UpsertTravelerTemplateVariables): MutationPromise<UpsertTravelerTemplateData, UpsertTravelerTemplateVariables>;

interface UpsertStationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertStationVariables): MutationRef<UpsertStationData, UpsertStationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertStationVariables): MutationRef<UpsertStationData, UpsertStationVariables>;
  operationName: string;
}
export const upsertStationRef: UpsertStationRef;

export function upsertStation(vars: UpsertStationVariables): MutationPromise<UpsertStationData, UpsertStationVariables>;
export function upsertStation(dc: DataConnect, vars: UpsertStationVariables): MutationPromise<UpsertStationData, UpsertStationVariables>;

interface UpsertWorkerRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertWorkerVariables): MutationRef<UpsertWorkerData, UpsertWorkerVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertWorkerVariables): MutationRef<UpsertWorkerData, UpsertWorkerVariables>;
  operationName: string;
}
export const upsertWorkerRef: UpsertWorkerRef;

export function upsertWorker(vars: UpsertWorkerVariables): MutationPromise<UpsertWorkerData, UpsertWorkerVariables>;
export function upsertWorker(dc: DataConnect, vars: UpsertWorkerVariables): MutationPromise<UpsertWorkerData, UpsertWorkerVariables>;

interface UpsertProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertProjectVariables): MutationRef<UpsertProjectData, UpsertProjectVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertProjectVariables): MutationRef<UpsertProjectData, UpsertProjectVariables>;
  operationName: string;
}
export const upsertProjectRef: UpsertProjectRef;

export function upsertProject(vars: UpsertProjectVariables): MutationPromise<UpsertProjectData, UpsertProjectVariables>;
export function upsertProject(dc: DataConnect, vars: UpsertProjectVariables): MutationPromise<UpsertProjectData, UpsertProjectVariables>;

interface UpsertModuleProfileWithProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertModuleProfileWithProjectVariables): MutationRef<UpsertModuleProfileWithProjectData, UpsertModuleProfileWithProjectVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertModuleProfileWithProjectVariables): MutationRef<UpsertModuleProfileWithProjectData, UpsertModuleProfileWithProjectVariables>;
  operationName: string;
}
export const upsertModuleProfileWithProjectRef: UpsertModuleProfileWithProjectRef;

export function upsertModuleProfileWithProject(vars: UpsertModuleProfileWithProjectVariables): MutationPromise<UpsertModuleProfileWithProjectData, UpsertModuleProfileWithProjectVariables>;
export function upsertModuleProfileWithProject(dc: DataConnect, vars: UpsertModuleProfileWithProjectVariables): MutationPromise<UpsertModuleProfileWithProjectData, UpsertModuleProfileWithProjectVariables>;

interface UpsertModuleAttributeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertModuleAttributeVariables): MutationRef<UpsertModuleAttributeData, UpsertModuleAttributeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertModuleAttributeVariables): MutationRef<UpsertModuleAttributeData, UpsertModuleAttributeVariables>;
  operationName: string;
}
export const upsertModuleAttributeRef: UpsertModuleAttributeRef;

export function upsertModuleAttribute(vars: UpsertModuleAttributeVariables): MutationPromise<UpsertModuleAttributeData, UpsertModuleAttributeVariables>;
export function upsertModuleAttribute(dc: DataConnect, vars: UpsertModuleAttributeVariables): MutationPromise<UpsertModuleAttributeData, UpsertModuleAttributeVariables>;

interface UpsertModuleProfileModuleAttributeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertModuleProfileModuleAttributeVariables): MutationRef<UpsertModuleProfileModuleAttributeData, UpsertModuleProfileModuleAttributeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertModuleProfileModuleAttributeVariables): MutationRef<UpsertModuleProfileModuleAttributeData, UpsertModuleProfileModuleAttributeVariables>;
  operationName: string;
}
export const upsertModuleProfileModuleAttributeRef: UpsertModuleProfileModuleAttributeRef;

export function upsertModuleProfileModuleAttribute(vars: UpsertModuleProfileModuleAttributeVariables): MutationPromise<UpsertModuleProfileModuleAttributeData, UpsertModuleProfileModuleAttributeVariables>;
export function upsertModuleProfileModuleAttribute(dc: DataConnect, vars: UpsertModuleProfileModuleAttributeVariables): MutationPromise<UpsertModuleProfileModuleAttributeData, UpsertModuleProfileModuleAttributeVariables>;

interface UpsertTaskTemplateRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertTaskTemplateVariables): MutationRef<UpsertTaskTemplateData, UpsertTaskTemplateVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertTaskTemplateVariables): MutationRef<UpsertTaskTemplateData, UpsertTaskTemplateVariables>;
  operationName: string;
}
export const upsertTaskTemplateRef: UpsertTaskTemplateRef;

export function upsertTaskTemplate(vars: UpsertTaskTemplateVariables): MutationPromise<UpsertTaskTemplateData, UpsertTaskTemplateVariables>;
export function upsertTaskTemplate(dc: DataConnect, vars: UpsertTaskTemplateVariables): MutationPromise<UpsertTaskTemplateData, UpsertTaskTemplateVariables>;

interface LinkTaskTemplatePrereqRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: LinkTaskTemplatePrereqVariables): MutationRef<LinkTaskTemplatePrereqData, LinkTaskTemplatePrereqVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: LinkTaskTemplatePrereqVariables): MutationRef<LinkTaskTemplatePrereqData, LinkTaskTemplatePrereqVariables>;
  operationName: string;
}
export const linkTaskTemplatePrereqRef: LinkTaskTemplatePrereqRef;

export function linkTaskTemplatePrereq(vars: LinkTaskTemplatePrereqVariables): MutationPromise<LinkTaskTemplatePrereqData, LinkTaskTemplatePrereqVariables>;
export function linkTaskTemplatePrereq(dc: DataConnect, vars: LinkTaskTemplatePrereqVariables): MutationPromise<LinkTaskTemplatePrereqData, LinkTaskTemplatePrereqVariables>;

interface UpsertTimeStudyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertTimeStudyVariables): MutationRef<UpsertTimeStudyData, UpsertTimeStudyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertTimeStudyVariables): MutationRef<UpsertTimeStudyData, UpsertTimeStudyVariables>;
  operationName: string;
}
export const upsertTimeStudyRef: UpsertTimeStudyRef;

export function upsertTimeStudy(vars: UpsertTimeStudyVariables): MutationPromise<UpsertTimeStudyData, UpsertTimeStudyVariables>;
export function upsertTimeStudy(dc: DataConnect, vars: UpsertTimeStudyVariables): MutationPromise<UpsertTimeStudyData, UpsertTimeStudyVariables>;

interface UpsertTimeStudyModuleAttributeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertTimeStudyModuleAttributeVariables): MutationRef<UpsertTimeStudyModuleAttributeData, UpsertTimeStudyModuleAttributeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertTimeStudyModuleAttributeVariables): MutationRef<UpsertTimeStudyModuleAttributeData, UpsertTimeStudyModuleAttributeVariables>;
  operationName: string;
}
export const upsertTimeStudyModuleAttributeRef: UpsertTimeStudyModuleAttributeRef;

export function upsertTimeStudyModuleAttribute(vars: UpsertTimeStudyModuleAttributeVariables): MutationPromise<UpsertTimeStudyModuleAttributeData, UpsertTimeStudyModuleAttributeVariables>;
export function upsertTimeStudyModuleAttribute(dc: DataConnect, vars: UpsertTimeStudyModuleAttributeVariables): MutationPromise<UpsertTimeStudyModuleAttributeData, UpsertTimeStudyModuleAttributeVariables>;

interface ListShiftsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListShiftsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListShiftsData, undefined>;
  operationName: string;
}
export const listShiftsRef: ListShiftsRef;

export function listShifts(): QueryPromise<ListShiftsData, undefined>;
export function listShifts(dc: DataConnect): QueryPromise<ListShiftsData, undefined>;

interface ListDepartmentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDepartmentsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListDepartmentsData, undefined>;
  operationName: string;
}
export const listDepartmentsRef: ListDepartmentsRef;

export function listDepartments(): QueryPromise<ListDepartmentsData, undefined>;
export function listDepartments(dc: DataConnect): QueryPromise<ListDepartmentsData, undefined>;

interface ListModuleProfilesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListModuleProfilesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListModuleProfilesData, undefined>;
  operationName: string;
}
export const listModuleProfilesRef: ListModuleProfilesRef;

export function listModuleProfiles(): QueryPromise<ListModuleProfilesData, undefined>;
export function listModuleProfiles(dc: DataConnect): QueryPromise<ListModuleProfilesData, undefined>;

interface ListTravelerTemplatesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTravelerTemplatesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListTravelerTemplatesData, undefined>;
  operationName: string;
}
export const listTravelerTemplatesRef: ListTravelerTemplatesRef;

export function listTravelerTemplates(): QueryPromise<ListTravelerTemplatesData, undefined>;
export function listTravelerTemplates(dc: DataConnect): QueryPromise<ListTravelerTemplatesData, undefined>;

