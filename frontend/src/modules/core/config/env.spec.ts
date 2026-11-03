import { describe, expect, it } from "vitest";

import { parsePublicConfig } from "./env";

const VALID = {
  NEXT_PUBLIC_API_URL: "http://localhost:3001",
  NEXT_PUBLIC_WHATSAPP_NUMBER: "5492622380159",
  NEXT_PUBLIC_WHATSAPP_DISPLAY: "2622 38-0159",
  NEXT_PUBLIC_STORAGE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

describe("parsePublicConfig", () => {
  it("builds the public config from the variables", () => {
    expect(parsePublicConfig(VALID)).toEqual({
      apiBaseUrl: "http://localhost:3001/api/v1",
      whatsappNumber: "5492622380159",
      whatsappDisplay: "2622 38-0159",
      storageOrigin: "http://127.0.0.1:54321",
      siteOrigin: "http://localhost:3000",
    });
  });

  it.each([
    "https://api.example.com/",
    "https://api.example.com/api/v1",
    "https://api.example.com/x/",
  ])("keeps only the origin of %s", (url) => {
    expect(parsePublicConfig({ ...VALID, NEXT_PUBLIC_API_URL: url }).apiBaseUrl).toBe(
      "https://api.example.com/api/v1",
    );
  });

  it.each([undefined, "", "localhost:3001", "not a url", "ftp://api.example.com"])(
    "rejects the API URL %s naming the variable",
    (value) => {
      expect(() => parsePublicConfig({ ...VALID, NEXT_PUBLIC_API_URL: value })).toThrow(
        /NEXT_PUBLIC_API_URL/,
      );
    },
  );

  it.each([undefined, "", "+5492622380159", "549 2622 380159", "123456789", "1234567890123456"])(
    "rejects the WhatsApp number %s naming the variable",
    (value) => {
      expect(() => parsePublicConfig({ ...VALID, NEXT_PUBLIC_WHATSAPP_NUMBER: value })).toThrow(
        /NEXT_PUBLIC_WHATSAPP_NUMBER/,
      );
    },
  );

  it("keeps only the origin of the storage URL", () => {
    const config = parsePublicConfig({
      ...VALID,
      NEXT_PUBLIC_STORAGE_URL: "https://abc.supabase.co/storage/v1/",
    });

    expect(config.storageOrigin).toBe("https://abc.supabase.co");
  });

  it.each([undefined, "", "abc.supabase.co", "ftp://abc.supabase.co"])(
    "rejects the storage URL %s naming the variable",
    (value) => {
      expect(() => parsePublicConfig({ ...VALID, NEXT_PUBLIC_STORAGE_URL: value })).toThrow(
        /NEXT_PUBLIC_STORAGE_URL/,
      );
    },
  );

  it.each([undefined, "", "   "])(
    "rejects the WhatsApp display %s naming the variable",
    (value) => {
      expect(() => parsePublicConfig({ ...VALID, NEXT_PUBLIC_WHATSAPP_DISPLAY: value })).toThrow(
        /NEXT_PUBLIC_WHATSAPP_DISPLAY/,
      );
    },
  );

  it("keeps only the origin of the site URL", () => {
    const config = parsePublicConfig({
      ...VALID,
      NEXT_PUBLIC_SITE_URL: "https://libreriamisueno.com.ar/inicio/",
    });

    expect(config.siteOrigin).toBe("https://libreriamisueno.com.ar");
  });

  it.each([undefined, "", "libreriamisueno.com.ar", "ftp://libreriamisueno.com.ar"])(
    "rejects the site URL %s naming the variable",
    (value) => {
      expect(() => parsePublicConfig({ ...VALID, NEXT_PUBLIC_SITE_URL: value })).toThrow(
        /NEXT_PUBLIC_SITE_URL/,
      );
    },
  );
});
