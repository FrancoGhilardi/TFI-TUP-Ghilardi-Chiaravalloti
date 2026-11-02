import { z } from "zod";

const API_PREFIX = "/api/v1";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url({
    protocol: /^https?$/,
    error: "Must be an http(s) URL, such as http://localhost:3001",
  }),
});

export interface PublicConfig {
  /** Base for every API path, such as `https://api.example.com/api/v1`, without a trailing slash. */
  apiBaseUrl: string;
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
  return { apiBaseUrl: `${origin}${API_PREFIX}` };
}

// Each variable is read by its literal name: Next only inlines those into the browser bundle.
export const publicConfig = parsePublicConfig({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
