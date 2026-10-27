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
import type { Page } from "../../../../shared/application/pagination.js";
import { AnyPanelRole } from "../../../identity/presentation/decorators/roles.decorator.js";
import type { AdminCategoryResult } from "../../application/dto/admin-category.result.js";
import { CategoryNotFoundError } from "../../application/errors/category-not-found-error.js";
import { CreateCategoryUseCase } from "../../application/use-cases/create-category.use-case.js";
import { DeleteCategoryUseCase } from "../../application/use-cases/delete-category.use-case.js";
import { GetAdminCategoryUseCase } from "../../application/use-cases/get-admin-category.use-case.js";
import { ListAdminCategoriesUseCase } from "../../application/use-cases/list-admin-categories.use-case.js";
import { RestoreCategoryUseCase } from "../../application/use-cases/restore-category.use-case.js";
import { UpdateCategoryUseCase } from "../../application/use-cases/update-category.use-case.js";
import { CreateCategoryRequestDto } from "./create-category.request.dto.js";
import { ListAdminCategoriesRequestDto } from "./list-admin-categories.request.dto.js";
import { UpdateCategoryRequestDto } from "./update-category.request.dto.js";

// An id that is not a UUID cannot name any category; it never reaches the database.
const CATEGORY_ID = new ParseUUIDPipe({ exceptionFactory: () => new CategoryNotFoundError() });

/** Category management in the admin panel, for admins and sellers. */
@Controller("admin/categories")
@AnyPanelRole()
export class AdminCategoriesController {
  constructor(
    private readonly listAdminCategories: ListAdminCategoriesUseCase,
    private readonly getAdminCategory: GetAdminCategoryUseCase,
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
    private readonly restoreCategory: RestoreCategoryUseCase,
  ) {}

  @Get()
  findAll(@Query() query: ListAdminCategoriesRequestDto): Promise<Page<AdminCategoryResult>> {
    return this.listAdminCategories.execute({
      q: query.q,
      parentId: query.parentId,
      status: query.status,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(":id")
  findOne(@Param("id", CATEGORY_ID) id: string): Promise<AdminCategoryResult> {
    return this.getAdminCategory.execute(id);
  }

  @Post()
  create(@Body() body: CreateCategoryRequestDto): Promise<AdminCategoryResult> {
    return this.createCategory.execute({
      name: body.name,
      description: body.description,
      parentId: body.parentId,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    });
  }

  @Patch(":id")
  update(
    @Param("id", CATEGORY_ID) id: string,
    @Body() body: UpdateCategoryRequestDto,
  ): Promise<AdminCategoryResult> {
    return this.updateCategory.execute({
      categoryId: id,
      name: body.name,
      description: body.description,
      parentId: body.parentId,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    });
  }

  /** A logical deletion: the category stays, with the date it was deleted. */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", CATEGORY_ID) id: string): Promise<void> {
    return this.deleteCategory.execute({ categoryId: id });
  }

  @Post(":id/restore")
  @HttpCode(HttpStatus.OK)
  restore(@Param("id", CATEGORY_ID) id: string): Promise<AdminCategoryResult> {
    return this.restoreCategory.execute({ categoryId: id });
  }
}
