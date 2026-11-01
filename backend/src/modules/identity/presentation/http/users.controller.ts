import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Page } from "../../../../shared/application/pagination.js";
import {
  ApiErrors,
  VALIDATION_FAILED,
} from "../../../../shared/presentation/http/openapi-decorators.js";
import { StrictRateLimit } from "../../../../shared/presentation/http/rate-limit.js";
import type { UserResult } from "../../application/dto/user.result.js";
import { UserNotFoundError } from "../../application/errors/user-not-found-error.js";
import { CreateUserUseCase } from "../../application/use-cases/create-user.use-case.js";
import { DeleteUserUseCase } from "../../application/use-cases/delete-user.use-case.js";
import { GetUserUseCase } from "../../application/use-cases/get-user.use-case.js";
import { ListUsersUseCase } from "../../application/use-cases/list-users.use-case.js";
import { ResetUserPasswordUseCase } from "../../application/use-cases/reset-user-password.use-case.js";
import { RestoreUserUseCase } from "../../application/use-cases/restore-user.use-case.js";
import { UpdateUserUseCase } from "../../application/use-cases/update-user.use-case.js";
import { UserRole } from "../../domain/user-role.js";
import type { AuthUser } from "../auth-user.js";
import { CurrentUser } from "../decorators/current-user.decorator.js";
import { Roles } from "../decorators/roles.decorator.js";
import { RESET_PASSWORD_RATE_LIMIT } from "./users-rate-limits.js";
import { CreateUserRequestDto } from "./create-user.request.dto.js";
import { ListUsersRequestDto } from "./list-users.request.dto.js";
import { UpdateUserRequestDto } from "./update-user.request.dto.js";
import { UserPageResponseDto, UserResponseDto } from "./user.response.dto.js";

// An id that is not a UUID cannot name any user; it never reaches the database.
const USER_ID = new ParseUUIDPipe({ exceptionFactory: () => new UserNotFoundError() });

/** User management, only for admins. */
@ApiTags("Users")
@Controller("admin/users")
@Roles(UserRole.ADMIN)
@ApiErrors({ 403: ["PASSWORD_CHANGE_REQUIRED", "INSUFFICIENT_ROLE"] })
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly resetUserPassword: ResetUserPasswordUseCase,
    private readonly deleteUser: DeleteUserUseCase,
    private readonly restoreUser: RestoreUserUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "List the users, by name" })
  @ApiOkResponse({ type: UserPageResponseDto })
  @ApiErrors({ 400: [VALIDATION_FAILED] })
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
  @ApiOperation({ summary: "Get a user, deleted or not" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors({ 404: ["USER_NOT_FOUND"] })
  findOne(@Param("id", USER_ID) id: string): Promise<UserResult> {
    return this.getUser.execute(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a user, who must change the given password" })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiErrors({
    400: [VALIDATION_FAILED, "INVALID_EMAIL", "INVALID_USER_NAME", "INVALID_PASSWORD"],
    409: ["EMAIL_ALREADY_IN_USE"],
  })
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
  @ApiOperation({ summary: "Edit the fields sent" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors({
    400: [VALIDATION_FAILED, "INVALID_EMAIL", "INVALID_USER_NAME"],
    404: ["USER_NOT_FOUND"],
    409: ["EMAIL_ALREADY_IN_USE"],
    422: ["USER_DELETED", "SELF_ADMINISTRATION", "LAST_ACTIVE_ADMIN"],
  })
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

  /** Takes no body: the system generates the temporary password and mails it to the user. */
  @Post(":id/reset-password")
  @StrictRateLimit(RESET_PASSWORD_RATE_LIMIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Replace the password with a temporary one and mail it" })
  @ApiNoContentResponse()
  @ApiErrors({
    404: ["USER_NOT_FOUND"],
    422: ["USER_DELETED", "SELF_ADMINISTRATION"],
    502: ["MAIL_DELIVERY_FAILED"],
  })
  resetPassword(@Param("id", USER_ID) id: string, @CurrentUser() actor: AuthUser): Promise<void> {
    return this.resetUserPassword.execute({ actorId: actor.id, userId: id });
  }

  /** A logical deletion: the user stays, with the date and the admin who deleted it. */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete the user logically; repeating it changes nothing" })
  @ApiNoContentResponse()
  @ApiErrors({ 404: ["USER_NOT_FOUND"], 422: ["SELF_ADMINISTRATION", "LAST_ACTIVE_ADMIN"] })
  remove(@Param("id", USER_ID) id: string, @CurrentUser() actor: AuthUser): Promise<void> {
    return this.deleteUser.execute({ actorId: actor.id, userId: id });
  }

  @Post(":id/restore")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Restore a deleted user, active" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors({
    404: ["USER_NOT_FOUND"],
    409: ["EMAIL_ALREADY_IN_USE"],
    422: ["USER_NOT_DELETED"],
  })
  restore(@Param("id", USER_ID) id: string, @CurrentUser() actor: AuthUser): Promise<UserResult> {
    return this.restoreUser.execute({ actorId: actor.id, userId: id });
  }
}
