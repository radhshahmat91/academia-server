# AcademiaConnect Server

REST API and real-time layer for **AcademiaConnect**, a full-stack university platform. The website itself (Next.js, BetterAuth) lives in the companion `academiaconnect-client` repository.

- **Runtime:** Node.js 20.12+ · **Framework:** Express 5 · **Language:** TypeScript
- **Database:** MongoDB with Mongoose · **Real-time:** Socket.io
- **Auth:** verifies the JWTs issued by BetterAuth in the Next.js client against its JWKS endpoint (`jose`)
- **Hardening:** Helmet security headers, CORS allow-list, a rate limit of 600 requests a minute per IP on `/api`, zod request validation and one consistent JSON error format

## Getting started

```bash
cd server
npm install
cp .env.example .env     # edit if your MongoDB or client URL differ
npm run seed             # demo data: students, courses, fees, chat history
npm run dev              # http://localhost:5000
```

Scripts: `npm run dev` (watch mode), `npm run build` (tsup to `dist/`), `npm start`, `npm run seed`, `npm run typecheck`.

The API fetches BetterAuth's public keys from the client to verify tokens. If the client is not reachable yet, signed-in requests answer `401` until it is, then work again on their own. Public endpoints never depend on the client.

### Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port. Render sets it for you. Default `5000`. |
| `NODE_ENV` | `development` or `production`. |
| `MONGODB_URI`, `MONGODB_DB` | The same database the client uses for BetterAuth. |
| `CLIENT_URL` | Allowed browser origins, comma separated (your Vercel URL). Used for CORS and Socket.io. |
| `AUTH_URL` | Public URL of the Next.js client. The API reads `AUTH_URL/api/auth/jwks` to verify tokens. Defaults to the first `CLIENT_URL`. |
| `AUTH_JWKS_URL` | Optional override of the JWKS endpoint. |
| `AUTH_ISSUER` | Optional. When set, tokens must carry this issuer. |

### The seed script

