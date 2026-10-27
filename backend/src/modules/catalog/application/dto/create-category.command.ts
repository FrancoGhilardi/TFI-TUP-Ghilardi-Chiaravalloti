/** A new category; the system generates its slug from the name. */
export interface CreateCategoryCommand {
  name: string;
  description?: string;
  /** Absent for a root category. */
  parentId?: string;
  /** 0 when absent. */
  sortOrder?: number;
  /** Active when absent. */
  isActive?: boolean;
}
