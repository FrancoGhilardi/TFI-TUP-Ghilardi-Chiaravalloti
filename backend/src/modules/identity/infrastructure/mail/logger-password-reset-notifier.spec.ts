import { Logger } from "@nestjs/common";
import { LoggerPasswordResetNotifier } from "./logger-password-reset-notifier.js";

describe("LoggerPasswordResetNotifier", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the mail to the log instead of sending it", async () => {
    const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const notifier = new LoggerPasswordResetNotifier("http://localhost:3000/admin/login");

    await notifier.sendTemporaryPassword(
      "ana@example.com",
      "Ana",
      "Tmp2Pass3Key",
      new Date("2026-10-22T12:30:00.000Z"),
    );

    const [message] = log.mock.calls[0] as [string];
    expect(log).toHaveBeenCalledOnce();
    expect(message).toContain("To: ana@example.com");
    expect(message).toContain("Tmp2Pass3Key");
    expect(message).toContain("http://localhost:3000/admin/login");
  });
});