`npm run seed` fills the database with demo data: 25 students, 41 courses with 100 video lectures, sections, 11 clubs, events, notices, 7 semesters with grades, invoices and payments, 8 bus routes and chat history. It also creates the demo accounts (see the client repository's README).

- It **drops every collection except BetterAuth's signing keys (`jwks`)** and starts over. Never point it at a database that holds real data.
- It refuses to run when `NODE_ENV=production` unless you add `--force`, so a production database is not wiped by accident.
- It only needs `MONGODB_URI` and `MONGODB_DB`. To seed Atlas from your own computer: `MONGODB_URI="mongodb+srv://..." npm run seed`.

## How authentication works

BetterAuth runs inside the Next.js client. After login the browser asks it for a short-lived JWT (15 minutes) and sends it as `Authorization: Bearer <token>`. The API verifies the signature against the client's JWKS and reads the user id from `sub`. Admin routes also look the user up in MongoDB on every request, so promoting or demoting someone takes effect immediately.

## REST API

Base path `/api`. **Public** needs no token, **User** needs any signed-in account, **Admin** needs the admin role. List endpoints accept `q`, `page` and `limit`.

### Public

| Endpoint | Purpose |
|---|---|
| `GET /health` | Health check used by Render |
| `GET /public/stats` | Counters for the home page |
| `POST /contact` | Contact form message |
| `GET /semesters` | Semesters and their dates |
| `GET /courses`, `GET /courses/meta` | Course catalog with search and filters, and the departments, categories and levels to filter by |
| `GET /clubs`, `GET /events` | Club and event lists |
| `GET /notices`, `GET /notices/:id` | Notice board and a single notice |
| `GET /transport/routes` | Bus routes, stops and fees |

### Signed-in users

| Area | Endpoints |
|---|---|
| Course, club and event pages | `GET /courses/:id`, `POST /courses/:id/progress`, `GET /clubs/:id`, `POST` and `DELETE /clubs/:id/join`, `GET /events/:id`, `POST` and `DELETE /events/:id/register` |
| Profile and community | `GET /me`, `PATCH /me`, `GET /dashboard`, `GET /notifications`, `POST /notifications/read`, `GET /students`, `GET /students/:id` |
| Semester registration | `GET /registration/context`, `POST /registration`, `DELETE /registration` |
| Results and evaluation | `GET /academics/history`, `GET /evaluations`, `POST /evaluations` |
| Fees and payments | `GET /fees`, `GET /fees/invoices/:id`, `POST /payments/checkout`, `POST /payments/:id/confirm`, `GET /payments/:id` (receipt) |
| Transportation | `GET /transport/pass`, `POST /transport/pass`, `DELETE /transport/pass/:id` |
| Messaging | `GET /chat/conversations`, `POST /chat/direct`, `GET /chat/conversations/:id/messages`, `POST /chat/conversations/:id/messages`, `POST /chat/conversations/:id/read` |

Group chats are created automatically: one per club (when a student joins) and one per course (when a student registers for it). Sending also works over the socket, see below.

### Admin

| Endpoint | Purpose |
|---|---|
| `GET`, `POST /admin/{resource}` and `GET`, `PATCH`, `DELETE /admin/{resource}/:id` | Full CRUD where `{resource}` is `courses`, `clubs`, `events`, `notices`, `semesters`, `sections` or `routes`. Sections also filter by `semester` and `course`. Creating a notice notifies every student. Records that students depend on cannot be deleted. |
| `GET /admin/stats` | Overview numbers and chart series |
| `GET /admin/users`, `PATCH /admin/users/:id` | Search users, change role, profile fields and tuition waiver (0 to 100 percent) |
| `GET /admin/enrollments?section=`, `PATCH /admin/enrollments/:id` | Class list of a section and grade entry from marks (0 to 100); the student is notified |
| `GET /admin/invoices`, `POST /admin/invoices/:id/payments` | Invoices and offline (cash or bank) payments |
| `GET /admin/payments`, `POST /admin/payments/:id/refund` | Payments and refunds |
| `GET /admin/passes` | Bus passes |
| `GET /admin/evaluations?semester=` | Combined, anonymous evaluation results |
| `GET /admin/messages` | Contact form inbox |

### Responses and errors

Paged lists (courses, events, notices and every admin list) return `{ items, total, page, pages }`. Small lists (clubs, semesters, bus routes) return `{ items }`. Every object uses `id` instead of MongoDB's `_id`. Errors always look like this, with a message that is safe to show to the person:

```json
{ "message": "Register for at least 9 credits. You picked 6." }
```

Status codes: `400` invalid input, `401` missing or expired token, `403` not allowed, `404` not found, `409` conflict (for example a section that just filled up), `500` unexpected.

## Socket.io events

Connect to the server root with `auth: { token }`, using the same JWT as REST. Each user is placed in a private room, so events only reach the right people.

| Direction | Event | Payload |
|---|---|---|
| client to server | `message:send` | `{ conversationId, text }`. Acknowledged with `{ ok: true, data: message }` or `{ ok: false, message }`. |
| client to server | `typing` | `{ conversationId, typing }` |
| client to server | `conversation:read` | `{ conversationId }`. Acknowledged with `{ ok }`. |
| server to client | `message:new` | `{ message, conversationId, last, person }` to every member |
| server to client | `typing` | `{ conversationId, userId, name, typing }` |
| server to client | `message:read` | `{ conversationId, userId, at }` |
| server to client | `presence:list` | Array of online user ids, sent on connect |
| server to client | `presence:update` | `{ userId, online }` |
| server to client | `notification:new` | The new notification (payments, results, notices, registration and more) |

## Business rules worth knowing

- **Registration** is validated on the server, not only in the UI: the credit range, prerequisites, courses already passed, weekly schedule clashes, the registration deadline and seat capacity (seats are claimed atomically, so two students cannot take the last one). Once a payment exists the registration is locked.
- **Fees** are `credits x per-credit rate + registration + library + student activity`. A waiver applies to tuition only. The total is split into three installments (40, 30 and 30 percent) due 1, 5 and 9 weeks after registering. The invoice's due date always points at the next unpaid installment.
- **Payments** go through a sandbox gateway. The verification code is `123456`. A refund reverses the installments and the invoice balance, and puts an active bus pass back to pending.
- **Grades** use this scale: A+ 4.00 (80 and above), A 3.75, A- 3.50, B+ 3.25, B 3.00, B- 2.75, C+ 2.50, C 2.25, D 2.00 (40 and above), F 0.
- **Results** of a finished semester stay hidden until the student has submitted every course evaluation. Admins only receive averages and comments. The student is never included in what the evaluations endpoint returns.

## Project structure

```
src/
  index.ts          HTTP server, Socket.io and MongoDB connection
  app.ts            Express app: security headers, CORS, rate limit, error handling
  auth.ts           JWT verification, requireAuth and requireAdmin
  config.ts         environment parsing
  models.ts         Mongoose schemas
  routes/           catalog, me, academics, finance, chat, admin
  lib/              fees, academics (grades), evaluations, transport, chat,
                    realtime (Socket.io), emit, notify, http (errors, paging)
  seed/             demo data and the seed script
render.yaml         Render blueprint
```

## Deploying to Render

`render.yaml` is a ready blueprint. Create a Web Service from this repository, set `MONGODB_URI`, `CLIENT_URL` and `AUTH_URL`, and keep `/api/health` as the health check. The free plan sleeps after 15 minutes without traffic, so the first request after a pause takes a short while and an open chat reconnects by itself. The whole sequence (Atlas, Render, Vercel, Google sign-in, seeding) is in `DEPLOYMENT.md` in the project bundle.
