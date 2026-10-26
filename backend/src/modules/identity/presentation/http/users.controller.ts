import {
  Body,
  Delete,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type { Page } from "../../../../shared/application/pagination.js";
import type { UserResult } from "../../application/dto/user.result.js";
import { NotImplementedYetError } from "../../../../shared/presentation/http/not-implemented-yet-error.js";
import { UserNotFoundError } from "../../application/errors/user-not-found-error.js";
import { CreateUserUseCase } from "../../application/use-cases/create-user.use-case.js";
import { GetUserUseCase } from "../../application/use-cases/get-user.use-case.js";
import { ListUsersUseCase } from "../../application/use-cases/list-users.use-case.js";
import { UpdateUserUseCase } from "../../application/use-cases/update-user.use-case.js";
import { UserRole } from "../../domain/user-role.js";
import type { AuthUser } from "../auth-user.js";
import { CurrentUser } from "../decorators/current-user.decorator.js";
import { Roles } from "../decorators/roles.decorator.js";
import { CreateUserRequestDto } from "./create-user.request.dto.js";
import { ListUsersRequestDto } from "./list-users.request.dto.js";
import { UpdateUserRequestDto } from "./update-user.request.dto.js";

// An id that is not a UUID cannot name any user; it never reaches the database.
const USER_ID = new ParseUUIDPipe({ exceptionFactory: () => new UserNotFoundError() });

/** User management, only for admins. */
@Controller("admin/users")
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
  ) {}

  @Get()
  findAll(@Query() query: ListUsersRequestDto): Promise<Page<UserResult>> {
    return this.listUsers.execute({
      q: query.q,
      role: query.role,
      status: query.status,
      sortDir: query.sortDir,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(":id")
  findOne(@Param("id", USER_ID) id: string): Promise<UserResult> {
    return this.getUser.execute(id);
  }

  @Post()
  create(@Body() body: CreateUserRequestDto, @CurrentUser() actor: AuthUser): Promise<UserResult> {
    return this.createUser.execute({
      actorId: actor.id,
      email: body.email,
      name: body.name,
      role: body.role,
      temporaryPassword: body.temporaryPassword,
    });
  }

  @Patch(":id")
  update(
    @Param("id", USER_ID) id: string,
    @Body() body: UpdateUserRequestDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserResult> {
    return this.updateUser.execute({
      actorId: actor.id,
      userId: id,
      email: body.email,
      name: body.name,
      role: body.role,
      isActive: body.isActive,
    });
  }

  // Designed routes whose use case is not built yet: their access rules already apply.
  @Post(":id/reset-password")
  resetPassword(): never {
    throw new NotImplementedYetError();
  }

  @Delete(":id")
  remove(): never {
    throw new NotImplementedYetError();
  }

  @Post(":id/restore")
  restore(): never {
    throw new NotImplementedYetError();
  }
}
