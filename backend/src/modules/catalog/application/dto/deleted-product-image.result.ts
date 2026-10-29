import type { LeftoverFile } from "../services/product-image-uploader.js";

/**
 * What a deletion left behind: the image, by its stored id, and the files the storage would
 * not remove, with why, to be removed by hand. `leftovers` is empty when it removed them all.
 */
export interface DeletedProductImageResult {
  imageId: string;
  leftovers: LeftoverFile[];
}
