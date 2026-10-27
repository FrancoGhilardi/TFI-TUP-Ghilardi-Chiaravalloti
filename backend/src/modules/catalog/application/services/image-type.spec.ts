import { detectImageType } from "./image-type.js";

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
