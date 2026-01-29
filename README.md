# Modular Factory Scheduler

This project implements a core algorithm for a Manufacturing Execution System (MES):

1. **Schedule Planning**: Allocates labor over a timeline to ensure all tasks finish, prioritizing resource optimization.

## Project Structure

- `src/controllers`: REST API Controllers
- `src/services`: Core Algorithmic Logic
- `src/models`: Domain Models & Interfaces (in `types`)
- `tests`: Unit Tests (Jest)

## Installation

```bash
npm install
```

## Running the Server

```bash
npm run dev # Uses nodemon
# OR
npm start
```

## Testing

Run unit tests, including the Optimization Strategy verification:

```bash
npm test
```

## API Endpoints

### 1. Plan Schedule

**POST** `/api/v1/worker-tasks/plan`

Generates a timeline of assignments. This algorithm implements "Liquid Resource" scheduling to satisfy the "Finish All Tasks" goal.
It automatically accelerates tasks (up to `maxWorkers`) if excess capacity is available early, freeing up workers for later bottlenecks.
