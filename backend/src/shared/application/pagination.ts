export enum SortDirection {
  ASC = "ASC",
  DESC = "DESC",
}

/** Which records a panel listing shows; without one, only the ones not deleted. */
export enum RecordStatusFilter {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DELETED = "DELETED",
  ALL = "ALL",
}

export interface PageRequest {
  /** Starts at 1. */
  page: number;
  limit: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/** The page of a listing, with its totals. */
export function pageOf<T>(items: T[], totalItems: number, request: PageRequest): Page<T> {
  return {
    items,
    page: request.page,
    limit: request.limit,
    totalItems,
    totalPages: Math.ceil(totalItems / request.limit),
  };
}

/** How many rows to skip to reach the requested page. */
export function offsetOf(request: PageRequest): number {
  return (request.page - 1) * request.limit;
}
