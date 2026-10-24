import { Logger } from "@nestjs/common";
import { LoggerPasswordResetNotifier } from "./logger-password-reset-notifier.js";

describe("LoggerPasswordResetNotifier", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const notifier = new LoggerPasswordResetNotifier("http://localhost:3000/admin/login");

  it.each([
    [
      "temporary",
      () =>
        notifier.sendTemporaryPassword(
          "ana@example.com",
          "Ana",
          "Tmp2Pass3Key",
          new Date("2026-10-22T12:30:00.000Z"),
        ),
      "Tu clave temporal de Librería Mi Sueño",
    ],
    [
      "assigned",
      () => notifier.sendAssignedPassword("ana@example.com", "Ana", "Tmp2Pass3Key"),
      "Restablecimos tu contraseña de Librería Mi Sueño",
    ],
  ])(
    "writes the %s password mail to the log instead of sending it",
    async (_kind, send, subject) => {
      const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);

      await send();

      const [message] = log.mock.calls[0] as [string];
      expect(log).toHaveBeenCalledOnce();
      expect(message).toContain("To: ana@example.com");
      expect(message).toContain(subject);
      expect(message).toContain("Tmp2Pass3Key");
      expect(message).toContain("http://localhost:3000/admin/login");
    },
  );
});
