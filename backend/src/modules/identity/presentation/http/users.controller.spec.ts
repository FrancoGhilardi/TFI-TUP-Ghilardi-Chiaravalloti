import { SortDirection } from "../../../../shared/application/pagination.js";
import type { CreateUserUseCase } from "../../application/use-cases/create-user.use-case.js";
import type { GetUserUseCase } from "../../application/use-cases/get-user.use-case.js";
import type { ListUsersUseCase } from "../../application/use-cases/list-users.use-case.js";
import type { ResetUserPasswordUseCase } from "../../application/use-cases/reset-user-password.use-case.js";
import type { UpdateUserUseCase } from "../../application/use-cases/update-user.use-case.js";
import { UserRole } from "../../domain/user-role.js";
import type { AuthUser } from "../auth-user.js";
import { UsersController } from "./users.controller.js";

const ACTOR: AuthUser = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  role: UserRole.ADMIN,
  mustChangePassword: false,
};

function setUp() {
  const list = { execute: vi.fn(() => Promise.resolve({})) };
  const get = { execute: vi.fn(() => Promise.resolve({})) };
  const create = { execute: vi.fn(() => Promise.resolve({})) };
  const update = { execute: vi.fn(() => Promise.resolve({})) };
  const reset = { execute: vi.fn(() => Promise.resolve()) };
  const controller = new UsersController(
    list as unknown as ListUsersUseCase,
    get as unknown as GetUserUseCase,
    create as unknown as CreateUserUseCase,
    update as unknown as UpdateUserUseCase,
    reset as unknown as ResetUserPasswordUseCase,
  );
  return { list, get, create, update, reset, controller };
}

describe("UsersController", () => {
  it("passes the listing query through", async () => {
    const { list, controller } = setUp();

    await controller.findAll({ q: "ana", page: 2, limit: 10, sortDir: SortDirection.DESC });

    expect(list.execute).toHaveBeenCalledExactlyOnceWith({
      q: "ana",
      role: undefined,
      status: undefined,
      sortDir: SortDirection.DESC,
      page: 2,
      limit: 10,
    });
  });

  it("creates the user on behalf of the admin", async () => {
    const { create, controller } = setUp();

    await controller.create(
      {
        email: "nuevo@example.com",
        name: "Nuevo",
        role: UserRole.SELLER,
        temporaryPassword: "temporary-123",
      },
      ACTOR,
    );

    expect(create.execute).toHaveBeenCalledExactlyOnceWith({
      actorId: "admin-1",
      email: "nuevo@example.com",
      name: "Nuevo",
      role: UserRole.SELLER,
      temporaryPassword: "temporary-123",
    });
  });

  it("edits the user of the route on behalf of the admin", async () => {
    const { update, controller } = setUp();

    await controller.update("user-2", { role: UserRole.ADMIN }, ACTOR);

    expect(update.execute).toHaveBeenCalledExactlyOnceWith({
      actorId: "admin-1",
      userId: "user-2",
      email: undefined,
      name: undefined,
      role: UserRole.ADMIN,
      isActive: undefined,
    });
  });

  it("resets the password of the user of the route on behalf of the admin", async () => {
    const { reset, controller } = setUp();

    await expect(controller.resetPassword("user-2", ACTOR)).resolves.toBeUndefined();

    expect(reset.execute).toHaveBeenCalledExactlyOnceWith({ actorId: "admin-1", userId: "user-2" });
  });
});
