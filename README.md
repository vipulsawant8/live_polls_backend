# Live Polls Backend

A simple real-time polling backend built with Express, MongoDB, JWT, and
Socket.IO. It supports authentication, poll creation, voting, and
real-time updates.

## Features

-   REST API (/api/v1)
-   JWT authentication with cookies
-   Refresh token rotation
-   Device-based sessions
-   Email verification
-   Password reset
-   Rate limiting
-   Request validation with Zod
-   Real-time voting with Socket.IO
-   MongoDB TTL indexes for automatic cleanup
-   API documentation with Swagger
-   Logging using Pino

## Tech Stack

-   Express
-   MongoDB + Mongoose
-   JWT
-   Socket.IO
-   Zod
-   bcrypt
-   Helmet
-   Pino logger
-   Swagger API docs

## Authentication Flow

### Register

User sends name, email, and password.

-   Password hashed with bcrypt
-   Verification token generated
-   Token stored hashed in DB
-   Verification email sent

Account becomes active after verification.

### Login

Requires:

-   email
-   password
-   deviceId (UUID)

On success:

-   access token
-   refresh token
-   refresh token stored hashed in database
-   max 5 active device sessions

Tokens stored in HTTP-only cookies.

### Refresh Token

-   Refresh token verified
-   Checked against DB
-   Old token removed
-   New tokens issued

Invalid token → session removed.

### Logout

-   Refresh token removed from DB
-   Cookies cleared

### Password Reset

-   Reset token generated
-   Stored hashed
-   15 minute expiry
-   Reset email sent

After password reset all sessions are cleared.

## Poll System

### Poll

-   2 to 6 options
-   Unique title per user
-   Has expiration time
-   TTL index deletes poll after expiry

### Vote

-   One vote per user per poll
-   Unique index prevents duplicates
-   Votes auto-delete after poll expires

## Real-Time Voting

Using Socket.IO

### Join Poll

Client joins room:

poll:`<pollId>`{=html}

Server sends poll state.

### Cast Vote

-   User must be authenticated
-   Vote stored in DB
-   Poll counts updated
-   Updated poll broadcast to room

### Close Poll

Only poll creator can close it.

Server broadcasts poll closed event.

## Rate Limiting
```
  Route            Limit
  ---------------- -----------------
  Register         5 / 15 minutes
  Login            5 / 15 minutes
  Password Reset   5 / hour
  Refresh Token    20 / 15 minutes
```

## API Docs

Swagger UI available at:
```
/api-docs
```
## Local Development

Install dependencies
```
npm install
```
Run server
```
npm run dev
```
## Testing

Testing tools used:

-   Jest
-   Supertest
-   mongodb-memory-server
-   socket.io-client

Run tests:
```
npm test
```
## License

MIT
