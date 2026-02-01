# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useUpsertShift, useUpsertDepartment, useUpsertModuleProfile, useUpsertTravelerTemplate, useListShifts, useListDepartments, useListModuleProfiles, useListTravelerTemplates } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useUpsertShift(upsertShiftVars);

const { data, isPending, isSuccess, isError, error } = useUpsertDepartment(upsertDepartmentVars);

const { data, isPending, isSuccess, isError, error } = useUpsertModuleProfile(upsertModuleProfileVars);

const { data, isPending, isSuccess, isError, error } = useUpsertTravelerTemplate(upsertTravelerTemplateVars);

const { data, isPending, isSuccess, isError, error } = useListShifts();

const { data, isPending, isSuccess, isError, error } = useListDepartments();

const { data, isPending, isSuccess, isError, error } = useListModuleProfiles();

const { data, isPending, isSuccess, isError, error } = useListTravelerTemplates();

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
import { upsertShift, upsertDepartment, upsertModuleProfile, upsertTravelerTemplate, listShifts, listDepartments, listModuleProfiles, listTravelerTemplates } from '@dataconnect/generated';


// Operation UpsertShift:  For variables, look at type UpsertShiftVars in ../index.d.ts
const { data } = await UpsertShift(dataConnect, upsertShiftVars);

// Operation UpsertDepartment:  For variables, look at type UpsertDepartmentVars in ../index.d.ts
const { data } = await UpsertDepartment(dataConnect, upsertDepartmentVars);

// Operation UpsertModuleProfile:  For variables, look at type UpsertModuleProfileVars in ../index.d.ts
const { data } = await UpsertModuleProfile(dataConnect, upsertModuleProfileVars);

// Operation UpsertTravelerTemplate:  For variables, look at type UpsertTravelerTemplateVars in ../index.d.ts
const { data } = await UpsertTravelerTemplate(dataConnect, upsertTravelerTemplateVars);

// Operation ListShifts: 
const { data } = await ListShifts(dataConnect);

// Operation ListDepartments: 
const { data } = await ListDepartments(dataConnect);

// Operation ListModuleProfiles: 
const { data } = await ListModuleProfiles(dataConnect);

// Operation ListTravelerTemplates: 
const { data } = await ListTravelerTemplates(dataConnect);


```