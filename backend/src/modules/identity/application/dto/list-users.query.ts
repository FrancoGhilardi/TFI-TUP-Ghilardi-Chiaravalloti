import type {
  PageRequest,
  RecordStatusFilter,
  SortDirection,
} from "../../../../shared/application/pagination.js";
import type { UserRole } from "../../domain/user-role.js";

export interface ListUsersQuery extends PageRequest {
  /** Part of the name or the email; blank searches nothing. */
  q?: string;
  role?: UserRole;
  /** Without one, the users not deleted, active or not. */
  status?: RecordStatusFilter;
  /** By name, with the email to break ties. */
  sortDir: SortDirection;
}
