import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorMiddleware } from "./middlewares/errorMiddleware";
import { generalLimiter } from "./middlewares/rateLimiter";
// import { userRoutes } from "./routes/userRoutes";
// import { employeeRoutes } from "./routes/employeeRoutes";
// import { timelogRoutes } from "./routes/timelogRoutes";
import { ENV } from "./config/envConfig";
// import { projectRoutes } from "./routes/project.route";
import workerTasksRouter from './routes/workerTasks';
import plansRouter from './routes/plans';
import masterDataRouter from './routes/masterData';
// import { chatRoutes } from "./routes/chatRoutes";

const app = express();

// Apply general rate limiting
app.use(generalLimiter);

app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use("/public", express.static("public"));
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

import path from "path";

//Routes
app.get("/", (req: Request, res: Response) => {
  // Serve the Web Interface (React App)
  res.sendFile(path.resolve("client/dist/index.html"));
});

// Serve React Static Assets
app.use(express.static("client/dist"));


app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
// app.use("/api/users", userRoutes);
// app.use("/api/employees", employeeRoutes);
// app.use("/api/timelogs", timelogRoutes);
// app.use("/api/projects", projectRoutes);
app.use("/api/v1/worker-tasks", workerTasksRouter);
app.use("/api/v1/plans", plansRouter);
app.use("/api/v1/master", masterDataRouter);
// app.use("/api/chat", chatRoutes);

// Catch-all: Serve React app for client-side routing (e.g., /cross-dept)
app.get(/(.*)/, (req: Request, res: Response) => {
  res.sendFile(path.resolve("client/dist/index.html"));
});

app.use(errorMiddleware);

export { app };
