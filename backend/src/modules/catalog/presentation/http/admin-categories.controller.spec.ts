import { HttpStatus, type PipeTransform } from "@nestjs/common";
import { HTTP_CODE_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { RecordStatusFilter, SortDirection } from "../../../../shared/application/pagination.js";
import { ROLES_KEY } from "../../../identity/presentation/decorators/roles.decorator.js";
import { CategorySortField } from "../../application/dto/list-admin-categories.query.js";
import { CategoryNotFoundError } from "../../application/errors/category-not-found-error.js";
import type { CreateCategoryUseCase } from "../../application/use-cases/create-category.use-case.js";
import type { DeleteCategoryUseCase } from "../../application/use-cases/delete-category.use-case.js";
import type { GetAdminCategoryUseCase } from "../../application/use-cases/get-admin-category.use-case.js";
import type { ListAdminCategoriesUseCase } from "../../application/use-cases/list-admin-categories.use-case.js";
import type { RestoreCategoryUseCase } from "../../application/use-cases/restore-category.use-case.js";
import type { UpdateCategoryUseCase } from "../../application/use-cases/update-category.use-case.js";
import { AdminCategoriesController } from "./admin-categories.controller.js";

const ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000a1";

function setUp() {
  const list = { execute: vi.fn(() => Promise.resolve({})) };
  const get = { execute: vi.fn(() => Promise.resolve({})) };
  const create = { execute: vi.fn(() => Promise.resolve({})) };
  const update = { execute: vi.fn(() => Promise.resolve({})) };
  const remove = { execute: vi.fn(() => Promise.resolve()) };
  const restore = { execute: vi.fn(() => Promise.resolve({})) };
  const controller = new AdminCategoriesController(
    list as unknown as ListAdminCategoriesUseCase,
    get as unknown as GetAdminCategoryUseCase,
    create as unknown as CreateCategoryUseCase,
    update as unknown as UpdateCategoryUseCase,
    remove as unknown as DeleteCategoryUseCase,
    restore as unknown as RestoreCategoryUseCase,
  );
  return { list, get, create, update, remove, restore, controller };
}

describe("AdminCategoriesController", () => {
  it("is open to admins and sellers", () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminCategoriesController)).toEqual(["ADMIN", "SELLER"]);
  });

  it("passes the listing query through", async () => {
    const { list, controller } = setUp();

    await controller.findAll({
      q: "cuad",
      parentId: ID,
      status: RecordStatusFilter.ALL,
      sortBy: CategorySortField.NAME,
      sortDir: SortDirection.DESC,
      page: 2,
      limit: 10,
    });

    expect(list.execute).toHaveBeenCalledExactlyOnceWith({
      q: "cuad",
      parentId: ID,
      status: RecordStatusFilter.ALL,
      sortBy: CategorySortField.NAME,
      sortDir: SortDirection.DESC,
      page: 2,
      limit: 10,
    });
  });

  it("creates with the fields of the body", async () => {
    const { create, controller } = setUp();

    await controller.create({ name: "Cuadernos", parentId: ID, sortOrder: 1, isActive: false });

    expect(create.execute).toHaveBeenCalledExactlyOnceWith({
      name: "Cuadernos",
      description: undefined,
      parentId: ID,
      sortOrder: 1,
      isActive: false,
    });
  });

  it("edits the category of the route, keeping a null parent", async () => {
    const { update, controller } = setUp();

    await controller.update(ID, { parentId: null, description: "" });

    expect(update.execute).toHaveBeenCalledExactlyOnceWith({
      categoryId: ID,
      name: undefined,
      description: "",
      parentId: null,
      sortOrder: undefined,
      isActive: undefined,
    });
  });

  it("gets, deletes and restores the category of the route", async () => {
    const { get, remove, restore, controller } = setUp();

    await controller.findOne(ID);
    await controller.remove(ID);
    await controller.restore(ID);

    expect(get.execute).toHaveBeenCalledExactlyOnceWith(ID);
    expect(remove.execute).toHaveBeenCalledExactlyOnceWith({ categoryId: ID });
    expect(restore.execute).toHaveBeenCalledExactlyOnceWith({ categoryId: ID });
  });

  it("answers 204 to a deletion and 200 to a restore", () => {
    const handler = (name: "remove" | "restore") =>
      Object.getOwnPropertyDescriptor(AdminCategoriesController.prototype, name)?.value as object;

    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("remove"))).toBe(HttpStatus.NO_CONTENT);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("restore"))).toBe(HttpStatus.OK);
  });

  it("answers CATEGORY_NOT_FOUND to an id that is not a UUID", async () => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, AdminCategoriesController, "findOne") as
      Record<string, { pipes: PipeTransform[] }> | undefined;
    const [pipe] = Object.values(args ?? {})[0].pipes;

    await expect(pipe.transform("not-a-uuid", { type: "param" })).rejects.toThrow(
      CategoryNotFoundError,
    );
  });
});
