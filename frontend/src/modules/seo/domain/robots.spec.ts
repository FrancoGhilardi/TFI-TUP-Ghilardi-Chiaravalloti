import { describe, expect, it } from "vitest";

import { robotsRules } from "./robots";

describe("robotsRules", () => {
  it("lets every crawler in except from the panel, and points to the sitemap", () => {
    expect(robotsRules("https://libreriamisueno.com.ar")).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/admin/"] },
      sitemap: "https://libreriamisueno.com.ar/sitemap.xml",
    });
  });
});
