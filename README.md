# Case-Competition-Backend

Backend framework for events site built with Node.js and Express.

## Project Structure

```
├── config/          # Configuration files (server settings, database config, etc.)
├── controllers/     # Request handlers (handle HTTP requests/responses)
├── services/        # Business logic layer
├── repositories/    # Data access layer (database queries, external APIs)
├── models/          # Data models and schemas
├── routes/          # Route definitions
└── server.js        # Application entry point
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### GET /
Returns a hello world message.

**Response:**
```json
{
  "message": "Hello world"
}
```

## Server

The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable.