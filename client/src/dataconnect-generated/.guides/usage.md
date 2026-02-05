# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useUpsertShift, useUpsertDepartment, useUpsertModuleProfile, useUpsertTravelerTemplate, useUpsertStation, useUpsertWorker, useUpsertProject, useUpsertModuleProfileWithProject, useUpsertModuleAttribute, useUpsertModuleProfileModuleAttribute } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useUpsertShift(upsertShiftVars);

const { data, isPending, isSuccess, isError, error } = useUpsertDepartment(upsertDepartmentVars);

const { data, isPending, isSuccess, isError, error } = useUpsertModuleProfile(upsertModuleProfileVars);

const { data, isPending, isSuccess, isError, error } = useUpsertTravelerTemplate(upsertTravelerTemplateVars);

const { data, isPending, isSuccess, isError, error } = useUpsertStation(upsertStationVars);

const { data, isPending, isSuccess, isError, error } = useUpsertWorker(upsertWorkerVars);

const { data, isPending, isSuccess, isError, error } = useUpsertProject(upsertProjectVars);

const { data, isPending, isSuccess, isError, error } = useUpsertModuleProfileWithProject(upsertModuleProfileWithProjectVars);

const { data, isPending, isSuccess, isError, error } = useUpsertModuleAttribute(upsertModuleAttributeVars);

const { data, isPending, isSuccess, isError, error } = useUpsertModuleProfileModuleAttribute(upsertModuleProfileModuleAttributeVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { upsertShift, upsertDepartment, upsertModuleProfile, upsertTravelerTemplate, upsertStation, upsertWorker, upsertProject, upsertModuleProfileWithProject, upsertModuleAttribute, upsertModuleProfileModuleAttribute } from '@dataconnect/generated';


// Operation UpsertShift:  For variables, look at type UpsertShiftVars in ../index.d.ts
const { data } = await UpsertShift(dataConnect, upsertShiftVars);

// Operation UpsertDepartment:  For variables, look at type UpsertDepartmentVars in ../index.d.ts
const { data } = await UpsertDepartment(dataConnect, upsertDepartmentVars);

// Operation UpsertModuleProfile:  For variables, look at type UpsertModuleProfileVars in ../index.d.ts
const { data } = await UpsertModuleProfile(dataConnect, upsertModuleProfileVars);

// Operation UpsertTravelerTemplate:  For variables, look at type UpsertTravelerTemplateVars in ../index.d.ts
const { data } = await UpsertTravelerTemplate(dataConnect, upsertTravelerTemplateVars);

// Operation UpsertStation:  For variables, look at type UpsertStationVars in ../index.d.ts
const { data } = await UpsertStation(dataConnect, upsertStationVars);

// Operation UpsertWorker:  For variables, look at type UpsertWorkerVars in ../index.d.ts
const { data } = await UpsertWorker(dataConnect, upsertWorkerVars);

// Operation UpsertProject:  For variables, look at type UpsertProjectVars in ../index.d.ts
const { data } = await UpsertProject(dataConnect, upsertProjectVars);

// Operation UpsertModuleProfileWithProject:  For variables, look at type UpsertModuleProfileWithProjectVars in ../index.d.ts
const { data } = await UpsertModuleProfileWithProject(dataConnect, upsertModuleProfileWithProjectVars);

// Operation UpsertModuleAttribute:  For variables, look at type UpsertModuleAttributeVars in ../index.d.ts
const { data } = await UpsertModuleAttribute(dataConnect, upsertModuleAttributeVars);

// Operation UpsertModuleProfileModuleAttribute:  For variables, look at type UpsertModuleProfileModuleAttributeVars in ../index.d.ts
const { data } = await UpsertModuleProfileModuleAttribute(dataConnect, upsertModuleProfileModuleAttributeVars);


```