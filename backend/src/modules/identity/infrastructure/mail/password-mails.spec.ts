import { assignedPasswordMail, temporaryPasswordMail } from "./password-mails.js";

const INPUT = {
  name: "Ana",
  temporaryPassword: "Tmp2Pass3Key",
  loginUrl: "https://libreriamisueno.com.ar/admin/login",
};
// 12:30 UTC is 09:30 in Argentina.
const EXPIRES_AT = new Date("2026-10-22T12:30:00.000Z");

const mails = {
  forgot: temporaryPasswordMail({ ...INPUT, expiresAt: EXPIRES_AT }),
  reset: assignedPasswordMail(INPUT),
};

describe("password mails", () => {
  it("name the shop in the subject", () => {
    expect(mails.forgot.subject).toBe("Tu clave temporal de Librería Mi Sueño");
    expect(mails.reset.subject).toBe("Restablecimos tu contraseña de Librería Mi Sueño");
  });

  describe.each(Object.entries(mails))("the %s mail", (_kind, mail) => {
    it.each(["text", "html"] as const)(
      "greets, gives the password and the link (%s)",
      (version) => {
        const body = mail[version];

        expect(body).toContain("Hola, Ana:");
        expect(body).toContain("Tmp2Pass3Key");
        expect(body).toContain("https://libreriamisueno.com.ar/admin/login");
        expect(body).toContain("vas a tener que elegir una contraseña nueva");
      },
    );
  });

  it.each(["text", "html"] as const)(
    "says the forgot password works alongside the current one, and until when (%s)",
    (version) => {
      const body = mails.forgot[version];

      expect(body).toContain("Vence el 22/10/2026 a las 09:30 (hora de Argentina)");
      expect(body).toContain("tu contraseña actual sigue funcionando");
    },
  );

  it.each(["text", "html"] as const)(
    "says an admin replaced the password, with no expiry (%s)",
    (version) => {
      const body = mails.reset[version];

      expect(body).toContain("Un administrador restableció tu contraseña");
      expect(body).toContain("Tu contraseña anterior ya no funciona");
      expect(body).toContain("avisale a un administrador");
      expect(body).not.toContain("Vence");
    },
  );

  it.each([
    ["forgot", (name: string) => temporaryPasswordMail({ ...INPUT, name, expiresAt: EXPIRES_AT })],
    ["reset", (name: string) => assignedPasswordMail({ ...INPUT, name })],
  ])("escapes the name in the HTML of the %s mail only", (_kind, build) => {
    const { html, text } = build(`<b>Ana</b> & "co"`);

    expect(html).toContain("Hola, &lt;b&gt;Ana&lt;/b&gt; &amp; &quot;co&quot;:");
    expect(html).not.toContain("<b>Ana</b>");
    expect(text).toContain(`Hola, <b>Ana</b> & "co":`);
  });
});
