# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListShifts*](#listshifts)
  - [*ListDepartments*](#listdepartments)
  - [*ListModuleProfiles*](#listmoduleprofiles)
  - [*ListTravelerTemplates*](#listtravelertemplates)
- [**Mutations**](#mutations)
  - [*UpsertShift*](#upsertshift)
  - [*UpsertDepartment*](#upsertdepartment)
  - [*UpsertModuleProfile*](#upsertmoduleprofile)
  - [*UpsertTravelerTemplate*](#upserttravelertemplate)
  - [*UpsertStation*](#upsertstation)
  - [*UpsertWorker*](#upsertworker)
  - [*UpsertProject*](#upsertproject)
  - [*UpsertModuleProfileWithProject*](#upsertmoduleprofilewithproject)
  - [*UpsertModuleAttribute*](#upsertmoduleattribute)
  - [*UpsertModuleProfileModuleAttribute*](#upsertmoduleprofilemoduleattribute)
  - [*UpsertTaskTemplate*](#upserttasktemplate)
  - [*LinkTaskTemplatePrereq*](#linktasktemplateprereq)
  - [*UpsertTimeStudy*](#upserttimestudy)
  - [*UpsertTimeStudyModuleAttribute*](#upserttimestudymoduleattribute)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `default`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListShifts
You can execute the `ListShifts` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listShifts(): QueryPromise<ListShiftsData, undefined>;

interface ListShiftsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListShiftsData, undefined>;
}
export const listShiftsRef: ListShiftsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listShifts(dc: DataConnect): QueryPromise<ListShiftsData, undefined>;

interface ListShiftsRef {
  ...
  (dc: DataConnect): QueryRef<ListShiftsData, undefined>;
}
export const listShiftsRef: ListShiftsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listShiftsRef:
```typescript
const name = listShiftsRef.operationName;
console.log(name);
```

### Variables
The `ListShifts` query has no variables.
### Return Type
Recall that executing the `ListShifts` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListShiftsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListShiftsData {
  shifts: ({
    id: UUIDString;
    name?: string | null;
    startTime?: TimestampString | null;
    endTime?: TimestampString | null;
  } & Shift_Key)[];
}
```
### Using `ListShifts`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listShifts } from '@dataconnect/generated';


// Call the `listShifts()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listShifts();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listShifts(dataConnect);

console.log(data.shifts);

// Or, you can use the `Promise` API.
listShifts().then((response) => {
  const data = response.data;
  console.log(data.shifts);
});
```

### Using `ListShifts`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listShiftsRef } from '@dataconnect/generated';


// Call the `listShiftsRef()` function to get a reference to the query.
const ref = listShiftsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listShiftsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.shifts);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.shifts);
});
```

## ListDepartments
You can execute the `ListDepartments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listDepartments(): QueryPromise<ListDepartmentsData, undefined>;

interface ListDepartmentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDepartmentsData, undefined>;
}
export const listDepartmentsRef: ListDepartmentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDepartments(dc: DataConnect): QueryPromise<ListDepartmentsData, undefined>;

interface ListDepartmentsRef {
  ...
  (dc: DataConnect): QueryRef<ListDepartmentsData, undefined>;
}
export const listDepartmentsRef: ListDepartmentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDepartmentsRef:
```typescript
const name = listDepartmentsRef.operationName;
console.log(name);
```

### Variables
The `ListDepartments` query has no variables.
### Return Type
Recall that executing the `ListDepartments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDepartmentsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDepartmentsData {
  departments: ({
    id: UUIDString;
    name?: string | null;
  } & Department_Key)[];
}
```
### Using `ListDepartments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDepartments } from '@dataconnect/generated';


// Call the `listDepartments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDepartments();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDepartments(dataConnect);

console.log(data.departments);

// Or, you can use the `Promise` API.
listDepartments().then((response) => {
  const data = response.data;
  console.log(data.departments);
});
```

### Using `ListDepartments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDepartmentsRef } from '@dataconnect/generated';


// Call the `listDepartmentsRef()` function to get a reference to the query.
const ref = listDepartmentsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDepartmentsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.departments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.departments);
});
```

## ListModuleProfiles
You can execute the `ListModuleProfiles` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listModuleProfiles(): QueryPromise<ListModuleProfilesData, undefined>;

interface ListModuleProfilesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListModuleProfilesData, undefined>;
}
export const listModuleProfilesRef: ListModuleProfilesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listModuleProfiles(dc: DataConnect): QueryPromise<ListModuleProfilesData, undefined>;

interface ListModuleProfilesRef {
  ...
  (dc: DataConnect): QueryRef<ListModuleProfilesData, undefined>;
}
export const listModuleProfilesRef: ListModuleProfilesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listModuleProfilesRef:
```typescript
const name = listModuleProfilesRef.operationName;
console.log(name);
```

### Variables
The `ListModuleProfiles` query has no variables.
### Return Type
Recall that executing the `ListModuleProfiles` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListModuleProfilesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListModuleProfilesData {
  moduleProfiles: ({
    id: UUIDString;
    name?: string | null;
  } & ModuleProfile_Key)[];
}
```
### Using `ListModuleProfiles`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listModuleProfiles } from '@dataconnect/generated';


// Call the `listModuleProfiles()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listModuleProfiles();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listModuleProfiles(dataConnect);

console.log(data.moduleProfiles);

// Or, you can use the `Promise` API.
listModuleProfiles().then((response) => {
  const data = response.data;
  console.log(data.moduleProfiles);
});
```

### Using `ListModuleProfiles`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listModuleProfilesRef } from '@dataconnect/generated';


// Call the `listModuleProfilesRef()` function to get a reference to the query.
const ref = listModuleProfilesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listModuleProfilesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.moduleProfiles);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.moduleProfiles);
});
```

## ListTravelerTemplates
You can execute the `ListTravelerTemplates` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listTravelerTemplates(): QueryPromise<ListTravelerTemplatesData, undefined>;

interface ListTravelerTemplatesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTravelerTemplatesData, undefined>;
}
export const listTravelerTemplatesRef: ListTravelerTemplatesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTravelerTemplates(dc: DataConnect): QueryPromise<ListTravelerTemplatesData, undefined>;

interface ListTravelerTemplatesRef {
  ...
  (dc: DataConnect): QueryRef<ListTravelerTemplatesData, undefined>;
}
export const listTravelerTemplatesRef: ListTravelerTemplatesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTravelerTemplatesRef:
```typescript
const name = listTravelerTemplatesRef.operationName;
console.log(name);
```

### Variables
The `ListTravelerTemplates` query has no variables.
### Return Type
Recall that executing the `ListTravelerTemplates` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTravelerTemplatesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListTravelerTemplatesData {
  travelerTemplates: ({
    id: UUIDString;
    name?: string | null;
  } & TravelerTemplate_Key)[];
}
```
### Using `ListTravelerTemplates`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTravelerTemplates } from '@dataconnect/generated';


// Call the `listTravelerTemplates()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTravelerTemplates();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTravelerTemplates(dataConnect);

console.log(data.travelerTemplates);

// Or, you can use the `Promise` API.
listTravelerTemplates().then((response) => {
  const data = response.data;
  console.log(data.travelerTemplates);
});
```

### Using `ListTravelerTemplates`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTravelerTemplatesRef } from '@dataconnect/generated';


// Call the `listTravelerTemplatesRef()` function to get a reference to the query.
const ref = listTravelerTemplatesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTravelerTemplatesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.travelerTemplates);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.travelerTemplates);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## UpsertShift
You can execute the `UpsertShift` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertShift(vars: UpsertShiftVariables): MutationPromise<UpsertShiftData, UpsertShiftVariables>;

interface UpsertShiftRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertShiftVariables): MutationRef<UpsertShiftData, UpsertShiftVariables>;
}
export const upsertShiftRef: UpsertShiftRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertShift(dc: DataConnect, vars: UpsertShiftVariables): MutationPromise<UpsertShiftData, UpsertShiftVariables>;

interface UpsertShiftRef {
  ...
  (dc: DataConnect, vars: UpsertShiftVariables): MutationRef<UpsertShiftData, UpsertShiftVariables>;
}
export const upsertShiftRef: UpsertShiftRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertShiftRef:
```typescript
const name = upsertShiftRef.operationName;
console.log(name);
```

### Variables
The `UpsertShift` mutation requires an argument of type `UpsertShiftVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertShiftVariables {
  id: UUIDString;
  name: string;
  startTime?: TimestampString | null;
  endTime?: TimestampString | null;
}
```
### Return Type
Recall that executing the `UpsertShift` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertShiftData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertShiftData {
  shift_upsert: Shift_Key;
}
```
### Using `UpsertShift`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertShift, UpsertShiftVariables } from '@dataconnect/generated';

// The `UpsertShift` mutation requires an argument of type `UpsertShiftVariables`:
const upsertShiftVars: UpsertShiftVariables = {
  id: ..., 
  name: ..., 
  startTime: ..., // optional
  endTime: ..., // optional
};

// Call the `upsertShift()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertShift(upsertShiftVars);
// Variables can be defined inline as well.
const { data } = await upsertShift({ id: ..., name: ..., startTime: ..., endTime: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertShift(dataConnect, upsertShiftVars);

console.log(data.shift_upsert);

// Or, you can use the `Promise` API.
upsertShift(upsertShiftVars).then((response) => {
  const data = response.data;
  console.log(data.shift_upsert);
});
```

### Using `UpsertShift`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertShiftRef, UpsertShiftVariables } from '@dataconnect/generated';

// The `UpsertShift` mutation requires an argument of type `UpsertShiftVariables`:
const upsertShiftVars: UpsertShiftVariables = {
  id: ..., 
  name: ..., 
  startTime: ..., // optional
  endTime: ..., // optional
};

// Call the `upsertShiftRef()` function to get a reference to the mutation.
const ref = upsertShiftRef(upsertShiftVars);
// Variables can be defined inline as well.
const ref = upsertShiftRef({ id: ..., name: ..., startTime: ..., endTime: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertShiftRef(dataConnect, upsertShiftVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.shift_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.shift_upsert);
});
```

## UpsertDepartment
You can execute the `UpsertDepartment` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertDepartment(vars: UpsertDepartmentVariables): MutationPromise<UpsertDepartmentData, UpsertDepartmentVariables>;

interface UpsertDepartmentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertDepartmentVariables): MutationRef<UpsertDepartmentData, UpsertDepartmentVariables>;
}
export const upsertDepartmentRef: UpsertDepartmentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertDepartment(dc: DataConnect, vars: UpsertDepartmentVariables): MutationPromise<UpsertDepartmentData, UpsertDepartmentVariables>;

interface UpsertDepartmentRef {
  ...
  (dc: DataConnect, vars: UpsertDepartmentVariables): MutationRef<UpsertDepartmentData, UpsertDepartmentVariables>;
}
export const upsertDepartmentRef: UpsertDepartmentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertDepartmentRef:
```typescript
const name = upsertDepartmentRef.operationName;
console.log(name);
```

### Variables
The `UpsertDepartment` mutation requires an argument of type `UpsertDepartmentVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertDepartmentVariables {
  id: UUIDString;
  name: string;
}
```
### Return Type
Recall that executing the `UpsertDepartment` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertDepartmentData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertDepartmentData {
  department_upsert: Department_Key;
}
```
### Using `UpsertDepartment`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertDepartment, UpsertDepartmentVariables } from '@dataconnect/generated';

// The `UpsertDepartment` mutation requires an argument of type `UpsertDepartmentVariables`:
const upsertDepartmentVars: UpsertDepartmentVariables = {
  id: ..., 
  name: ..., 
};

// Call the `upsertDepartment()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertDepartment(upsertDepartmentVars);
// Variables can be defined inline as well.
const { data } = await upsertDepartment({ id: ..., name: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertDepartment(dataConnect, upsertDepartmentVars);

console.log(data.department_upsert);

// Or, you can use the `Promise` API.
upsertDepartment(upsertDepartmentVars).then((response) => {
  const data = response.data;
  console.log(data.department_upsert);
});
```

### Using `UpsertDepartment`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertDepartmentRef, UpsertDepartmentVariables } from '@dataconnect/generated';

// The `UpsertDepartment` mutation requires an argument of type `UpsertDepartmentVariables`:
const upsertDepartmentVars: UpsertDepartmentVariables = {
  id: ..., 
  name: ..., 
};

// Call the `upsertDepartmentRef()` function to get a reference to the mutation.
const ref = upsertDepartmentRef(upsertDepartmentVars);
// Variables can be defined inline as well.
const ref = upsertDepartmentRef({ id: ..., name: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertDepartmentRef(dataConnect, upsertDepartmentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.department_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.department_upsert);
});
```

## UpsertModuleProfile
You can execute the `UpsertModuleProfile` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertModuleProfile(vars: UpsertModuleProfileVariables): MutationPromise<UpsertModuleProfileData, UpsertModuleProfileVariables>;

interface UpsertModuleProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertModuleProfileVariables): MutationRef<UpsertModuleProfileData, UpsertModuleProfileVariables>;
}
export const upsertModuleProfileRef: UpsertModuleProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertModuleProfile(dc: DataConnect, vars: UpsertModuleProfileVariables): MutationPromise<UpsertModuleProfileData, UpsertModuleProfileVariables>;

interface UpsertModuleProfileRef {
  ...
  (dc: DataConnect, vars: UpsertModuleProfileVariables): MutationRef<UpsertModuleProfileData, UpsertModuleProfileVariables>;
}
export const upsertModuleProfileRef: UpsertModuleProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertModuleProfileRef:
```typescript
const name = upsertModuleProfileRef.operationName;
console.log(name);
```

### Variables
The `UpsertModuleProfile` mutation requires an argument of type `UpsertModuleProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertModuleProfileVariables {
  id: UUIDString;
  name: string;
}
```
### Return Type
Recall that executing the `UpsertModuleProfile` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertModuleProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertModuleProfileData {
  moduleProfile_upsert: ModuleProfile_Key;
}
```
### Using `UpsertModuleProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertModuleProfile, UpsertModuleProfileVariables } from '@dataconnect/generated';

// The `UpsertModuleProfile` mutation requires an argument of type `UpsertModuleProfileVariables`:
const upsertModuleProfileVars: UpsertModuleProfileVariables = {
  id: ..., 
  name: ..., 
};

// Call the `upsertModuleProfile()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertModuleProfile(upsertModuleProfileVars);
// Variables can be defined inline as well.
const { data } = await upsertModuleProfile({ id: ..., name: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertModuleProfile(dataConnect, upsertModuleProfileVars);

console.log(data.moduleProfile_upsert);

// Or, you can use the `Promise` API.
upsertModuleProfile(upsertModuleProfileVars).then((response) => {
  const data = response.data;
  console.log(data.moduleProfile_upsert);
});
```

### Using `UpsertModuleProfile`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertModuleProfileRef, UpsertModuleProfileVariables } from '@dataconnect/generated';

// The `UpsertModuleProfile` mutation requires an argument of type `UpsertModuleProfileVariables`:
const upsertModuleProfileVars: UpsertModuleProfileVariables = {
  id: ..., 
  name: ..., 
};

// Call the `upsertModuleProfileRef()` function to get a reference to the mutation.
const ref = upsertModuleProfileRef(upsertModuleProfileVars);
// Variables can be defined inline as well.
const ref = upsertModuleProfileRef({ id: ..., name: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertModuleProfileRef(dataConnect, upsertModuleProfileVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.moduleProfile_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.moduleProfile_upsert);
});
```

## UpsertTravelerTemplate
You can execute the `UpsertTravelerTemplate` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertTravelerTemplate(vars: UpsertTravelerTemplateVariables): MutationPromise<UpsertTravelerTemplateData, UpsertTravelerTemplateVariables>;

interface UpsertTravelerTemplateRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertTravelerTemplateVariables): MutationRef<UpsertTravelerTemplateData, UpsertTravelerTemplateVariables>;
}
export const upsertTravelerTemplateRef: UpsertTravelerTemplateRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertTravelerTemplate(dc: DataConnect, vars: UpsertTravelerTemplateVariables): MutationPromise<UpsertTravelerTemplateData, UpsertTravelerTemplateVariables>;

interface UpsertTravelerTemplateRef {
  ...
  (dc: DataConnect, vars: UpsertTravelerTemplateVariables): MutationRef<UpsertTravelerTemplateData, UpsertTravelerTemplateVariables>;
}
export const upsertTravelerTemplateRef: UpsertTravelerTemplateRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertTravelerTemplateRef:
```typescript
const name = upsertTravelerTemplateRef.operationName;
console.log(name);
```

### Variables
The `UpsertTravelerTemplate` mutation requires an argument of type `UpsertTravelerTemplateVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertTravelerTemplateVariables {
  id: UUIDString;
  name: string;
}
```
### Return Type
Recall that executing the `UpsertTravelerTemplate` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertTravelerTemplateData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertTravelerTemplateData {
  travelerTemplate_upsert: TravelerTemplate_Key;
}
```
### Using `UpsertTravelerTemplate`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertTravelerTemplate, UpsertTravelerTemplateVariables } from '@dataconnect/generated';

// The `UpsertTravelerTemplate` mutation requires an argument of type `UpsertTravelerTemplateVariables`:
const upsertTravelerTemplateVars: UpsertTravelerTemplateVariables = {
  id: ..., 
  name: ..., 
};

// Call the `upsertTravelerTemplate()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertTravelerTemplate(upsertTravelerTemplateVars);
// Variables can be defined inline as well.
const { data } = await upsertTravelerTemplate({ id: ..., name: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertTravelerTemplate(dataConnect, upsertTravelerTemplateVars);

console.log(data.travelerTemplate_upsert);

// Or, you can use the `Promise` API.
upsertTravelerTemplate(upsertTravelerTemplateVars).then((response) => {
  const data = response.data;
  console.log(data.travelerTemplate_upsert);
});
```

### Using `UpsertTravelerTemplate`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertTravelerTemplateRef, UpsertTravelerTemplateVariables } from '@dataconnect/generated';

// The `UpsertTravelerTemplate` mutation requires an argument of type `UpsertTravelerTemplateVariables`:
const upsertTravelerTemplateVars: UpsertTravelerTemplateVariables = {
  id: ..., 
  name: ..., 
};

// Call the `upsertTravelerTemplateRef()` function to get a reference to the mutation.
const ref = upsertTravelerTemplateRef(upsertTravelerTemplateVars);
// Variables can be defined inline as well.
const ref = upsertTravelerTemplateRef({ id: ..., name: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertTravelerTemplateRef(dataConnect, upsertTravelerTemplateVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.travelerTemplate_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.travelerTemplate_upsert);
});
```

## UpsertStation
You can execute the `UpsertStation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertStation(vars: UpsertStationVariables): MutationPromise<UpsertStationData, UpsertStationVariables>;

interface UpsertStationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertStationVariables): MutationRef<UpsertStationData, UpsertStationVariables>;
}
export const upsertStationRef: UpsertStationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertStation(dc: DataConnect, vars: UpsertStationVariables): MutationPromise<UpsertStationData, UpsertStationVariables>;

interface UpsertStationRef {
  ...
  (dc: DataConnect, vars: UpsertStationVariables): MutationRef<UpsertStationData, UpsertStationVariables>;
}
export const upsertStationRef: UpsertStationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertStationRef:
```typescript
const name = upsertStationRef.operationName;
console.log(name);
```

### Variables
The `UpsertStation` mutation requires an argument of type `UpsertStationVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertStationVariables {
  id: UUIDString;
  name: string;
  order?: number | null;
}
```
### Return Type
Recall that executing the `UpsertStation` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertStationData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertStationData {
  station_upsert: Station_Key;
}
```
### Using `UpsertStation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertStation, UpsertStationVariables } from '@dataconnect/generated';

// The `UpsertStation` mutation requires an argument of type `UpsertStationVariables`:
const upsertStationVars: UpsertStationVariables = {
  id: ..., 
  name: ..., 
  order: ..., // optional
};

// Call the `upsertStation()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertStation(upsertStationVars);
// Variables can be defined inline as well.
const { data } = await upsertStation({ id: ..., name: ..., order: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertStation(dataConnect, upsertStationVars);

console.log(data.station_upsert);

// Or, you can use the `Promise` API.
upsertStation(upsertStationVars).then((response) => {
  const data = response.data;
  console.log(data.station_upsert);
});
```

### Using `UpsertStation`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertStationRef, UpsertStationVariables } from '@dataconnect/generated';

// The `UpsertStation` mutation requires an argument of type `UpsertStationVariables`:
const upsertStationVars: UpsertStationVariables = {
  id: ..., 
  name: ..., 
  order: ..., // optional
};

// Call the `upsertStationRef()` function to get a reference to the mutation.
const ref = upsertStationRef(upsertStationVars);
// Variables can be defined inline as well.
const ref = upsertStationRef({ id: ..., name: ..., order: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertStationRef(dataConnect, upsertStationVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.station_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.station_upsert);
});
```

## UpsertWorker
You can execute the `UpsertWorker` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertWorker(vars: UpsertWorkerVariables): MutationPromise<UpsertWorkerData, UpsertWorkerVariables>;

interface UpsertWorkerRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertWorkerVariables): MutationRef<UpsertWorkerData, UpsertWorkerVariables>;
}
export const upsertWorkerRef: UpsertWorkerRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertWorker(dc: DataConnect, vars: UpsertWorkerVariables): MutationPromise<UpsertWorkerData, UpsertWorkerVariables>;

interface UpsertWorkerRef {
  ...
  (dc: DataConnect, vars: UpsertWorkerVariables): MutationRef<UpsertWorkerData, UpsertWorkerVariables>;
}
export const upsertWorkerRef: UpsertWorkerRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertWorkerRef:
```typescript
const name = upsertWorkerRef.operationName;
console.log(name);
```

### Variables
The `UpsertWorker` mutation requires an argument of type `UpsertWorkerVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertWorkerVariables {
  id: UUIDString;
  firstName: string;
  lastName: string;
  stationId?: UUIDString | null;
  role?: WorkerRole | null;
}
```
### Return Type
Recall that executing the `UpsertWorker` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertWorkerData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertWorkerData {
  worker_upsert: Worker_Key;
}
```
### Using `UpsertWorker`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertWorker, UpsertWorkerVariables } from '@dataconnect/generated';

// The `UpsertWorker` mutation requires an argument of type `UpsertWorkerVariables`:
const upsertWorkerVars: UpsertWorkerVariables = {
  id: ..., 
  firstName: ..., 
  lastName: ..., 
  stationId: ..., // optional
  role: ..., // optional
};

// Call the `upsertWorker()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertWorker(upsertWorkerVars);
// Variables can be defined inline as well.
const { data } = await upsertWorker({ id: ..., firstName: ..., lastName: ..., stationId: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertWorker(dataConnect, upsertWorkerVars);

console.log(data.worker_upsert);

// Or, you can use the `Promise` API.
upsertWorker(upsertWorkerVars).then((response) => {
  const data = response.data;
  console.log(data.worker_upsert);
});
```

### Using `UpsertWorker`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertWorkerRef, UpsertWorkerVariables } from '@dataconnect/generated';

// The `UpsertWorker` mutation requires an argument of type `UpsertWorkerVariables`:
const upsertWorkerVars: UpsertWorkerVariables = {
  id: ..., 
  firstName: ..., 
  lastName: ..., 
  stationId: ..., // optional
  role: ..., // optional
};

// Call the `upsertWorkerRef()` function to get a reference to the mutation.
const ref = upsertWorkerRef(upsertWorkerVars);
// Variables can be defined inline as well.
const ref = upsertWorkerRef({ id: ..., firstName: ..., lastName: ..., stationId: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertWorkerRef(dataConnect, upsertWorkerVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.worker_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.worker_upsert);
});
```

## UpsertProject
You can execute the `UpsertProject` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertProject(vars: UpsertProjectVariables): MutationPromise<UpsertProjectData, UpsertProjectVariables>;

interface UpsertProjectRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertProjectVariables): MutationRef<UpsertProjectData, UpsertProjectVariables>;
}
export const upsertProjectRef: UpsertProjectRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertProject(dc: DataConnect, vars: UpsertProjectVariables): MutationPromise<UpsertProjectData, UpsertProjectVariables>;

interface UpsertProjectRef {
  ...
  (dc: DataConnect, vars: UpsertProjectVariables): MutationRef<UpsertProjectData, UpsertProjectVariables>;
}
export const upsertProjectRef: UpsertProjectRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertProjectRef:
```typescript
const name = upsertProjectRef.operationName;
console.log(name);
```

### Variables
The `UpsertProject` mutation requires an argument of type `UpsertProjectVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertProjectVariables {
  id: UUIDString;
  name: string;
}
```
### Return Type
Recall that executing the `UpsertProject` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertProjectData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertProjectData {
  project_upsert: Project_Key;
}
```
### Using `UpsertProject`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertProject, UpsertProjectVariables } from '@dataconnect/generated';

// The `UpsertProject` mutation requires an argument of type `UpsertProjectVariables`:
const upsertProjectVars: UpsertProjectVariables = {
  id: ..., 
  name: ..., 
};

// Call the `upsertProject()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertProject(upsertProjectVars);
// Variables can be defined inline as well.
const { data } = await upsertProject({ id: ..., name: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertProject(dataConnect, upsertProjectVars);

console.log(data.project_upsert);

// Or, you can use the `Promise` API.
upsertProject(upsertProjectVars).then((response) => {
  const data = response.data;
  console.log(data.project_upsert);
});
```

### Using `UpsertProject`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertProjectRef, UpsertProjectVariables } from '@dataconnect/generated';

// The `UpsertProject` mutation requires an argument of type `UpsertProjectVariables`:
const upsertProjectVars: UpsertProjectVariables = {
  id: ..., 
  name: ..., 
};

// Call the `upsertProjectRef()` function to get a reference to the mutation.
const ref = upsertProjectRef(upsertProjectVars);
// Variables can be defined inline as well.
const ref = upsertProjectRef({ id: ..., name: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertProjectRef(dataConnect, upsertProjectVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.project_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.project_upsert);
});
```

## UpsertModuleProfileWithProject
You can execute the `UpsertModuleProfileWithProject` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertModuleProfileWithProject(vars: UpsertModuleProfileWithProjectVariables): MutationPromise<UpsertModuleProfileWithProjectData, UpsertModuleProfileWithProjectVariables>;

interface UpsertModuleProfileWithProjectRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertModuleProfileWithProjectVariables): MutationRef<UpsertModuleProfileWithProjectData, UpsertModuleProfileWithProjectVariables>;
}
export const upsertModuleProfileWithProjectRef: UpsertModuleProfileWithProjectRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertModuleProfileWithProject(dc: DataConnect, vars: UpsertModuleProfileWithProjectVariables): MutationPromise<UpsertModuleProfileWithProjectData, UpsertModuleProfileWithProjectVariables>;

interface UpsertModuleProfileWithProjectRef {
  ...
  (dc: DataConnect, vars: UpsertModuleProfileWithProjectVariables): MutationRef<UpsertModuleProfileWithProjectData, UpsertModuleProfileWithProjectVariables>;
}
export const upsertModuleProfileWithProjectRef: UpsertModuleProfileWithProjectRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertModuleProfileWithProjectRef:
```typescript
const name = upsertModuleProfileWithProjectRef.operationName;
console.log(name);
```

### Variables
The `UpsertModuleProfileWithProject` mutation requires an argument of type `UpsertModuleProfileWithProjectVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertModuleProfileWithProjectVariables {
  id: UUIDString;
  name: string;
  projectId: UUIDString;
}
```
### Return Type
Recall that executing the `UpsertModuleProfileWithProject` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertModuleProfileWithProjectData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertModuleProfileWithProjectData {
  moduleProfile_upsert: ModuleProfile_Key;
}
```
### Using `UpsertModuleProfileWithProject`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertModuleProfileWithProject, UpsertModuleProfileWithProjectVariables } from '@dataconnect/generated';

// The `UpsertModuleProfileWithProject` mutation requires an argument of type `UpsertModuleProfileWithProjectVariables`:
const upsertModuleProfileWithProjectVars: UpsertModuleProfileWithProjectVariables = {
  id: ..., 
  name: ..., 
  projectId: ..., 
};

// Call the `upsertModuleProfileWithProject()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertModuleProfileWithProject(upsertModuleProfileWithProjectVars);
// Variables can be defined inline as well.
const { data } = await upsertModuleProfileWithProject({ id: ..., name: ..., projectId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertModuleProfileWithProject(dataConnect, upsertModuleProfileWithProjectVars);

console.log(data.moduleProfile_upsert);

// Or, you can use the `Promise` API.
upsertModuleProfileWithProject(upsertModuleProfileWithProjectVars).then((response) => {
  const data = response.data;
  console.log(data.moduleProfile_upsert);
});
```

### Using `UpsertModuleProfileWithProject`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertModuleProfileWithProjectRef, UpsertModuleProfileWithProjectVariables } from '@dataconnect/generated';

// The `UpsertModuleProfileWithProject` mutation requires an argument of type `UpsertModuleProfileWithProjectVariables`:
const upsertModuleProfileWithProjectVars: UpsertModuleProfileWithProjectVariables = {
  id: ..., 
  name: ..., 
  projectId: ..., 
};

// Call the `upsertModuleProfileWithProjectRef()` function to get a reference to the mutation.
const ref = upsertModuleProfileWithProjectRef(upsertModuleProfileWithProjectVars);
// Variables can be defined inline as well.
const ref = upsertModuleProfileWithProjectRef({ id: ..., name: ..., projectId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertModuleProfileWithProjectRef(dataConnect, upsertModuleProfileWithProjectVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.moduleProfile_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.moduleProfile_upsert);
});
```

## UpsertModuleAttribute
You can execute the `UpsertModuleAttribute` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertModuleAttribute(vars: UpsertModuleAttributeVariables): MutationPromise<UpsertModuleAttributeData, UpsertModuleAttributeVariables>;

interface UpsertModuleAttributeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertModuleAttributeVariables): MutationRef<UpsertModuleAttributeData, UpsertModuleAttributeVariables>;
}
export const upsertModuleAttributeRef: UpsertModuleAttributeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertModuleAttribute(dc: DataConnect, vars: UpsertModuleAttributeVariables): MutationPromise<UpsertModuleAttributeData, UpsertModuleAttributeVariables>;

interface UpsertModuleAttributeRef {
  ...
  (dc: DataConnect, vars: UpsertModuleAttributeVariables): MutationRef<UpsertModuleAttributeData, UpsertModuleAttributeVariables>;
}
export const upsertModuleAttributeRef: UpsertModuleAttributeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertModuleAttributeRef:
```typescript
const name = upsertModuleAttributeRef.operationName;
console.log(name);
```

### Variables
The `UpsertModuleAttribute` mutation requires an argument of type `UpsertModuleAttributeVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertModuleAttributeVariables {
  id: UUIDString;
  name: string;
  type: ModuleAttributeType;
}
```
### Return Type
Recall that executing the `UpsertModuleAttribute` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertModuleAttributeData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertModuleAttributeData {
  moduleAttribute_upsert: ModuleAttribute_Key;
}
```
### Using `UpsertModuleAttribute`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertModuleAttribute, UpsertModuleAttributeVariables } from '@dataconnect/generated';

// The `UpsertModuleAttribute` mutation requires an argument of type `UpsertModuleAttributeVariables`:
const upsertModuleAttributeVars: UpsertModuleAttributeVariables = {
  id: ..., 
  name: ..., 
  type: ..., 
};

// Call the `upsertModuleAttribute()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertModuleAttribute(upsertModuleAttributeVars);
// Variables can be defined inline as well.
const { data } = await upsertModuleAttribute({ id: ..., name: ..., type: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertModuleAttribute(dataConnect, upsertModuleAttributeVars);

console.log(data.moduleAttribute_upsert);

// Or, you can use the `Promise` API.
upsertModuleAttribute(upsertModuleAttributeVars).then((response) => {
  const data = response.data;
  console.log(data.moduleAttribute_upsert);
});
```

### Using `UpsertModuleAttribute`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertModuleAttributeRef, UpsertModuleAttributeVariables } from '@dataconnect/generated';

// The `UpsertModuleAttribute` mutation requires an argument of type `UpsertModuleAttributeVariables`:
const upsertModuleAttributeVars: UpsertModuleAttributeVariables = {
  id: ..., 
  name: ..., 
  type: ..., 
};

// Call the `upsertModuleAttributeRef()` function to get a reference to the mutation.
const ref = upsertModuleAttributeRef(upsertModuleAttributeVars);
// Variables can be defined inline as well.
const ref = upsertModuleAttributeRef({ id: ..., name: ..., type: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertModuleAttributeRef(dataConnect, upsertModuleAttributeVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.moduleAttribute_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.moduleAttribute_upsert);
});
```

## UpsertModuleProfileModuleAttribute
You can execute the `UpsertModuleProfileModuleAttribute` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertModuleProfileModuleAttribute(vars: UpsertModuleProfileModuleAttributeVariables): MutationPromise<UpsertModuleProfileModuleAttributeData, UpsertModuleProfileModuleAttributeVariables>;

interface UpsertModuleProfileModuleAttributeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertModuleProfileModuleAttributeVariables): MutationRef<UpsertModuleProfileModuleAttributeData, UpsertModuleProfileModuleAttributeVariables>;
}
export const upsertModuleProfileModuleAttributeRef: UpsertModuleProfileModuleAttributeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertModuleProfileModuleAttribute(dc: DataConnect, vars: UpsertModuleProfileModuleAttributeVariables): MutationPromise<UpsertModuleProfileModuleAttributeData, UpsertModuleProfileModuleAttributeVariables>;

interface UpsertModuleProfileModuleAttributeRef {
  ...
  (dc: DataConnect, vars: UpsertModuleProfileModuleAttributeVariables): MutationRef<UpsertModuleProfileModuleAttributeData, UpsertModuleProfileModuleAttributeVariables>;
}
export const upsertModuleProfileModuleAttributeRef: UpsertModuleProfileModuleAttributeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertModuleProfileModuleAttributeRef:
```typescript
const name = upsertModuleProfileModuleAttributeRef.operationName;
console.log(name);
```

### Variables
The `UpsertModuleProfileModuleAttribute` mutation requires an argument of type `UpsertModuleProfileModuleAttributeVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertModuleProfileModuleAttributeVariables {
  id: UUIDString;
  profileId: UUIDString;
  attributeId: UUIDString;
  value: string;
}
```
### Return Type
Recall that executing the `UpsertModuleProfileModuleAttribute` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertModuleProfileModuleAttributeData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertModuleProfileModuleAttributeData {
  moduleProfileModuleAttribute_upsert: ModuleProfileModuleAttribute_Key;
}
```
### Using `UpsertModuleProfileModuleAttribute`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertModuleProfileModuleAttribute, UpsertModuleProfileModuleAttributeVariables } from '@dataconnect/generated';

// The `UpsertModuleProfileModuleAttribute` mutation requires an argument of type `UpsertModuleProfileModuleAttributeVariables`:
const upsertModuleProfileModuleAttributeVars: UpsertModuleProfileModuleAttributeVariables = {
  id: ..., 
  profileId: ..., 
  attributeId: ..., 
  value: ..., 
};

// Call the `upsertModuleProfileModuleAttribute()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertModuleProfileModuleAttribute(upsertModuleProfileModuleAttributeVars);
// Variables can be defined inline as well.
const { data } = await upsertModuleProfileModuleAttribute({ id: ..., profileId: ..., attributeId: ..., value: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertModuleProfileModuleAttribute(dataConnect, upsertModuleProfileModuleAttributeVars);

console.log(data.moduleProfileModuleAttribute_upsert);

// Or, you can use the `Promise` API.
upsertModuleProfileModuleAttribute(upsertModuleProfileModuleAttributeVars).then((response) => {
  const data = response.data;
  console.log(data.moduleProfileModuleAttribute_upsert);
});
```

### Using `UpsertModuleProfileModuleAttribute`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertModuleProfileModuleAttributeRef, UpsertModuleProfileModuleAttributeVariables } from '@dataconnect/generated';

// The `UpsertModuleProfileModuleAttribute` mutation requires an argument of type `UpsertModuleProfileModuleAttributeVariables`:
const upsertModuleProfileModuleAttributeVars: UpsertModuleProfileModuleAttributeVariables = {
  id: ..., 
  profileId: ..., 
  attributeId: ..., 
  value: ..., 
};

// Call the `upsertModuleProfileModuleAttributeRef()` function to get a reference to the mutation.
const ref = upsertModuleProfileModuleAttributeRef(upsertModuleProfileModuleAttributeVars);
// Variables can be defined inline as well.
const ref = upsertModuleProfileModuleAttributeRef({ id: ..., profileId: ..., attributeId: ..., value: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertModuleProfileModuleAttributeRef(dataConnect, upsertModuleProfileModuleAttributeVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.moduleProfileModuleAttribute_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.moduleProfileModuleAttribute_upsert);
});
```

## UpsertTaskTemplate
You can execute the `UpsertTaskTemplate` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertTaskTemplate(vars: UpsertTaskTemplateVariables): MutationPromise<UpsertTaskTemplateData, UpsertTaskTemplateVariables>;

interface UpsertTaskTemplateRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertTaskTemplateVariables): MutationRef<UpsertTaskTemplateData, UpsertTaskTemplateVariables>;
}
export const upsertTaskTemplateRef: UpsertTaskTemplateRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertTaskTemplate(dc: DataConnect, vars: UpsertTaskTemplateVariables): MutationPromise<UpsertTaskTemplateData, UpsertTaskTemplateVariables>;

interface UpsertTaskTemplateRef {
  ...
  (dc: DataConnect, vars: UpsertTaskTemplateVariables): MutationRef<UpsertTaskTemplateData, UpsertTaskTemplateVariables>;
}
export const upsertTaskTemplateRef: UpsertTaskTemplateRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertTaskTemplateRef:
```typescript
const name = upsertTaskTemplateRef.operationName;
console.log(name);
```

### Variables
The `UpsertTaskTemplate` mutation requires an argument of type `UpsertTaskTemplateVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `UpsertTaskTemplate` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertTaskTemplateData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertTaskTemplateData {
  taskTemplate_upsert: TaskTemplate_Key;
}
```
### Using `UpsertTaskTemplate`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertTaskTemplate, UpsertTaskTemplateVariables } from '@dataconnect/generated';

// The `UpsertTaskTemplate` mutation requires an argument of type `UpsertTaskTemplateVariables`:
const upsertTaskTemplateVars: UpsertTaskTemplateVariables = {
  id: ..., 
  name: ..., 
  stationId: ..., 
  departmentId: ..., 
  order: ..., 
  minWorkers: ..., 
  maxWorkers: ..., 
  type: ..., 
};

// Call the `upsertTaskTemplate()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertTaskTemplate(upsertTaskTemplateVars);
// Variables can be defined inline as well.
const { data } = await upsertTaskTemplate({ id: ..., name: ..., stationId: ..., departmentId: ..., order: ..., minWorkers: ..., maxWorkers: ..., type: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertTaskTemplate(dataConnect, upsertTaskTemplateVars);

console.log(data.taskTemplate_upsert);

// Or, you can use the `Promise` API.
upsertTaskTemplate(upsertTaskTemplateVars).then((response) => {
  const data = response.data;
  console.log(data.taskTemplate_upsert);
});
```

### Using `UpsertTaskTemplate`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertTaskTemplateRef, UpsertTaskTemplateVariables } from '@dataconnect/generated';

// The `UpsertTaskTemplate` mutation requires an argument of type `UpsertTaskTemplateVariables`:
const upsertTaskTemplateVars: UpsertTaskTemplateVariables = {
  id: ..., 
  name: ..., 
  stationId: ..., 
  departmentId: ..., 
  order: ..., 
  minWorkers: ..., 
  maxWorkers: ..., 
  type: ..., 
};

// Call the `upsertTaskTemplateRef()` function to get a reference to the mutation.
const ref = upsertTaskTemplateRef(upsertTaskTemplateVars);
// Variables can be defined inline as well.
const ref = upsertTaskTemplateRef({ id: ..., name: ..., stationId: ..., departmentId: ..., order: ..., minWorkers: ..., maxWorkers: ..., type: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertTaskTemplateRef(dataConnect, upsertTaskTemplateVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.taskTemplate_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.taskTemplate_upsert);
});
```

## LinkTaskTemplatePrereq
You can execute the `LinkTaskTemplatePrereq` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
linkTaskTemplatePrereq(vars: LinkTaskTemplatePrereqVariables): MutationPromise<LinkTaskTemplatePrereqData, LinkTaskTemplatePrereqVariables>;

interface LinkTaskTemplatePrereqRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: LinkTaskTemplatePrereqVariables): MutationRef<LinkTaskTemplatePrereqData, LinkTaskTemplatePrereqVariables>;
}
export const linkTaskTemplatePrereqRef: LinkTaskTemplatePrereqRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
linkTaskTemplatePrereq(dc: DataConnect, vars: LinkTaskTemplatePrereqVariables): MutationPromise<LinkTaskTemplatePrereqData, LinkTaskTemplatePrereqVariables>;

interface LinkTaskTemplatePrereqRef {
  ...
  (dc: DataConnect, vars: LinkTaskTemplatePrereqVariables): MutationRef<LinkTaskTemplatePrereqData, LinkTaskTemplatePrereqVariables>;
}
export const linkTaskTemplatePrereqRef: LinkTaskTemplatePrereqRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the linkTaskTemplatePrereqRef:
```typescript
const name = linkTaskTemplatePrereqRef.operationName;
console.log(name);
```

### Variables
The `LinkTaskTemplatePrereq` mutation requires an argument of type `LinkTaskTemplatePrereqVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface LinkTaskTemplatePrereqVariables {
  id: UUIDString;
  prereqId: UUIDString;
}
```
### Return Type
Recall that executing the `LinkTaskTemplatePrereq` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `LinkTaskTemplatePrereqData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface LinkTaskTemplatePrereqData {
  taskTemplate_update?: TaskTemplate_Key | null;
}
```
### Using `LinkTaskTemplatePrereq`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, linkTaskTemplatePrereq, LinkTaskTemplatePrereqVariables } from '@dataconnect/generated';

// The `LinkTaskTemplatePrereq` mutation requires an argument of type `LinkTaskTemplatePrereqVariables`:
const linkTaskTemplatePrereqVars: LinkTaskTemplatePrereqVariables = {
  id: ..., 
  prereqId: ..., 
};

// Call the `linkTaskTemplatePrereq()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await linkTaskTemplatePrereq(linkTaskTemplatePrereqVars);
// Variables can be defined inline as well.
const { data } = await linkTaskTemplatePrereq({ id: ..., prereqId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await linkTaskTemplatePrereq(dataConnect, linkTaskTemplatePrereqVars);

console.log(data.taskTemplate_update);

// Or, you can use the `Promise` API.
linkTaskTemplatePrereq(linkTaskTemplatePrereqVars).then((response) => {
  const data = response.data;
  console.log(data.taskTemplate_update);
});
```

### Using `LinkTaskTemplatePrereq`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, linkTaskTemplatePrereqRef, LinkTaskTemplatePrereqVariables } from '@dataconnect/generated';

// The `LinkTaskTemplatePrereq` mutation requires an argument of type `LinkTaskTemplatePrereqVariables`:
const linkTaskTemplatePrereqVars: LinkTaskTemplatePrereqVariables = {
  id: ..., 
  prereqId: ..., 
};

// Call the `linkTaskTemplatePrereqRef()` function to get a reference to the mutation.
const ref = linkTaskTemplatePrereqRef(linkTaskTemplatePrereqVars);
// Variables can be defined inline as well.
const ref = linkTaskTemplatePrereqRef({ id: ..., prereqId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = linkTaskTemplatePrereqRef(dataConnect, linkTaskTemplatePrereqVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.taskTemplate_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.taskTemplate_update);
});
```

## UpsertTimeStudy
You can execute the `UpsertTimeStudy` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertTimeStudy(vars: UpsertTimeStudyVariables): MutationPromise<UpsertTimeStudyData, UpsertTimeStudyVariables>;

interface UpsertTimeStudyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertTimeStudyVariables): MutationRef<UpsertTimeStudyData, UpsertTimeStudyVariables>;
}
export const upsertTimeStudyRef: UpsertTimeStudyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertTimeStudy(dc: DataConnect, vars: UpsertTimeStudyVariables): MutationPromise<UpsertTimeStudyData, UpsertTimeStudyVariables>;

interface UpsertTimeStudyRef {
  ...
  (dc: DataConnect, vars: UpsertTimeStudyVariables): MutationRef<UpsertTimeStudyData, UpsertTimeStudyVariables>;
}
export const upsertTimeStudyRef: UpsertTimeStudyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertTimeStudyRef:
```typescript
const name = upsertTimeStudyRef.operationName;
console.log(name);
```

### Variables
The `UpsertTimeStudy` mutation requires an argument of type `UpsertTimeStudyVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertTimeStudyVariables {
  id: UUIDString;
  taskTemplateId: UUIDString;
  clockTime: number;
  workerCount: number;
}
```
### Return Type
Recall that executing the `UpsertTimeStudy` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertTimeStudyData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertTimeStudyData {
  timeStudy_upsert: TimeStudy_Key;
}
```
### Using `UpsertTimeStudy`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertTimeStudy, UpsertTimeStudyVariables } from '@dataconnect/generated';

// The `UpsertTimeStudy` mutation requires an argument of type `UpsertTimeStudyVariables`:
const upsertTimeStudyVars: UpsertTimeStudyVariables = {
  id: ..., 
  taskTemplateId: ..., 
  clockTime: ..., 
  workerCount: ..., 
};

// Call the `upsertTimeStudy()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertTimeStudy(upsertTimeStudyVars);
// Variables can be defined inline as well.
const { data } = await upsertTimeStudy({ id: ..., taskTemplateId: ..., clockTime: ..., workerCount: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertTimeStudy(dataConnect, upsertTimeStudyVars);

console.log(data.timeStudy_upsert);

// Or, you can use the `Promise` API.
upsertTimeStudy(upsertTimeStudyVars).then((response) => {
  const data = response.data;
  console.log(data.timeStudy_upsert);
});
```

### Using `UpsertTimeStudy`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertTimeStudyRef, UpsertTimeStudyVariables } from '@dataconnect/generated';

// The `UpsertTimeStudy` mutation requires an argument of type `UpsertTimeStudyVariables`:
const upsertTimeStudyVars: UpsertTimeStudyVariables = {
  id: ..., 
  taskTemplateId: ..., 
  clockTime: ..., 
  workerCount: ..., 
};

// Call the `upsertTimeStudyRef()` function to get a reference to the mutation.
const ref = upsertTimeStudyRef(upsertTimeStudyVars);
// Variables can be defined inline as well.
const ref = upsertTimeStudyRef({ id: ..., taskTemplateId: ..., clockTime: ..., workerCount: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertTimeStudyRef(dataConnect, upsertTimeStudyVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.timeStudy_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.timeStudy_upsert);
});
```

## UpsertTimeStudyModuleAttribute
You can execute the `UpsertTimeStudyModuleAttribute` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertTimeStudyModuleAttribute(vars: UpsertTimeStudyModuleAttributeVariables): MutationPromise<UpsertTimeStudyModuleAttributeData, UpsertTimeStudyModuleAttributeVariables>;

interface UpsertTimeStudyModuleAttributeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertTimeStudyModuleAttributeVariables): MutationRef<UpsertTimeStudyModuleAttributeData, UpsertTimeStudyModuleAttributeVariables>;
}
export const upsertTimeStudyModuleAttributeRef: UpsertTimeStudyModuleAttributeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertTimeStudyModuleAttribute(dc: DataConnect, vars: UpsertTimeStudyModuleAttributeVariables): MutationPromise<UpsertTimeStudyModuleAttributeData, UpsertTimeStudyModuleAttributeVariables>;

interface UpsertTimeStudyModuleAttributeRef {
  ...
  (dc: DataConnect, vars: UpsertTimeStudyModuleAttributeVariables): MutationRef<UpsertTimeStudyModuleAttributeData, UpsertTimeStudyModuleAttributeVariables>;
}
export const upsertTimeStudyModuleAttributeRef: UpsertTimeStudyModuleAttributeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertTimeStudyModuleAttributeRef:
```typescript
const name = upsertTimeStudyModuleAttributeRef.operationName;
console.log(name);
```

### Variables
The `UpsertTimeStudyModuleAttribute` mutation requires an argument of type `UpsertTimeStudyModuleAttributeVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertTimeStudyModuleAttributeVariables {
  id: UUIDString;
  timeStudyId: UUIDString;
  attributeId: UUIDString;
  value: string;
}
```
### Return Type
Recall that executing the `UpsertTimeStudyModuleAttribute` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertTimeStudyModuleAttributeData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertTimeStudyModuleAttributeData {
  timeStudyModuleAttribute_upsert: TimeStudyModuleAttribute_Key;
}
```
### Using `UpsertTimeStudyModuleAttribute`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertTimeStudyModuleAttribute, UpsertTimeStudyModuleAttributeVariables } from '@dataconnect/generated';

// The `UpsertTimeStudyModuleAttribute` mutation requires an argument of type `UpsertTimeStudyModuleAttributeVariables`:
const upsertTimeStudyModuleAttributeVars: UpsertTimeStudyModuleAttributeVariables = {
  id: ..., 
  timeStudyId: ..., 
  attributeId: ..., 
  value: ..., 
};

// Call the `upsertTimeStudyModuleAttribute()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertTimeStudyModuleAttribute(upsertTimeStudyModuleAttributeVars);
// Variables can be defined inline as well.
const { data } = await upsertTimeStudyModuleAttribute({ id: ..., timeStudyId: ..., attributeId: ..., value: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertTimeStudyModuleAttribute(dataConnect, upsertTimeStudyModuleAttributeVars);

console.log(data.timeStudyModuleAttribute_upsert);

// Or, you can use the `Promise` API.
upsertTimeStudyModuleAttribute(upsertTimeStudyModuleAttributeVars).then((response) => {
  const data = response.data;
  console.log(data.timeStudyModuleAttribute_upsert);
});
```

### Using `UpsertTimeStudyModuleAttribute`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertTimeStudyModuleAttributeRef, UpsertTimeStudyModuleAttributeVariables } from '@dataconnect/generated';

// The `UpsertTimeStudyModuleAttribute` mutation requires an argument of type `UpsertTimeStudyModuleAttributeVariables`:
const upsertTimeStudyModuleAttributeVars: UpsertTimeStudyModuleAttributeVariables = {
  id: ..., 
  timeStudyId: ..., 
  attributeId: ..., 
  value: ..., 
};

// Call the `upsertTimeStudyModuleAttributeRef()` function to get a reference to the mutation.
const ref = upsertTimeStudyModuleAttributeRef(upsertTimeStudyModuleAttributeVars);
// Variables can be defined inline as well.
const ref = upsertTimeStudyModuleAttributeRef({ id: ..., timeStudyId: ..., attributeId: ..., value: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertTimeStudyModuleAttributeRef(dataConnect, upsertTimeStudyModuleAttributeVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.timeStudyModuleAttribute_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.timeStudyModuleAttribute_upsert);
});
```

