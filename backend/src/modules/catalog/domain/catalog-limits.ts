// Lengths in Unicode code points, matching the varchar columns where there is one.
export const CATEGORY_NAME_MAX_LENGTH = 100;
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 2000;
export const PRODUCT_TITLE_MAX_LENGTH = 200;
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 5000;
// Postgres integer columns: stock and sort order.
export const STOCK_MAX = 2_147_483_647;
export const SORT_ORDER_MAX = 2_147_483_647;
// The slug column of categories; the one of products is the general slug limit.
export const CATEGORY_SLUG_MAX_LENGTH = 120;
