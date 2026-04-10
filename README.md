# Vaastu LMS - Backend API

This is the **backend-only** repository for the Vaastu LMS platform. It provides RESTful API endpoints for the frontend application.

## Important

- **This repository contains ONLY backend code** (Express.js API server)
- **Frontend code is in a separate repository** (`vaastu` folder)
- - Do not add any frontend code (React, Next.js, HTML, CSS) to this repository

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (via Prisma ORM)
- **Authentication:** JWT tokens
- **File Storage:** Cloudinary
- **Payment:** Manual QR (admin QR + proof + approval), Khalti, cards/banking where configured

## Project Structure

```
vaastu-backend/
├── src/
│   ├── app.js              # Express app configuration
│   ├── server.js           # Server entry point
│   ├── config/             # Configuration files
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Custom middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
├── prisma/                 # Prisma schema and migrations
├── scripts/                # Utility scripts
└── package.json           # Backend dependencies only
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Environment variables configured (see `env.example`)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run build` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run test:api` - Run API tests

## API Documentation

See `COMPLETE_API_ENDPOINTS_LIST.md` for full API documentation.

## Environment Variables

Copy `env.example` to `.env` and configure:

- Database connection
- JWT secrets
- Cloudinary credentials
- Payment gateway keys
- Frontend URL (for CORS and redirects)

## Deployment

See `DEPLOYMENT_CHECKLIST.md` and `DIGITAL-OCEAN-DEPLOYMENT-GUIDE.md` for deployment instructions.

## Notes

- The backend uses `FRONTEND_URL` environment variable to configure CORS and generate redirect URLs
- All frontend code should be in the separate `vaastu` frontend repository
- This backend serves only as an API server
# genius-lms-backend
