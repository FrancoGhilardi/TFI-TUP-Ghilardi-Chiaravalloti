import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DrizzleExecutor } from "../../../../shared/infrastructure/database/drizzle.executor.js";
import { users } from "../../../../shared/infrastructure/database/schema/index.js";
import type { User } from "../../domain/entities/user.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { UserMapper } from "./user.mapper.js";

@Injectable()
export class DrizzleUserRepository extends UserRepository {
  constructor(private readonly executor: DrizzleExecutor) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.executor
      .current()
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }
}
