/** Only the fields present change; the rest stay as they are. The slug never changes. */
export interface UpdateCategoryCommand {
  categoryId: string;
  name?: string;
  /** Blank removes it. */
  description?: string;
  /** `null` moves the category to the root. */
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}
