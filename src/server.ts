import { app } from "./app";
import { ENV } from "./config/envConfig";
import { connectDB } from "./config/db";

//connectDB();

const parsedPort = Number(ENV.PORT);
const port = Number.isFinite(parsedPort) ? parsedPort : 3000;
const host = ENV.HOST || "0.0.0.0";
console.log(`Initialising server on ${host}:${port}...`);

const server = app.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

server.on('error', (err) => {
    console.error("Server Startup Error:", err);
});

// Prevent process exit (just in case)
/*
setInterval(() => {
    // Keep alive
}, 10000);
*/
