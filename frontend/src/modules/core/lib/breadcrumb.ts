/** One step of a breadcrumb trail. */
export interface BreadcrumbItem {
  label: string;
  /** Absent for the page the visitor is on. */
  href?: string;
}
