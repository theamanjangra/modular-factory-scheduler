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

