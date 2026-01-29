
const http = require('http');

console.log("Testing connection to http://localhost:8080...");

http.get('http://localhost:8080', (res) => {
    console.log('SUCCESS: Connected to port 8080');
    console.log('Status Code:', res.statusCode);
    res.resume(); // consume response to free memory
}).on('error', (e) => {
    console.error(`FAILURE: Could not connect to port 8080: ${e.message}`);
});
