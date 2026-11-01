import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiErrors,
  VALIDATION_FAILED,
} from "../../../../shared/presentation/http/openapi-decorators.js";
import { AdminCategoryPageResponseDto, AdminCategoryResponseDto } from "./category.response.dto.js";
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
@ApiTags("Categories")
@ApiErrors({ 403: ["PASSWORD_CHANGE_REQUIRED"] })
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
  @ApiOperation({ summary: "List the categories, as a tree by default" })
  @ApiOkResponse({ type: AdminCategoryPageResponseDto })
  @ApiErrors({ 400: [VALIDATION_FAILED] })
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
  @ApiOperation({ summary: "Get a category, deleted or not" })
  @ApiOkResponse({ type: AdminCategoryResponseDto })
  @ApiErrors({ 404: ["CATEGORY_NOT_FOUND"] })
  findOne(@Param("id", CATEGORY_ID) id: string): Promise<AdminCategoryResult> {
    return this.getAdminCategory.execute(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a category" })
  @ApiCreatedResponse({ type: AdminCategoryResponseDto })
  @ApiErrors({
    400: [
      VALIDATION_FAILED,
      "INVALID_CATEGORY_NAME",
      "INVALID_DESCRIPTION",
      "INVALID_SORT_ORDER",
      "INVALID_SLUG",
    ],
    409: ["CATEGORY_NAME_IN_USE"],
    422: ["PARENT_CATEGORY_UNAVAILABLE"],
  })
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
  @ApiOperation({ summary: "Edit the fields sent; `parentId: null` moves it to the root" })
  @ApiOkResponse({ type: AdminCategoryResponseDto })
  @ApiErrors({
    400: [VALIDATION_FAILED, "INVALID_CATEGORY_NAME", "INVALID_DESCRIPTION", "INVALID_SORT_ORDER"],
    404: ["CATEGORY_NOT_FOUND"],
    409: ["CATEGORY_NAME_IN_USE"],
    422: ["CATEGORY_DELETED", "CATEGORY_CYCLE", "PARENT_CATEGORY_UNAVAILABLE"],
  })
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
  @ApiOperation({ summary: "Delete the category logically; repeating it changes nothing" })
  @ApiNoContentResponse()
  @ApiErrors({
    404: ["CATEGORY_NOT_FOUND"],
    422: ["CATEGORY_HAS_ACTIVE_CHILDREN", "CATEGORY_IN_USE"],
  })
  remove(@Param("id", CATEGORY_ID) id: string): Promise<void> {
    return this.deleteCategory.execute({ categoryId: id });
  }

  @Post(":id/restore")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Restore a deleted category, with the state it had" })
  @ApiOkResponse({ type: AdminCategoryResponseDto })
  @ApiErrors({
    404: ["CATEGORY_NOT_FOUND"],
    409: ["CATEGORY_NAME_IN_USE"],
    422: ["CATEGORY_NOT_DELETED", "PARENT_CATEGORY_UNAVAILABLE"],
  })
  restore(@Param("id", CATEGORY_ID) id: string): Promise<AdminCategoryResult> {
    return this.restoreCategory.execute({ categoryId: id });
  }
}
