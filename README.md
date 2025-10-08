# Vitality Core

A Node.js monorepo for the Vitality Core application, featuring a backend API, frontend React application, and data management capabilities.

## Project Structure

```
vitality-core/
├── backend/          # Node.js/Express backend API
├── frontend/         # React TypeScript frontend
├── data/            # Data files and databases
└── package.json     # Root package.json for monorepo management
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

2. Copy environment files:
```bash
# Backend environment
cp backend/env.example backend/.env
# Edit backend/.env with your configuration

# Frontend environment  
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

### Development

Start both backend and frontend in development mode:
```bash
npm run dev
```

Or start them individually:
```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

### Available Scripts

- `npm run install:all` - Install dependencies for all packages
- `npm run dev` - Start both backend and frontend in development mode
- `npm run dev:backend` - Start only the backend server
- `npm run dev:frontend` - Start only the frontend development server
- `npm run build:frontend` - Build the frontend for production
- `npm start` - Start the backend server

## Backend

The backend is a Node.js/Express API server with the following features:

- RESTful API endpoints
- SQLite database support
- AWS S3 integration
- JWT authentication
- CORS enabled
- Environment-based configuration

### Backend Structure

```
backend/
├── src/
│   ├── __tests__/    # Test files
│   ├── routes/       # API route handlers
│   ├── database/     # Database utilities
│   ├── utils/        # Utility functions
│   └── server.js     # Main server file
├── package.json
└── .env             # Environment variables
```

## Frontend

The frontend is a React TypeScript application with:

- Modern React with TypeScript
- Material-UI components
- Redux Toolkit for state management
- React Router for navigation
- API integration with the backend

### Frontend Structure

```
frontend/
├── src/
│   ├── components/   # React components
│   ├── services/     # API services
│   ├── hooks/        # Custom React hooks
│   └── App.tsx       # Main App component
├── public/          # Static assets
├── package.json
└── .env             # Environment variables
```

## Data

The `data/` directory is used for:

- Database files (SQLite)
- Data imports and exports
- Configuration files
- Static data assets

## Environment Configuration

Both backend and frontend use environment variables for configuration. Copy the example files and customize as needed:

- `backend/.env` - Backend configuration
- `frontend/.env` - Frontend configuration

## Development Workflow

1. Make changes to backend or frontend code
2. The development servers will automatically reload
3. Test your changes in the browser
4. Run tests as needed

## Production Deployment

1. Build the frontend: `npm run build:frontend`
2. Configure production environment variables
3. Deploy backend and frontend to your hosting platform

## License

Copyright (c) 2025 VitalityIP.ai. All rights reserved.
