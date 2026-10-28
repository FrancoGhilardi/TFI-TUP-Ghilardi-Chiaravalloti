import sharp from "sharp";
import {
  ImageProcessor,
  type PublicImageVersion,
} from "../../application/ports/image-processor.js";
import type { ImageSettings } from "../../application/settings/image-settings.js";

// EXIF orientations 5 to 8 turn the picture a quarter, swapping its width and height.
const QUARTER_TURNS = new Set([5, 6, 7, 8]);

/**
 * Sharp. The public version is turned as the photo was taken, cropped around its center to
 * the store's proportion and shrunk to the widest it can be without ever being enlarged, as
 * a WebP without metadata.
 */
export class SharpImageProcessor extends ImageProcessor {
  constructor(private readonly settings: ImageSettings) {
    super();
  }

  async toPublicVersion(original: Uint8Array): Promise<PublicImageVersion> {
    const { publicMaxWidth, publicAspectRatio, publicQuality, maxInputPixels } = this.settings;
    const image = sharp(original, { limitInputPixels: maxInputPixels, failOn: "error" });
    const metadata = await image.metadata();
    const turned = QUARTER_TURNS.has(metadata.orientation ?? 1);
    const sourceWidth = turned ? metadata.height : metadata.width;
    const sourceHeight = turned ? metadata.width : metadata.height;

    // As wide as allowed and as the original is, and short enough for the proportion to fit.
    const width = Math.min(
      publicMaxWidth,
      sourceWidth,
      Math.floor((sourceHeight * publicAspectRatio.width) / publicAspectRatio.height),
    );
    const height = Math.round((width * publicAspectRatio.height) / publicAspectRatio.width);
    if (width < 1 || height < 1) {
      throw new Error(`An image of ${sourceWidth}×${sourceHeight} is too small to show`);
    }

    const { data, info } = await image
      .rotate()
      .resize({ width, height, fit: "cover", position: "centre" })
      .webp({ quality: publicQuality })
      .toBuffer({ resolveWithObject: true });
    // A Buffer already is a Uint8Array: no copy.
    return { bytes: data, width: info.width, height: info.height };
  }
}
