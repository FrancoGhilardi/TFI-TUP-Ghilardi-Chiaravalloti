# Librería Mi Sueño — Frontend

Public shop and admin panel of Librería Mi Sueño, built with Next.js 16 (App Router), React 19,
Tailwind CSS 4 and the React Compiler. It consumes the REST API in `../backend`.

## Requirements

- Node.js 22
- pnpm 10 (`corepack enable`)
- The backend running locally, or the URL of a deployed one

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev                  # http://localhost:3000
```

## Environment variables

| Variable              | Required | Description                                                                                           |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Yes      | Origin of the backend API, such as `http://localhost:3001`. The `/api/v1` prefix is added by the app. |

The variables are validated when `next dev` or `next build` starts; an invalid or missing one stops
the command with a message naming it. `NEXT_PUBLIC_*` values are inlined into the bundle at build
time, so changing them requires a new build.

## Commands

```bash
pnpm dev                  # development server
pnpm build                # production build
pnpm start                # serve the production build
pnpm test                 # unit tests (Vitest, src/**/*.spec.ts)
pnpm test:watch           # unit tests in watch mode
pnpm lint                 # lint:fix to fix
pnpm format:check         # format to fix
```

## Structure

Each feature is a module in `src/modules/<module>/` with `domain/`, `application/`,
`infrastructure/` and `ui/` layers; the routes in `src/app/` only compose modules.

`src/modules/core` holds what every module shares:

- `config/` — validated public configuration (`publicConfig.apiBaseUrl`).
- `http/` — the API client and its error model, exported from `@/modules/core/http`.

### Calling the API

Only a module's `infrastructure/` layer calls the API:

```ts
import { apiClient, type Page } from "@/modules/core/http";

export function getFeaturedProducts() {
  return apiClient.get<ProductCardDto[]>("/products/featured", { next: { revalidate: 60 } });
}
```

- Every failure is an `ApiError` with `status`, `code`, `details`, `retryAfter` and a `message`
  ready to show to the user, in Spanish. `fieldErrors()` gives the messages per field of a
  `VALIDATION_FAILED` error. A module can replace the message of a code with `errorMessages`.
- Requests time out after 30 seconds by default (`timeoutMs`). A cancellation through the
  caller's own `signal` is rethrown as is.
- The client always passes a `signal` to `fetch`, which turns off Next's per-render
  deduplication. Wrap reads shared by several components of the same render (such as
  `generateMetadata` and the page) in React's `cache()`.
- Authenticated calls use their own instance from `createApiClient`, given `getAccessToken`,
  `onUnauthorized` and instance defaults such as `credentials: "include"`. When an authenticated
  request gets a 401, `onUnauthorized` may renew the session and resolve `true` to retry it once.
  Concurrent 401s share a single renewal, since the API revokes every session when a refresh
  token is reused.
- Plain objects and arrays are sent as JSON; `FormData`, `Blob`, `URLSearchParams` and other
  `fetch` bodies are sent as is.
