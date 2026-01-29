# Vederra Server API Documentation

A Node.js + TypeScript + Express REST API with PostgreSQL, Firebase Authentication, and clean architecture.

## 🚀 Features

- **Authentication**: Firebase Admin SDK integration
- **Database**: PostgreSQL with connection pooling
- **Rate Limiting**: Configurable rate limiting for different endpoints
- **Validation**: Yup schema validation for all inputs
- **CSV Export**: Timelog data export functionality
- **Clean Architecture**: Separation of concerns with controllers, models, routes, middlewares

## 📁 Project Structure

```
src/
├── config/
│   ├── db.ts              # Database configuration
│   └── envConfig.ts        # Environment variables
├── controllers/
│   ├── userController.ts   # User business logic
│   ├── employeeController.ts # Employee business logic
│   └── timelogController.ts # Timelog business logic
├── middlewares/
│   ├── authMiddleware.ts   # Firebase authentication
│   ├── errorMiddleware.ts  # Global error handling
│   └── rateLimiter.ts      # Rate limiting
├── models/
│   ├── userModel.ts        # User data access
│   ├── employeeModel.ts    # Employee data access
│   └── timelogModel.ts     # Timelog data access
├── routes/
│   ├── userRoutes.ts       # User endpoints
│   ├── employeeRoutes.ts   # Employee endpoints
│   └── timelogRoutes.ts    # Timelog endpoints
├── types/
│   └── @server.ts          # TypeScript type definitions
├── utils/
│   ├── firebase.ts         # Firebase Admin SDK
│   ├── csvExporter.ts      # CSV export functionality
│   └── validators/
│       ├── userValidator.ts
│       ├── employeeValidator.ts
│       └── timelogValidator.ts
├── app.ts                  # Express app configuration
└── server.ts               # Server startup
```

## 🛠️ Setup

### Prerequisites

- Node.js (v16+)
- PostgreSQL
- Firebase project (for authentication)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup:**
   ```bash
   # Create database
   createdb vederra_db
   
   # Run schema
   psql -d vederra_db -f database_schema.sql
   ```

3. **Environment Variables:**
   Create a `.env` file with:
   ```env
   PORT=3000
   CORS_ORIGIN=http://localhost:3000
   DB_USER=your_db_user
   DB_HOST=localhost
   DB_NAME=vederra_db
   DB_PASS=your_db_password
   DB_PORT=5432
   
   # Firebase (optional for development)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your-client-id
   ```

4. **Run the application:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## 📚 API Endpoints

### Authentication
All endpoints require Firebase authentication via Bearer token:
```
Authorization: Bearer <firebase-id-token>
```

### Users

#### GET /api/users/allUsers
Get all users
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of users

#### GET /api/users/:id
Get user by ID
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User object

#### GET /api/users/role/:role
Get users by role
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of users with specified role

#### POST /api/users/create
Create new user
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "firstname": "John",
    "lastname": "Doe",
    "role": "user"
  }
  ```

#### PUT /api/users/:id
Update user
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Partial user data (email, firstname, lastname, role)

#### DELETE /api/users/:id
Delete user
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Success message

### Employees

#### GET /api/employees
Get all employees
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of employees with user details

#### GET /api/employees/:id
Get employee by ID
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Employee object with user details

#### POST /api/employees
Create new employee
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "user_id": "uuid",
    "employee_id": "EMP001",
    "department": "Engineering",
    "position": "Developer",
    "hire_date": "2024-01-15",
    "salary": 75000
  }
  ```

### Timelogs

#### GET /api/timelogs
Get timelogs with optional filters
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `start`: Start date (YYYY-MM-DD)
  - `end`: End date (YYYY-MM-DD)
  - `employee_id`: Filter by employee ID
- **Response**: Array of timelogs

#### GET /api/timelogs/export
Export timelogs to CSV
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: Same as GET /api/timelogs
- **Response**: CSV file download

#### POST /api/timelogs
Create new timelog
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "employee_id": "uuid",
    "date": "2024-01-15",
    "start_time": "09:00",
    "end_time": "17:00",
    "break_duration": 60,
    "description": "Work on project"
  }
  ```

## 🔒 Rate Limiting

- **General**: 100 requests per 15 minutes
- **API**: 200 requests per 15 minutes
- **Auth**: 5 requests per 15 minutes

## 📊 Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
}
```

### Employee
```typescript
interface Employee {
  id: string;
  user_id: string;
  employee_id: string;
  department: string;
  position: string;
  hire_date: Date;
  salary?: number;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}
```

### Timelog
```typescript
interface Timelog {
  id: string;
  employee_id: string;
  date: Date;
  start_time: string;
  end_time?: string;
  break_duration?: number;
  total_hours?: number;
  description?: string;
  status: 'in_progress' | 'completed';
  created_at: Date;
  updated_at: Date;
}
```

## 🚦 Error Handling

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "stack": "Error stack trace (development only)"
}
```

## 🔧 Development

### Scripts
- `npm run dev`: Start development server with hot reload
- `npm run build`: Build TypeScript to JavaScript
- `npm start`: Start production server
- `npm run clean`: Clean build directory

### Database Schema
The database schema is defined in `database_schema.sql` with:
- UUID primary keys
- Proper foreign key relationships
- Indexes for performance
- Automatic timestamp updates
- Data validation constraints

## 🛡️ Security Features

- Firebase authentication for all endpoints
- Rate limiting to prevent abuse
- Input validation with Yup schemas
- SQL injection protection with parameterized queries
- CORS configuration
- Error handling without sensitive data exposure

## 📈 Performance

- Connection pooling for database
- Indexed database columns
- Efficient queries with JOINs
- Rate limiting to prevent overload
- Optimized CSV export

## 🧪 Testing

The API is designed to be easily testable with:
- Clean separation of concerns
- Dependency injection ready
- Mockable database layer
- Comprehensive error handling

## 📝 Notes

- All timestamps are in UTC
- Date formats: YYYY-MM-DD
- Time formats: HH:MM (24-hour)
- UUIDs are used for all primary keys
- Soft deletes are not implemented (hard deletes with CASCADE)
- CSV export includes all timelog data with proper formatting
