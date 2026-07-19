# Project Camp Backend

A RESTful backend API for collaborative project management — organize projects, manage tasks and subtasks, and control access with per-project role-based permissions.

## Tech Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express 5
- **Database:** MongoDB with Mongoose
- **Auth:** JWT (access + refresh tokens), bcrypt password hashing
- **File uploads:** Multer
- **Validation:** express-validator
- **Email:** Nodemailer + Mailgen (Mailtrap for local dev)

## Features

- User registration with email verification
- JWT-based login with access/refresh token rotation
- Forgot password / reset password flow
- Project creation and management
- Per-project team membership with three-tier roles: **Admin**, **Project Admin**, **Member**
- Task management with assignment, status tracking, and file attachments
- Subtask management with completion tracking

## Permission Model

Roles are scoped **per project**, not globally — a user can be an Admin on one project and a Member on another.

| Feature                    | Admin | Project Admin | Member |
| --------------------------- | :---: | :------------: | :----: |
| Create Project              |  ✓   |       ✗        |   ✗    |
| Update / Delete Project     |  ✓   |       ✗        |   ✗    |
| Manage Project Members      |  ✓   |       ✗        |   ✗    |
| Create / Update / Delete Tasks |  ✓   |       ✓        |   ✗    |
| View Tasks                  |  ✓   |       ✓        |   ✓    |
| Update Subtask Status       |  ✓   |       ✓        |   ✓    |
| Create / Delete Subtasks    |  ✓   |       ✓        |   ✗    |

## Getting Started

### Prerequisites

- Node.js
- A running MongoDB instance (local or Atlas)
- A [Mailtrap](https://mailtrap.io/) account (for local email testing)

### Installation

```bash
git clone <repo-url>
cd projectManagement
npm install
```

### Environment Variables

Copy `.env.sample` to `.env` and fill in your own values:

```bash
cp .env.sample .env
```

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on |
| `SERVER_URL` | Base URL of this server (used to build attachment file URLs) |
| `MONGO_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `ACCESS_TOKEN_SECRET` / `ACCESS_TOKEN_EXPIRY` | JWT access token secret and expiry |
| `REFRESH_TOKEN_SECRET` / `REFRESH_TOKEN_EXPIRY` | JWT refresh token secret and expiry |
| `FORGOT_PASSWORD_REDIRECT_URL` | Frontend URL the reset-password email links to |
| `MAIL_TRAP_SMTP_HOST` / `PORT` / `USER` / `PASS` | Mailtrap SMTP credentials |

### Run

```bash
# development (auto-restart on changes)
npm run dev

# production
npm start
```

The API will be available at `http://localhost:<PORT>/api/v1`.

## API Overview

### Auth (`/api/v1/auth`)
| Method | Route | Description |
|---|---|---|
| POST | `/register` | Register a new user |
| POST | `/login` | Log in |
| POST | `/logout` | Log out *(secured)* |
| GET | `/current-user` | Get current user *(secured)* |
| POST | `/change-password` | Change password *(secured)* |
| POST | `/refresh-token` | Refresh access token |
| GET | `/verify-email/:verificationToken` | Verify email |
| POST | `/resend-email-verification` | Resend verification email *(secured)* |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password/:resetToken` | Reset password |

### Projects (`/api/v1/projects`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List projects for current user |
| POST | `/` | Create a project |
| GET | `/:projectId` | Get project details |
| PUT | `/:projectId` | Update project *(Admin)* |
| DELETE | `/:projectId` | Delete project *(Admin)* |
| GET | `/:projectId/members` | List project members |
| POST | `/:projectId/members` | Add a member *(Admin)* |
| PUT | `/:projectId/members/:userId` | Update member role *(Admin)* |
| DELETE | `/:projectId/members/:userId` | Remove a member *(Admin)* |

### Tasks (`/api/v1/tasks`)
| Method | Route | Description |
|---|---|---|
| GET | `/:projectId` | List tasks in a project |
| POST | `/:projectId` | Create a task *(Admin/Project Admin)* |
| GET | `/:projectId/t/:taskId` | Get task details |
| PUT | `/:projectId/t/:taskId` | Update a task *(Admin/Project Admin)* |
| DELETE | `/:projectId/t/:taskId` | Delete a task *(Admin/Project Admin)* |
| POST | `/:projectId/t/:taskId/subtasks` | Create a subtask *(Admin/Project Admin)* |
| PUT | `/:projectId/st/:subTaskId` | Update a subtask |
| DELETE | `/:projectId/st/:subTaskId` | Delete a subtask *(Admin/Project Admin)* |

All routes above require authentication (`verifyJWT`); role restrictions are enforced per the permission model.


## Project Structure

```
src/
├── controllers/    # Request handlers — business logic
├── middlewares/     # Auth, error handling, validation, file uploads
├── models/          # Mongoose schemas
├── routes/          # Express route definitions
├── utils/           # ApiError, ApiResponse, asyncHandler, mail, constants
├── validators/       # express-validator chains
├── db/               # MongoDB connection
├── app.js
└── index.js
```