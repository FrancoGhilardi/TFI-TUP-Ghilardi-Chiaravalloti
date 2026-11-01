/** What every page of a listing carries besides its items; each listing adds its `items`. */
export abstract class PageResponseDto {
  page!: number;
  limit!: number;
  totalItems!: number;
  totalPages!: number;
}
