# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createChatSession, getChatSession, addChatMessage, listChatMessages, deleteChatSession } from '@dataconnect/generated';


// Operation CreateChatSession:  For variables, look at type CreateChatSessionVars in ../index.d.ts
const { data } = await CreateChatSession(dataConnect, createChatSessionVars);

// Operation GetChatSession:  For variables, look at type GetChatSessionVars in ../index.d.ts
const { data } = await GetChatSession(dataConnect, getChatSessionVars);

// Operation AddChatMessage:  For variables, look at type AddChatMessageVars in ../index.d.ts
const { data } = await AddChatMessage(dataConnect, addChatMessageVars);

// Operation ListChatMessages:  For variables, look at type ListChatMessagesVars in ../index.d.ts
const { data } = await ListChatMessages(dataConnect, listChatMessagesVars);

// Operation DeleteChatSession:  For variables, look at type DeleteChatSessionVars in ../index.d.ts
const { data } = await DeleteChatSession(dataConnect, deleteChatSessionVars);


```