import { z } from "zod";

const API_PREFIX = "/api/v1";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url({
    protocol: /^https?$/,
    error: "Must be an http(s) URL, such as http://localhost:3001",
  }),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string({ error: "Required" })
    .regex(/^\d{10,15}$/, "Must be 10 to 15 digits in international format, such as 5492622380159"),
  NEXT_PUBLIC_WHATSAPP_DISPLAY: z
    .string({ error: "Required" })
    .trim()
    .min(1, "Required: the WhatsApp number as shown to customers, such as 2622 38-0159"),
});

export interface PublicConfig {
  /** Base for every API path, such as `https://api.example.com/api/v1`, without a trailing slash. */
  apiBaseUrl: string;
  /** Store WhatsApp number in international format, digits only, as `wa.me` expects it. */
  whatsappNumber: string;
  /** The same number written as customers know it, such as `2622 38-0159`. */
  whatsappDisplay: string;
}

/** Validates the raw variables; throws an error naming each invalid one. */
export function parsePublicConfig(raw: Record<string, string | undefined>): PublicConfig {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map(({ path, message }) => `  ${path.join(".")}: ${message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${problems}`);
  }
  // Only the origin counts, so a trailing slash or a path in the variable cannot change the prefix.
  const { origin } = new URL(result.data.NEXT_PUBLIC_API_URL);
  return {
    apiBaseUrl: `${origin}${API_PREFIX}`,
    whatsappNumber: result.data.NEXT_PUBLIC_WHATSAPP_NUMBER,
    whatsappDisplay: result.data.NEXT_PUBLIC_WHATSAPP_DISPLAY,
  };
}

// Each variable is read by its literal name: Next only inlines those into the browser bundle.
export const publicConfig = parsePublicConfig({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  NEXT_PUBLIC_WHATSAPP_DISPLAY: process.env.NEXT_PUBLIC_WHATSAPP_DISPLAY,
});
