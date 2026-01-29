# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { addNote, createTravelerTemplate, createStation, travelerStation, traveler, getNotes, getTravelerTemplates, getStations, getStationById, getTravelers } from '@dataconnect/generated';


// Operation AddNote:  For variables, look at type AddNoteVars in ../index.d.ts
const { data } = await AddNote(dataConnect, addNoteVars);

// Operation CreateTravelerTemplate:  For variables, look at type CreateTravelerTemplateVars in ../index.d.ts
const { data } = await CreateTravelerTemplate(dataConnect, createTravelerTemplateVars);

// Operation CreateStation:  For variables, look at type CreateStationVars in ../index.d.ts
const { data } = await CreateStation(dataConnect, createStationVars);

// Operation TravelerStation:  For variables, look at type TravelerStationVars in ../index.d.ts
const { data } = await TravelerStation(dataConnect, travelerStationVars);

// Operation Traveler:  For variables, look at type TravelerVars in ../index.d.ts
const { data } = await Traveler(dataConnect, travelerVars);

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


```