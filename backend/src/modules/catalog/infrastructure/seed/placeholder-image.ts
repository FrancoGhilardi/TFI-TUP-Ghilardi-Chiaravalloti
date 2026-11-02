import sharp from "sharp";

// Small on purpose: a few kilobytes per file, so seeding never takes much disk.
const WIDTH = 480;
const HEIGHT = 600;
const QUALITY = 60;
const MAX_LINE_LENGTH = 16;
const MAX_LINES = 4;

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);
}

/** Splits the title into short lines, word by word, so it fits across the picture. */
function wrap(text: string): string[] {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= MAX_LINE_LENGTH) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word);
    }
  }
  return lines.slice(0, MAX_LINES);
}

/** A flat-colored 4:5 WebP with the product title, standing in for a real photo. */
export async function placeholderImage(title: string, color: string): Promise<Uint8Array> {
  const lines = wrap(title);
  const top = HEIGHT / 2 - ((lines.length - 1) * 44) / 2;
  const text = lines
    .map(
      (line, index) =>
        `<text x="50%" y="${top + index * 44}" text-anchor="middle">${escapeXml(line)}</text>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <rect width="100%" height="100%" fill="${color}"/>
    <circle cx="${WIDTH / 2}" cy="${HEIGHT / 2}" r="190" fill="#ffffff" fill-opacity="0.18"/>
    <g font-family="sans-serif" font-size="34" font-weight="600" fill="#ffffff">${text}</g>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: QUALITY }).toBuffer();
}
