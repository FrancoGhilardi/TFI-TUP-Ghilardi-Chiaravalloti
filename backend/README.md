<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Database

PostgreSQL in the `libreria` schema, accessed with Drizzle ORM over a plain `pg` connection. The same code runs against a local Docker database and against Supabase; only environment variables change.

Requirements: Docker and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```bash
cp .env.example .env
pnpm db:start        # local Postgres, pooler and Storage (with its buckets) in Docker
pnpm db:migrate      # applies drizzle/*.sql
pnpm db:seed-admin   # needs SEED_ADMIN_* in .env
pnpm db:smoke        # read-only sanity check, safe against any target
```

### File storage

Product images are kept in Supabase Storage, locally too: `pnpm db:start` starts it and creates the two buckets declared in `supabase/config.toml` (`product-originals`, private, and `product-images`, public). `.env.example` already points `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the local stack; its key is the fixed demo key of the Supabase CLI and works nowhere else. `SUPABASE_ANON_KEY` is never read by the app: the e2e tests and `pnpm storage:setup` use it to check that the buckets stay closed to anyone without the `service_role` key.

The buckets have no access policies: only the backend reads and writes them, with the `service_role` key, and the only open door is the public address of the processed images. On a Supabase project, set the project URL and its `service_role` key (Settings > API) in the environment and run `pnpm storage:setup` (or `pnpm storage:setup:deploy` after a build): it creates the buckets that are missing and updates the ones that differ, with the visibility, 10 MB limit and formats defined in `src/shared/infrastructure/storage/storage-buckets.ts`, and running it again changes nothing. With the project's anon key in `SUPABASE_ANON_KEY` it then checks, with a probe file it removes afterwards, that anyone holding that key cannot list, download, upload or remove files beyond reading the processed images, and fails naming what is open (for example, a policy added from the dashboard); without it, it warns that nothing was checked. The key gives full access to Storage: keep it out of the repository and of any log.

### Connection profiles

| Profile                   | `DATABASE_URL`                                                                                    | `DATABASE_SSL_MODE`               |
| ------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------- |
| Local, direct (default)   | `postgresql://libreria_app:libreria_app@127.0.0.1:54322/postgres`                                 | `disable`                         |
| Local, through the pooler | `postgresql://libreria_app.pooler-dev:libreria_app@127.0.0.1:54329/postgres`                      | `disable`                         |
| Supabase                  | `postgresql://libreria_app.<project-ref>:<password>@<pooler-host>:5432/postgres` (session pooler) | `verify-full` + `DATABASE_SSL_CA` |

Do not put `sslmode` in the URLs; use `DATABASE_SSL_MODE`. To use another target keep its variables in a separate ignored file and select it with `ENV_FILE`:

```bash
ENV_FILE=.env.supabase pnpm db:migrate
ENV_FILE=.env.supabase pnpm db:smoke
ENV_FILE=.env.supabase pnpm start:dev
```

`pnpm db:smoke` prints the same output on every target except the SSL line.

### Roles

- `postgres` (`DATABASE_MIGRATION_URL`): owns the schema and runs migrations. Never used by the API.
- `libreria_app` (`DATABASE_URL`): runtime role with DML only on `libreria`. Migration `0003` creates it without login; locally `supabase/roles.sql` creates it with a development password. On a new Supabase project, enable it once from the SQL editor with a long random password:

```sql
ALTER ROLE libreria_app WITH LOGIN PASSWORD '<generated-secret>';
```

### Changing the schema

1. Edit `src/shared/infrastructure/database/schema/*`.
2. `pnpm db:generate` and review the generated SQL.
3. `pnpm db:migrate`.

Functions, triggers and deferrable constraints are not modeled by Drizzle: create them with `pnpm db:custom <name>`.

Rules:

- Never run `drizzle-kit push`.
- Never edit a migration that has already been applied anywhere; add a new one.
- `supabase/migrations` is not used; `drizzle/` is the source of truth.
- Do not create objects by hand in the Supabase dashboard (except the `libreria_app` password).

### Tests

`pnpm test:e2e` needs the local database and Storage (`pnpm db:start`). It runs the migrations first and refuses to run if `DATABASE_MIGRATION_URL` does not point to `127.0.0.1` or `localhost`.

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project:

```bash
$ pnpm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/overview) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
