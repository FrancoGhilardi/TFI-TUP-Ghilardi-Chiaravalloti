import { Logger } from "@nestjs/common";
import { LoggerSecurityEventLog } from "./logger-security-event-log.js";

describe("LoggerSecurityEventLog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns about a reused refresh token with the id of the user", () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);

    new LoggerSecurityEventLog().refreshTokenReused("user-1");

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith("Refresh token reused; all sessions revoked for user user-1");
  });

  it("only takes the id of the user, never a token", () => {
    expectTypeOf<LoggerSecurityEventLog["refreshTokenReused"]>().parameters.toEqualTypeOf<
      [userId: string]
    >();
  });
});
