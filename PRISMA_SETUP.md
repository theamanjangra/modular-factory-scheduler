# Prisma Setup Instructions

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/vederra_db"

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Database Setup

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npm run db:generate
```

3. Push schema to database (for development):
```bash
npm run db:push
```

Or create and run migrations (for production):
```bash
npm run db:migrate
```

4. Start the development server:
```bash
npm run dev
```

## Database Schema

The refactored application uses the following Prisma models:

### User Model
- `id`: Auto-incrementing integer primary key
- `firebaseUid`: Unique Firebase UID
- `email`: Unique email address
- `displayName`: Optional display name
- `role`: User role (default: "user")
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### Employee Model
- `id`: Auto-incrementing integer primary key
- `firstName`: Employee's first name
- `lastName`: Employee's last name
- `email`: Optional unique email
- `phone`: Optional phone number
- `position`: Optional position title
- `crews`: Array of crew IDs (integers)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### Timelog Model
- `id`: Auto-incrementing integer primary key
- `employeeId`: Foreign key to Employee
- `startTime`: Start time (DateTime)
- `endTime`: End time (DateTime)
- `description`: Optional description
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/firebase/:firebaseUid` - Get user by Firebase UID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `GET /api/employees/email/:email` - Get employee by email
- `GET /api/employees/crew/:crewId` - Get employees by crew
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Timelogs
- `GET /api/timelogs` - Get timelogs with filters
- `GET /api/timelogs/:id` - Get timelog by ID
- `GET /api/timelogs/employee/:employeeId` - Get timelogs by employee
- `GET /api/timelogs/export` - Export timelogs to CSV
- `POST /api/timelogs` - Create timelog
- `PUT /api/timelogs/:id` - Update timelog
- `DELETE /api/timelogs/:id` - Delete timelog

## Security Features

- Input validation using Yup schemas
- CORS configuration
- Rate limiting middleware
- Authentication middleware
- Environment variable validation
