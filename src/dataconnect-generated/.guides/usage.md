# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { getNotes, getTravelerTemplates, getStations, getStationById, getTravelers, getTravelerById, getTravelerStations, getTravelerStationsByTraveler, getWorkers, getWorkerTasks } from '@dataconnect/generated';


// Operation GetNotes: 
const { data } = await GetNotes(dataConnect);

// Operation GetTravelerTemplates: 
const { data } = await GetTravelerTemplates(dataConnect);

// Operation GetStations: 
const { data } = await GetStations(dataConnect);

// Operation GetStationById:  For variables, look at type GetStationByIdVars in ../index.d.ts
const { data } = await GetStationById(dataConnect, getStationByIdVars);

// Operation GetTravelers: 
const { data } = await GetTravelers(dataConnect);

// Operation GetTravelerById:  For variables, look at type GetTravelerByIdVars in ../index.d.ts
const { data } = await GetTravelerById(dataConnect, getTravelerByIdVars);

// Operation GetTravelerStations: 
const { data } = await GetTravelerStations(dataConnect);

// Operation GetTravelerStationsByTraveler:  For variables, look at type GetTravelerStationsByTravelerVars in ../index.d.ts
const { data } = await GetTravelerStationsByTraveler(dataConnect, getTravelerStationsByTravelerVars);

// Operation GetWorkers: 
const { data } = await GetWorkers(dataConnect);

// Operation GetWorkerTasks: 
const { data } = await GetWorkerTasks(dataConnect);


```