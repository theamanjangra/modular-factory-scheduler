# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `chat`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetChatSession*](#getchatsession)
  - [*ListChatMessages*](#listchatmessages)
- [**Mutations**](#mutations)
  - [*CreateChatSession*](#createchatsession)
  - [*AddChatMessage*](#addchatmessage)
  - [*DeleteChatSession*](#deletechatsession)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `chat`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

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

Below are examples of how to use the `chat` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetChatSession
You can execute the `GetChatSession` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [chat/index.d.ts](./index.d.ts):
```typescript
getChatSession(vars: GetChatSessionVariables): QueryPromise<GetChatSessionData, GetChatSessionVariables>;

interface GetChatSessionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetChatSessionVariables): QueryRef<GetChatSessionData, GetChatSessionVariables>;
}
export const getChatSessionRef: GetChatSessionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getChatSession(dc: DataConnect, vars: GetChatSessionVariables): QueryPromise<GetChatSessionData, GetChatSessionVariables>;

interface GetChatSessionRef {
  ...
  (dc: DataConnect, vars: GetChatSessionVariables): QueryRef<GetChatSessionData, GetChatSessionVariables>;
}
export const getChatSessionRef: GetChatSessionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getChatSessionRef:
```typescript
const name = getChatSessionRef.operationName;
console.log(name);
```

### Variables
The `GetChatSession` query requires an argument of type `GetChatSessionVariables`, which is defined in [chat/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetChatSessionVariables {
  id: string;
}
```
### Return Type
Recall that executing the `GetChatSession` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetChatSessionData`, which is defined in [chat/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetChatSession`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getChatSession, GetChatSessionVariables } from '@dataconnect/generated';

// The `GetChatSession` query requires an argument of type `GetChatSessionVariables`:
const getChatSessionVars: GetChatSessionVariables = {
  id: ..., 
};

// Call the `getChatSession()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getChatSession(getChatSessionVars);
// Variables can be defined inline as well.
const { data } = await getChatSession({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getChatSession(dataConnect, getChatSessionVars);

console.log(data.chatSession);

// Or, you can use the `Promise` API.
getChatSession(getChatSessionVars).then((response) => {
  const data = response.data;
  console.log(data.chatSession);
});
```

### Using `GetChatSession`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getChatSessionRef, GetChatSessionVariables } from '@dataconnect/generated';

// The `GetChatSession` query requires an argument of type `GetChatSessionVariables`:
const getChatSessionVars: GetChatSessionVariables = {
  id: ..., 
};

// Call the `getChatSessionRef()` function to get a reference to the query.
const ref = getChatSessionRef(getChatSessionVars);
// Variables can be defined inline as well.
const ref = getChatSessionRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getChatSessionRef(dataConnect, getChatSessionVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.chatSession);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.chatSession);
});
```

## ListChatMessages
You can execute the `ListChatMessages` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [chat/index.d.ts](./index.d.ts):
```typescript
listChatMessages(vars: ListChatMessagesVariables): QueryPromise<ListChatMessagesData, ListChatMessagesVariables>;

interface ListChatMessagesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListChatMessagesVariables): QueryRef<ListChatMessagesData, ListChatMessagesVariables>;
}
export const listChatMessagesRef: ListChatMessagesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listChatMessages(dc: DataConnect, vars: ListChatMessagesVariables): QueryPromise<ListChatMessagesData, ListChatMessagesVariables>;

interface ListChatMessagesRef {
  ...
  (dc: DataConnect, vars: ListChatMessagesVariables): QueryRef<ListChatMessagesData, ListChatMessagesVariables>;
}
export const listChatMessagesRef: ListChatMessagesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listChatMessagesRef:
```typescript
const name = listChatMessagesRef.operationName;
console.log(name);
```

### Variables
The `ListChatMessages` query requires an argument of type `ListChatMessagesVariables`, which is defined in [chat/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListChatMessagesVariables {
  sessionId: string;
}
```
### Return Type
Recall that executing the `ListChatMessages` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListChatMessagesData`, which is defined in [chat/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListChatMessages`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listChatMessages, ListChatMessagesVariables } from '@dataconnect/generated';

// The `ListChatMessages` query requires an argument of type `ListChatMessagesVariables`:
const listChatMessagesVars: ListChatMessagesVariables = {
  sessionId: ..., 
};

// Call the `listChatMessages()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listChatMessages(listChatMessagesVars);
// Variables can be defined inline as well.
const { data } = await listChatMessages({ sessionId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listChatMessages(dataConnect, listChatMessagesVars);

console.log(data.chatMessages);

// Or, you can use the `Promise` API.
listChatMessages(listChatMessagesVars).then((response) => {
  const data = response.data;
  console.log(data.chatMessages);
});
```

### Using `ListChatMessages`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listChatMessagesRef, ListChatMessagesVariables } from '@dataconnect/generated';

// The `ListChatMessages` query requires an argument of type `ListChatMessagesVariables`:
const listChatMessagesVars: ListChatMessagesVariables = {
  sessionId: ..., 
};

// Call the `listChatMessagesRef()` function to get a reference to the query.
const ref = listChatMessagesRef(listChatMessagesVars);
// Variables can be defined inline as well.
const ref = listChatMessagesRef({ sessionId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listChatMessagesRef(dataConnect, listChatMessagesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.chatMessages);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.chatMessages);
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

Below are examples of how to use the `chat` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateChatSession
You can execute the `CreateChatSession` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [chat/index.d.ts](./index.d.ts):
```typescript
createChatSession(vars: CreateChatSessionVariables): MutationPromise<CreateChatSessionData, CreateChatSessionVariables>;

interface CreateChatSessionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateChatSessionVariables): MutationRef<CreateChatSessionData, CreateChatSessionVariables>;
}
export const createChatSessionRef: CreateChatSessionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createChatSession(dc: DataConnect, vars: CreateChatSessionVariables): MutationPromise<CreateChatSessionData, CreateChatSessionVariables>;

interface CreateChatSessionRef {
  ...
  (dc: DataConnect, vars: CreateChatSessionVariables): MutationRef<CreateChatSessionData, CreateChatSessionVariables>;
}
export const createChatSessionRef: CreateChatSessionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createChatSessionRef:
```typescript
const name = createChatSessionRef.operationName;
console.log(name);
```

### Variables
The `CreateChatSession` mutation requires an argument of type `CreateChatSessionVariables`, which is defined in [chat/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateChatSessionVariables {
  id: string;
  userId?: string | null;
  metadata?: string | null;
  createdAt: TimestampString;
  updatedAt: TimestampString;
  expiresAt: TimestampString;
}
```
### Return Type
Recall that executing the `CreateChatSession` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateChatSessionData`, which is defined in [chat/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateChatSessionData {
  chatSession_insert: ChatSession_Key;
}
```
### Using `CreateChatSession`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createChatSession, CreateChatSessionVariables } from '@dataconnect/generated';

// The `CreateChatSession` mutation requires an argument of type `CreateChatSessionVariables`:
const createChatSessionVars: CreateChatSessionVariables = {
  id: ..., 
  userId: ..., // optional
  metadata: ..., // optional
  createdAt: ..., 
  updatedAt: ..., 
  expiresAt: ..., 
};

// Call the `createChatSession()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createChatSession(createChatSessionVars);
// Variables can be defined inline as well.
const { data } = await createChatSession({ id: ..., userId: ..., metadata: ..., createdAt: ..., updatedAt: ..., expiresAt: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createChatSession(dataConnect, createChatSessionVars);

console.log(data.chatSession_insert);

// Or, you can use the `Promise` API.
createChatSession(createChatSessionVars).then((response) => {
  const data = response.data;
  console.log(data.chatSession_insert);
});
```

### Using `CreateChatSession`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createChatSessionRef, CreateChatSessionVariables } from '@dataconnect/generated';

// The `CreateChatSession` mutation requires an argument of type `CreateChatSessionVariables`:
const createChatSessionVars: CreateChatSessionVariables = {
  id: ..., 
  userId: ..., // optional
  metadata: ..., // optional
  createdAt: ..., 
  updatedAt: ..., 
  expiresAt: ..., 
};

// Call the `createChatSessionRef()` function to get a reference to the mutation.
const ref = createChatSessionRef(createChatSessionVars);
// Variables can be defined inline as well.
const ref = createChatSessionRef({ id: ..., userId: ..., metadata: ..., createdAt: ..., updatedAt: ..., expiresAt: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createChatSessionRef(dataConnect, createChatSessionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.chatSession_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.chatSession_insert);
});
```

## AddChatMessage
You can execute the `AddChatMessage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [chat/index.d.ts](./index.d.ts):
```typescript
addChatMessage(vars: AddChatMessageVariables): MutationPromise<AddChatMessageData, AddChatMessageVariables>;

interface AddChatMessageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddChatMessageVariables): MutationRef<AddChatMessageData, AddChatMessageVariables>;
}
export const addChatMessageRef: AddChatMessageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addChatMessage(dc: DataConnect, vars: AddChatMessageVariables): MutationPromise<AddChatMessageData, AddChatMessageVariables>;

interface AddChatMessageRef {
  ...
  (dc: DataConnect, vars: AddChatMessageVariables): MutationRef<AddChatMessageData, AddChatMessageVariables>;
}
export const addChatMessageRef: AddChatMessageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addChatMessageRef:
```typescript
const name = addChatMessageRef.operationName;
console.log(name);
```

### Variables
The `AddChatMessage` mutation requires an argument of type `AddChatMessageVariables`, which is defined in [chat/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddChatMessageVariables {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  timestamp: TimestampString;
  attachmentType?: string | null;
  attachmentFilename?: string | null;
}
```
### Return Type
Recall that executing the `AddChatMessage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddChatMessageData`, which is defined in [chat/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddChatMessageData {
  chatMessage_insert: ChatMessage_Key;
}
```
### Using `AddChatMessage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addChatMessage, AddChatMessageVariables } from '@dataconnect/generated';

// The `AddChatMessage` mutation requires an argument of type `AddChatMessageVariables`:
const addChatMessageVars: AddChatMessageVariables = {
  id: ..., 
  sessionId: ..., 
  role: ..., 
  content: ..., 
  timestamp: ..., 
  attachmentType: ..., // optional
  attachmentFilename: ..., // optional
};

// Call the `addChatMessage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addChatMessage(addChatMessageVars);
// Variables can be defined inline as well.
const { data } = await addChatMessage({ id: ..., sessionId: ..., role: ..., content: ..., timestamp: ..., attachmentType: ..., attachmentFilename: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addChatMessage(dataConnect, addChatMessageVars);

console.log(data.chatMessage_insert);

// Or, you can use the `Promise` API.
addChatMessage(addChatMessageVars).then((response) => {
  const data = response.data;
  console.log(data.chatMessage_insert);
});
```

### Using `AddChatMessage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addChatMessageRef, AddChatMessageVariables } from '@dataconnect/generated';

// The `AddChatMessage` mutation requires an argument of type `AddChatMessageVariables`:
const addChatMessageVars: AddChatMessageVariables = {
  id: ..., 
  sessionId: ..., 
  role: ..., 
  content: ..., 
  timestamp: ..., 
  attachmentType: ..., // optional
  attachmentFilename: ..., // optional
};

// Call the `addChatMessageRef()` function to get a reference to the mutation.
const ref = addChatMessageRef(addChatMessageVars);
// Variables can be defined inline as well.
const ref = addChatMessageRef({ id: ..., sessionId: ..., role: ..., content: ..., timestamp: ..., attachmentType: ..., attachmentFilename: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addChatMessageRef(dataConnect, addChatMessageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.chatMessage_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.chatMessage_insert);
});
```

## DeleteChatSession
You can execute the `DeleteChatSession` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [chat/index.d.ts](./index.d.ts):
```typescript
deleteChatSession(vars: DeleteChatSessionVariables): MutationPromise<DeleteChatSessionData, DeleteChatSessionVariables>;

interface DeleteChatSessionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteChatSessionVariables): MutationRef<DeleteChatSessionData, DeleteChatSessionVariables>;
}
export const deleteChatSessionRef: DeleteChatSessionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteChatSession(dc: DataConnect, vars: DeleteChatSessionVariables): MutationPromise<DeleteChatSessionData, DeleteChatSessionVariables>;

interface DeleteChatSessionRef {
  ...
  (dc: DataConnect, vars: DeleteChatSessionVariables): MutationRef<DeleteChatSessionData, DeleteChatSessionVariables>;
}
export const deleteChatSessionRef: DeleteChatSessionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteChatSessionRef:
```typescript
const name = deleteChatSessionRef.operationName;
console.log(name);
```

### Variables
The `DeleteChatSession` mutation requires an argument of type `DeleteChatSessionVariables`, which is defined in [chat/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteChatSessionVariables {
  id: string;
}
```
### Return Type
Recall that executing the `DeleteChatSession` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteChatSessionData`, which is defined in [chat/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteChatSessionData {
  chatSession_delete?: ChatSession_Key | null;
}
```
### Using `DeleteChatSession`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteChatSession, DeleteChatSessionVariables } from '@dataconnect/generated';

// The `DeleteChatSession` mutation requires an argument of type `DeleteChatSessionVariables`:
const deleteChatSessionVars: DeleteChatSessionVariables = {
  id: ..., 
};

// Call the `deleteChatSession()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteChatSession(deleteChatSessionVars);
// Variables can be defined inline as well.
const { data } = await deleteChatSession({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteChatSession(dataConnect, deleteChatSessionVars);

console.log(data.chatSession_delete);

// Or, you can use the `Promise` API.
deleteChatSession(deleteChatSessionVars).then((response) => {
  const data = response.data;
  console.log(data.chatSession_delete);
});
```

### Using `DeleteChatSession`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteChatSessionRef, DeleteChatSessionVariables } from '@dataconnect/generated';

// The `DeleteChatSession` mutation requires an argument of type `DeleteChatSessionVariables`:
const deleteChatSessionVars: DeleteChatSessionVariables = {
  id: ..., 
};

// Call the `deleteChatSessionRef()` function to get a reference to the mutation.
const ref = deleteChatSessionRef(deleteChatSessionVars);
// Variables can be defined inline as well.
const ref = deleteChatSessionRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteChatSessionRef(dataConnect, deleteChatSessionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.chatSession_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.chatSession_delete);
});
```

