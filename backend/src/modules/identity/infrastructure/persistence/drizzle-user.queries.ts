import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import {
  offsetOf,
  type Page,
  pageOf,
  RecordStatusFilter,
  SortDirection,
} from "../../../../shared/application/pagination.js";
import { containsPattern } from "../../../../shared/infrastructure/database/like-pattern.js";
import { DrizzleExecutor } from "../../../../shared/infrastructure/database/drizzle.executor.js";
import { users } from "../../../../shared/infrastructure/database/schema/index.js";
import type { ListUsersQuery } from "../../application/dto/list-users.query.js";
import type { UserResult } from "../../application/dto/user.result.js";
import { UserQueries } from "../../application/ports/user-queries.js";
import { UserRole } from "../../domain/user-role.js";

// Only what the panel shows: never the hashes or the temporary password.
const RESULT_COLUMNS = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  isActive: users.isActive,
  mustChangePassword: users.mustChangePassword,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  deletedAt: users.deletedAt,
};

type ResultRow = Omit<UserResult, "role"> & { role: keyof typeof UserRole };

@Injectable()
export class DrizzleUserQueries extends UserQueries {
  constructor(private readonly executor: DrizzleExecutor) {
    super();
  }

  async findPage(query: ListUsersQuery): Promise<Page<UserResult>> {
    const where = and(
      statusCondition(query.status),
      roleCondition(query.role),
      searchCondition(query.q),
    );
    const direction = query.sortDir === SortDirection.DESC ? desc : asc;
    const db = this.executor.current();
    const [rows, [total]] = await Promise.all([
      db
        .select(RESULT_COLUMNS)
        .from(users)
        .where(where)
        // Case does not change the order. The email breaks ties, and the id breaks the ones a
        // deleted user and a current one with the same email leave, so pages never overlap.
        .orderBy(direction(sql`lower(${users.name})`), asc(users.email), asc(users.id))
        .limit(query.limit)
        .offset(offsetOf(query)),
      db.select({ total: count() }).from(users).where(where),
    ]);
    return pageOf(rows.map(toResult), total?.total ?? 0, query);
  }

  async findById(id: string): Promise<UserResult | null> {
    const [row] = await this.executor
      .current()
      .select(RESULT_COLUMNS)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ? toResult(row) : null;
  }
}

function statusCondition(status: RecordStatusFilter | undefined): SQL | undefined {
  switch (status) {
    case RecordStatusFilter.ACTIVE:
      return and(isNull(users.deletedAt), eq(users.isActive, true));
    case RecordStatusFilter.INACTIVE:
      return and(isNull(users.deletedAt), eq(users.isActive, false));
    case RecordStatusFilter.DELETED:
      return isNotNull(users.deletedAt);
    case RecordStatusFilter.ALL:
      return undefined;
    case undefined:
      return isNull(users.deletedAt);
  }
}

function roleCondition(role: UserRole | undefined): SQL | undefined {
  return role === undefined ? undefined : eq(users.role, role);
}

function searchCondition(text: string | undefined): SQL | undefined {
  if (!text) {
    return undefined;
  }
  const pattern = containsPattern(text);
  return or(ilike(users.name, pattern), ilike(users.email, pattern));
}

function toResult(row: ResultRow): UserResult {
  return { ...row, role: UserRole[row.role] };
}
