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

| Variable                      | Required | Description                                                                                           |
| ----------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`         | Yes      | Origin of the backend API, such as `http://localhost:3001`. The `/api/v1` prefix is added by the app. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Yes      | Store WhatsApp number in international format, digits only, such as `5492622380159`.                  |

| `NEXT_PUBLIC_WHATSAPP_DISPLAY` | Yes | The same number as shown to customers, such as `2622 38-0159`. |

The rest of the store details (Instagram, city, hours, email, services) live
in `src/modules/core/config/site.ts`.

The variables are validated when `next dev` or `next build` starts; an invalid or missing one stops
the command with a message naming it. `NEXT_PUBLIC_*` values are inlined into the bundle at build
time, so changing them requires a new build.

## Commands

```bash
pnpm dev                  # development server
pnpm build                # production build
pnpm start                # serve the production build
pnpm test                 # unit (*.spec.ts, node) and component (*.spec.tsx, jsdom) tests
pnpm test:watch           # tests in watch mode
pnpm lint                 # lint:fix to fix
pnpm format:check         # format to fix
```

## Structure

Each feature is a module in `src/modules/<module>/` with `domain/`, `application/`,
`infrastructure/` and `ui/` layers; the routes in `src/app/` only compose modules. A module's
`index.ts` is its public surface: other modules import `@/modules/<module>`, never its folders.

| Module        | Holds                                                                                                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`        | `config/` (validated `publicConfig`, `siteConfig`), `http/` (API client and errors), `lib/utils.ts` (`cn`), `hooks/` (hooks shared by every module), `ui/` (shared components, fonts, icons) and `ui/primitives/` (shadcn/ui components) |
| `catalog`     | Category tree (`getCategoryTree`, `CategoryNode`)                                                                                                                                                                                        |
| `site-layout` | `StoreShell`: header, navigation, mobile menu and footer of the public pages                                                                                                                                                             |
| `whatsapp`    | `wa.me` links (`generalInquiryUrl`)                                                                                                                                                                                                      |

Public pages live in the `src/app/(public)/` route group, whose layout renders `StoreShell`.

### UI components

shadcn/ui components are added with `pnpm dlx shadcn@latest add <component>`; `components.json`
places them in `src/modules/core/ui/primitives/`. The design tokens (palette, fonts, radii,
shadows, the `nav` breakpoint at 861px) are defined in `src/app/globals.css`, and shadcn's own
variables are mapped to them. The store has a light theme only.

### Calling the API

Only a module's `infrastructure/` layer calls the API, through `core/http`, which wraps an axios
instance with the fetch adapter: axios calls the global `fetch` on each request, the one Next
extends on the server, and forwards `next` and `cache`, so ISR, `revalidate` and tags keep
working.

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
- The client always passes a `signal` (one deadline for the whole call), which turns off Next's per-render
  deduplication. Wrap reads shared by several components of the same render (such as
  `generateMetadata` and the page) in React's `cache()`.
- Authenticated calls use their own instance from `createApiClient` (axios interceptors add the
  token and handle the 401), given `getAccessToken`,
  `onUnauthorized` and instance defaults such as `credentials: "include"`. When an authenticated
  request gets a 401, `onUnauthorized` may renew the session and resolve `true` to retry it once.
  Concurrent 401s share a single renewal, since the API revokes every session when a refresh
  token is reused.
- Plain objects and arrays are sent as JSON; `FormData` as multipart with its boundary; `Blob`
  with its own type.

### Client state

TanStack Query is added with the first data read from the browser (the admin panel), its
`queryFn` calling `core/http`. Zustand holds global state: persisted in `localStorage` for the
cart, in memory for the panel session. The access token is never stored in the browser.
