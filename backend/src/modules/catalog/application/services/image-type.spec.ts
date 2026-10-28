import { InvalidImageError } from "../../domain/errors/invalid-image-error.js";
import { checkedImageType, detectImageType } from "./image-type.js";

const bytes = (...values: number[]) => Uint8Array.from(values);
const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

describe("detectImageType", () => {
  it.each([
    ["JPEG", bytes(0xff, 0xd8, 0xff, 0xe0, 0x00), "image/jpeg"],
    ["PNG", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00), "image/png"],
    ["WebP", bytes(...ascii("RIFF"), 0x24, 0x00, 0x00, 0x00, ...ascii("WEBPVP8 ")), "image/webp"],
  ])("recognizes %s from its first bytes", (_label, file, type) => {
    expect(detectImageType(file)).toBe(type);
  });

  it.each([
    ["a GIF", bytes(...ascii("GIF89a"))],
    ["a RIFF that is not WebP", bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE"))],
    ["text", bytes(...ascii("hello"))],
    ["a cut JPEG", bytes(0xff, 0xd8)],
    ["nothing", bytes()],
  ])("recognizes nothing in %s", (_label, file) => {
    expect(detectImageType(file)).toBeUndefined();
  });
});

describe("checkedImageType", () => {
  const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00);

  it("gives the format of a file within the size", () => {
    expect(checkedImageType(JPEG, JPEG.length, "single")).toBe("image/jpeg");
  });

  it.each([
    ["too big", JPEG, JPEG.length - 1, "size", "La imagen 3 no puede pesar más de 10 MB."],
    [
      "of another format",
      bytes(...ascii("GIF89a")),
      100,
      "type",
      "La imagen 3 tiene que ser JPEG, PNG o WebP.",
    ],
  ] as const)("refuses a file %s, naming the image", (_label, file, max, reason, message) => {
    const error = (() => {
      try {
        return checkedImageType(file, max, 3);
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).toBeInstanceOf(InvalidImageError);
    expect(error).toMatchObject({ reason, message, position: 3 });
  });

  it("checks the size before reading the format", () => {
    expect(() => checkedImageType(bytes(...ascii("GIF89a")), 1, "single")).toThrow(
      "La imagen no puede pesar más de 10 MB.",
    );
  });
});
