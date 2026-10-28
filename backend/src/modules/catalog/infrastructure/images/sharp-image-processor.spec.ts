import sharp from "sharp";
import { ImageSettings } from "../../application/settings/image-settings.js";
import { SharpImageProcessor } from "./sharp-image-processor.js";

const processor = new SharpImageProcessor(new ImageSettings());

/** A plain picture of that size, as a JPEG or a PNG with transparency. */
async function picture(width: number, height: number, format: "jpeg" | "png" = "jpeg") {
  const base = sharp({
    create: {
      width,
      height,
      channels: format === "png" ? 4 : 3,
      background:
        format === "png" ? { r: 200, g: 30, b: 30, alpha: 0.5 } : { r: 30, g: 90, b: 200 },
    },
  });
  return new Uint8Array(await (format === "png" ? base.png() : base.jpeg()).toBuffer());
}

async function described(bytes: Uint8Array) {
  const { format, width, height, exif } = await sharp(bytes).metadata();
  return { format, width, height, exif };
}

describe("SharpImageProcessor", () => {
  it.each([
    ["a wide photo, by its height", 4000, 2000, 1200, 1500],
    ["a tall photo, by its width", 2000, 4000, 1200, 1500],
    ["a photo already 4:5", 2400, 3000, 1200, 1500],
    ["a small photo, never enlarged", 600, 600, 480, 600],
    ["a narrow photo", 500, 2000, 500, 625],
  ])("makes a 4:5 WebP of %s", async (_label, width, height, outWidth, outHeight) => {
    const version = await processor.toPublicVersion(await picture(width, height));

    expect(version).toMatchObject({ width: outWidth, height: outHeight });
    await expect(described(version.bytes)).resolves.toMatchObject({
      format: "webp",
      width: outWidth,
      height: outHeight,
    });
  });

  it("takes a PNG with transparency", async () => {
    const version = await processor.toPublicVersion(await picture(1000, 1000, "png"));

    await expect(described(version.bytes)).resolves.toMatchObject({ format: "webp", width: 800 });
  });

  it("turns the photo as it was taken and leaves no metadata behind", async () => {
    // Stored 1000×3000 but taken turned a quarter: it shows 3000×1000, so its height bounds it.
    const turned = new Uint8Array(
      await sharp(await picture(1000, 3000))
        .withMetadata({ orientation: 6 })
        .jpeg()
        .toBuffer(),
    );

    const version = await processor.toPublicVersion(turned);

    expect(version).toMatchObject({ width: 800, height: 1000 });
    await expect(described(version.bytes)).resolves.toMatchObject({ exif: undefined });
  });

  it.each([
    ["a file that only starts like a JPEG", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])],
    ["an empty file", new Uint8Array()],
  ])("rejects %s", async (_label, bytes) => {
    await expect(processor.toPublicVersion(bytes)).rejects.toThrow();
  });

  it("rejects an original over 40 megapixels before decoding it", async () => {
    const huge = new Uint8Array(
      await sharp({
        create: { width: 8000, height: 5001, channels: 3, background: { r: 0, g: 0, b: 0 } },
      })
        .png({ compressionLevel: 9 })
        .toBuffer(),
    );

    await expect(processor.toPublicVersion(huge)).rejects.toThrow(/pixel limit/i);
  });
});
