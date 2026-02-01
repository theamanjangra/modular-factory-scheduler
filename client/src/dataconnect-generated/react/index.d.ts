import { UpsertShiftData, UpsertShiftVariables, UpsertDepartmentData, UpsertDepartmentVariables, UpsertModuleProfileData, UpsertModuleProfileVariables, UpsertTravelerTemplateData, UpsertTravelerTemplateVariables, ListShiftsData, ListDepartmentsData, ListModuleProfilesData, ListTravelerTemplatesData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useUpsertShift(options?: useDataConnectMutationOptions<UpsertShiftData, FirebaseError, UpsertShiftVariables>): UseDataConnectMutationResult<UpsertShiftData, UpsertShiftVariables>;
export function useUpsertShift(dc: DataConnect, options?: useDataConnectMutationOptions<UpsertShiftData, FirebaseError, UpsertShiftVariables>): UseDataConnectMutationResult<UpsertShiftData, UpsertShiftVariables>;

export function useUpsertDepartment(options?: useDataConnectMutationOptions<UpsertDepartmentData, FirebaseError, UpsertDepartmentVariables>): UseDataConnectMutationResult<UpsertDepartmentData, UpsertDepartmentVariables>;
export function useUpsertDepartment(dc: DataConnect, options?: useDataConnectMutationOptions<UpsertDepartmentData, FirebaseError, UpsertDepartmentVariables>): UseDataConnectMutationResult<UpsertDepartmentData, UpsertDepartmentVariables>;

export function useUpsertModuleProfile(options?: useDataConnectMutationOptions<UpsertModuleProfileData, FirebaseError, UpsertModuleProfileVariables>): UseDataConnectMutationResult<UpsertModuleProfileData, UpsertModuleProfileVariables>;
export function useUpsertModuleProfile(dc: DataConnect, options?: useDataConnectMutationOptions<UpsertModuleProfileData, FirebaseError, UpsertModuleProfileVariables>): UseDataConnectMutationResult<UpsertModuleProfileData, UpsertModuleProfileVariables>;

export function useUpsertTravelerTemplate(options?: useDataConnectMutationOptions<UpsertTravelerTemplateData, FirebaseError, UpsertTravelerTemplateVariables>): UseDataConnectMutationResult<UpsertTravelerTemplateData, UpsertTravelerTemplateVariables>;
export function useUpsertTravelerTemplate(dc: DataConnect, options?: useDataConnectMutationOptions<UpsertTravelerTemplateData, FirebaseError, UpsertTravelerTemplateVariables>): UseDataConnectMutationResult<UpsertTravelerTemplateData, UpsertTravelerTemplateVariables>;

export function useListShifts(options?: useDataConnectQueryOptions<ListShiftsData>): UseDataConnectQueryResult<ListShiftsData, undefined>;
export function useListShifts(dc: DataConnect, options?: useDataConnectQueryOptions<ListShiftsData>): UseDataConnectQueryResult<ListShiftsData, undefined>;

export function useListDepartments(options?: useDataConnectQueryOptions<ListDepartmentsData>): UseDataConnectQueryResult<ListDepartmentsData, undefined>;
export function useListDepartments(dc: DataConnect, options?: useDataConnectQueryOptions<ListDepartmentsData>): UseDataConnectQueryResult<ListDepartmentsData, undefined>;

export function useListModuleProfiles(options?: useDataConnectQueryOptions<ListModuleProfilesData>): UseDataConnectQueryResult<ListModuleProfilesData, undefined>;
export function useListModuleProfiles(dc: DataConnect, options?: useDataConnectQueryOptions<ListModuleProfilesData>): UseDataConnectQueryResult<ListModuleProfilesData, undefined>;

export function useListTravelerTemplates(options?: useDataConnectQueryOptions<ListTravelerTemplatesData>): UseDataConnectQueryResult<ListTravelerTemplatesData, undefined>;
export function useListTravelerTemplates(dc: DataConnect, options?: useDataConnectQueryOptions<ListTravelerTemplatesData>): UseDataConnectQueryResult<ListTravelerTemplatesData, undefined>;
