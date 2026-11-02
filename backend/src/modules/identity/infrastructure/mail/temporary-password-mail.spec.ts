import { temporaryPasswordMail } from "./temporary-password-mail.js";

const INPUT = {
  name: "Ana",
  temporaryPassword: "Tmp2Pass3Key",
  // 12:30 UTC is 09:30 in Argentina.
  expiresAt: new Date("2026-10-22T12:30:00.000Z"),
  loginUrl: "https://libreriamisueno.com.ar/admin/login",
};

describe("temporaryPasswordMail", () => {
  it("has a subject that names the shop", () => {
    expect(temporaryPasswordMail(INPUT).subject).toBe("Tu clave temporal de Librería Mi Sueño");
  });

  it.each(["text", "html"] as const)(
    "gives the password, its expiry in Argentina and the link in the %s version",
    (version) => {
      const body = temporaryPasswordMail(INPUT)[version];

      expect(body).toContain("Ana");
      expect(body).toContain("Tmp2Pass3Key");
      expect(body).toContain("Vence el 22/10/2026 a las 09:30 (hora de Argentina)");
      expect(body).toContain("https://libreriamisueno.com.ar/admin/login");
      expect(body).toContain("tu contraseña actual sigue funcionando");
    },
  );

  it("escapes the name in the HTML version", () => {
    const { html, text } = temporaryPasswordMail({ ...INPUT, name: `<b>Ana</b> & "co"` });

    expect(html).toContain("Hola, &lt;b&gt;Ana&lt;/b&gt; &amp; &quot;co&quot;:");
    expect(html).not.toContain("<b>Ana</b>");
    expect(text).toContain(`Hola, <b>Ana</b> & "co":`);
  });
});
