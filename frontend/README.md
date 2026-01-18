# Sanskar Academy - Frontend

A modern, fully type-safe Next.js frontend application for Sanskar Academy LMS platform.

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS v4
- **API Client**: Axios with interceptors
- **State Management**: React Context API
- **Type Safety**: TypeScript
- **Forms**: React Hook Form with Zod validation
- **Icons**: React Icons (Hi icons)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_NAME=Sanskar Academy
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Add the Sanskar Academy logo to `public/logo.png`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── courses/           # Course pages
│   ├── dashboard/         # User dashboard
│   ├── admin/             # Admin dashboard
│   └── ...
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── ui/               # Reusable UI components
│   └── dashboard/        # Dashboard components
├── lib/                  # Core utilities
│   ├── api/              # API integration modules
│   ├── context/          # React Context providers
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── middleware/       # Route protection
└── public/               # Static assets
```

## Features

### User Features
- User authentication (Register, Login, OTP verification)
- Course browsing and enrollment
- Dashboard with progress tracking
- Certificate management
- Payment history
- Wishlist

### Admin Features
- Comprehensive admin dashboard
- User management (view, block/unblock)
- Course management (CRUD)
- Payment analytics
- Content management (Blog, Gallery, Testimonials, etc.)
- System monitoring (Audit logs)

## API Integration

All API calls are type-safe and use Axios with automatic token management. API modules are located in `lib/api/`.

## Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API base URL
- `NEXT_PUBLIC_APP_NAME`: Application name
- `NEXT_PUBLIC_APP_URL`: Frontend URL

## Building for Production

```bash
npm run build
npm start
```

## Notes

- The logo file (`public/logo.png`) needs to be added manually
- All API endpoints are configured in `lib/utils/constants.ts`
- Theme colors are defined in `app/globals.css`
- Route protection is handled in layout components
