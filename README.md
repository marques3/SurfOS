# SurfOS · Bis

An MVP for managing surf schools in Aljezur: instructor schedules, students, bookings, and manually recorded payments. Includes a PT/EN frontend and an API built with **TypeScript + NestJS 11 + MySQL 8.4**.

This package is independent of the published prototype. The previous URL still serves the demo; pushing this code to GitHub does not automatically deploy the application.

## Getting started with Docker

Requirements: Git and Docker Desktop with Docker Compose v2. On Windows, you can use the WSL terminal in VS Code.

1. Extract the ZIP and open the `surfos` folder.
2. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env`. Set `DB_PASSWORD` and `DB_ROOT_PASSWORD` to different passwords. For your first local run, keep `NODE_ENV=development`, `APP_ORIGIN=http://localhost:3000`, and `ALLOW_REGISTRATION=true`.
4. Run:

   ```bash
   docker compose up --build -d
   docker compose logs -f app
   ```

5. Open **http://localhost:3000** and select **Create a school** (or **Criar uma escola** if the interface is in Portuguese). Your user account will be the school administrator. Add an instructor, a student, a lesson, and then a booking.

The migration runs in the `migrate` service before the application starts. Data is stored in the `mysql_data` Docker volume. `docker compose down` stops the services; **do not use `down -v` if you want to keep your data**.

If port 3306 is already in use, for example by XAMPP, set `DB_PORT=3307` in `.env`. The application inside Docker will still connect to port 3306 of the `db` service. If you change `PORT`, also update the port in `APP_ORIGIN` and open that exact address in your browser. Do not switch from `localhost` to `127.0.0.1` without updating `APP_ORIGIN`.

## Optional demo school

On your first run, you can create a school with 3 instructors, 8 students, 6 lessons, and 8 bookings. Lessons are scheduled for the day the seed runs, using the `Europe/Lisbon` time zone.

Set the following in `.env`:

```dotenv
SEED_EMAIL=demo@example.com
SEED_PASSWORD=choose-a-password-with-at-least-12-characters
SEED_CONFIRM=demo-only
```

Then run:

```bash
docker compose run --rm migrate node dist/database/seed.js
```

Sign in using the values you configured. No fixed credentials are included. The seed refuses to run in production and does not overwrite existing accounts. Remove `SEED_PASSWORD` from `.env` after creating the demo.

## Running with Node and MySQL

Requirements: **Node 24 LTS**, npm, and MySQL 8.4. Alternatively, run `docker compose up -d db` to start only the database. PHP/XAMPP is not required.

```bash
cp .env.example .env
# Fill in the database connection variables.
npm ci
npm run check
npm run build
npm run db:migrate
npm start
```

The database and user must exist before running the migration. If you are not using Docker, a MySQL administrator can create a dedicated database and grant permissions to the application user. Use `utf8mb4`. The migration user needs CREATE/ALTER/INDEX/REFERENCES and write permissions; use separate migration credentials in production.

`npm run dev` runs the TypeScript backend with ts-node. The frontend is compiled by `npm run build`; rerun this command after editing `web/src/`. `npm start` uses the compiled files.

## Implemented features

- School and administrator registration; login/logout; 8-hour sessions revoked on logout.
- School isolation across all queries and mutations. School IDs come from the session, never from a client-supplied field.
- Create, edit, and archive students and instructors. To edit, click the student's name or **Edit** on the instructor's card.
- Create, edit, and cancel lessons; browse by day or list.
- Server-side validation of capacity, valid calendar dates, operating hours, private lessons, and instructor/student scheduling conflicts.
- Bookings, duplicate prevention, cancellations, and manually recorded payment status.
- Prices stored as **integer cents**. Each booking keeps its price at creation time; changing the lesson price does not change existing bookings.
- Cancellations preserve history. Payments marked as received **are not refunded**. See **Settings → Cancelled bookings** for manual reconciliation.
- Per-school change history in `audit_log` and `GET /api/audit`.
- PT/EN interface. API validation messages are currently in Portuguese or use the validator's default messages.

Surf conditions and suggestions remain **examples**, with no weather data provider or actual AI integration.

## Project structure

```text
src/
  auth/           Login, registration, passwords, sessions, and route protection
  catalog/        School, instructors, and students
  scheduling/     Lessons, bookings, payments, and conflict rules
  database/       Connection pool, transactions, migrations, and seed
  common/         Configuration, types, and error responses
  main.ts         HTTP bootstrap, security, and static frontend
web/
  src/app.ts      TypeScript frontend connected to the API
  public/         HTML and CSS
database/
  migrations/     Versioned SQL migrations
test/             Unit and integration tests
docs/             Database model, API, deployment, and validation
.github/          CI with MySQL 8.4
```

The generated `dist/` and `public/` directories are excluded from Git. The build generates them.

## Testing

```bash
npm run check
npm run build
npm test
```

Integration tests require a **separate database whose name ends in `_test`**. They create and remove only their own test fixtures. Never point them at production.

```bash
# Create a surfos_test database and grant access to the test user first.
DB_NAME=surfos_test npm run test:integration
```

In PowerShell, set `$env:DB_NAME='surfos_test'` before running the command. In WSL, use the command above. Other variables are read from `.env`.

GitHub Actions runs the build, unit tests, and HTTP integration tests with MySQL 8.4 on every push and pull request. Validation performed while preparing this package is documented in [docs/VALIDATION.md](docs/VALIDATION.md).

## Pushing to your GitHub repository

Create an empty repository, preferably private during development, and run the following inside the extracted folder:

```bash
git init
git add .
git commit -m "Initial SurfOS backend and frontend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/surfos.git
git push -u origin main
```

Replace `YOUR_USERNAME`. The `.gitignore` excludes `.env`, dependencies, and build output. Check `git status` before committing. If the repository already contains files, integrate these files on a new branch rather than replacing its history.

This package has not been pushed to any GitHub repository.

## Limitations and next steps

This is an MVP foundation, not a finished commercial SaaS product. Password recovery, email verification, staff invitations and permissions, Stripe subscriptions, invoicing, notifications, automated backups, equipment management, live forecasts, travel-time rules between beaches, and operational monitoring are not implemented yet. Only the `owner` user role exists; instructors are operational records and do not have login accounts.

Lists are loaded per school without pagination, so this version is intended for small schools. Rate limiting is per process and IP; multiple replicas will require shared storage. All mutations within the same school are serialized using a row lock to protect bookings—a simple approach for the MVP.

Data stored in the browser by the old prototype is not automatically synchronized or imported. In this project, the browser stores only the language preference; operational data is stored in MySQL.

See [docs/DATABASE.md](docs/DATABASE.md), [docs/API.md](docs/API.md), and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
