import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




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

export interface UpsertModuleProfileData {
  moduleProfile_upsert: ModuleProfile_Key;
}

export interface UpsertModuleProfileVariables {
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

export interface UpsertTravelerTemplateData {
  travelerTemplate_upsert: TravelerTemplate_Key;
}

export interface UpsertTravelerTemplateVariables {
  id: UUIDString;
  name: string;
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

