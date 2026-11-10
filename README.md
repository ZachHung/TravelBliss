# Travel Bliss API

API for the Travel Bliss project

## Prerequisite

- NodeJS v22
- Posgres

## Getting Started

### Clone this repo

```bash
git clone https://github.com/ZachHung/TravelBliss-API
cd TravelBliss-API
```

### Install `pnpm`

```bash
npm install -g pnpm
```

### Installing packages

```bash
pnpm i
```

### Create a `.env` file

Create a `.env` file at the root of the project with this structure:

```
PORT =
POSTGRES_HOST =
POSTGRES_USER =
POSTGRES_PASSWORD =
POSTGRES_PORT =
POSTGRES_DB =
SECRET_JWT =
JWT_EXPIRED =
SECRET_REFRESH =
REFRESH_EXPIRED =
SALT_ROUND =
```

### Run the migration for the Postgres DB

```bash
pnpm migration:run
```

### Running the API

#### In Dev mode

```bash
pnpm start:dev
```

#### In Non-dev mode

```bash
pnpm build && pnpm start
```
