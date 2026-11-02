import type { Request, Response } from "express";
import type { AuthSessionResult } from "../../application/dto/auth-session.result.js";
import type { RefreshSessionCommand } from "../../application/dto/refresh-session.command.js";
import { InvalidSessionError } from "../../application/errors/invalid-session-error.js";
import type { LoginUseCase } from "../../application/use-cases/login.use-case.js";
import type { RefreshSessionUseCase } from "../../application/use-cases/refresh-session.use-case.js";
import { UserRole } from "../../domain/user-role.js";
import { AuthController } from "./auth.controller.js";

const SESSION: AuthSessionResult = {
  accessToken: "access-token",
  accessTokenExpiresIn: 900,
  refreshToken: "new-token",
  refreshTokenExpiresAt: new Date("2026-10-29T12:00:00.000Z"),
  user: {
    id: "user-1",
    email: "ana@example.com",
    name: "Ana",
    role: UserRole.SELLER,
    mustChangePassword: false,
  },
};

function setUp(execute: (command: RefreshSessionCommand) => Promise<AuthSessionResult>) {
  const refreshSession = { execute: vi.fn(execute) };
  const cookie = {
    read: vi.fn(() => "old-token"),
    write: vi.fn(),
    clear: vi.fn(),
  };
  const controller = new AuthController(
    {} as LoginUseCase,
    refreshSession as unknown as RefreshSessionUseCase,
    cookie,
  );
  const req = {} as Request;
  const res = {} as Response;
  const refresh = () => controller.refresh(req, "Firefox", res);
  return { refreshSession, cookie, req, res, refresh };
}

describe("AuthController.refresh", () => {
  it("renews the session with the token of the cookie and writes the new one", async () => {
    const { refreshSession, cookie, req, res, refresh } = setUp(() => Promise.resolve(SESSION));

    const body = await refresh();

    expect(cookie.read).toHaveBeenCalledWith(req);
    expect(refreshSession.execute).toHaveBeenCalledWith({
      refreshToken: "old-token",
      userAgent: "Firefox",
    });
    expect(cookie.write).toHaveBeenCalledExactlyOnceWith(
      res,
      "new-token",
      SESSION.refreshTokenExpiresAt,
    );
    expect(cookie.clear).not.toHaveBeenCalled();
    expect(body).toEqual({ accessToken: "access-token", expiresIn: 900, user: SESSION.user });
  });

  it("clears the cookie and rethrows when the session cannot be renewed", async () => {
    const error = new InvalidSessionError();
    const { cookie, res, refresh } = setUp(() => Promise.reject(error));

    await expect(refresh()).rejects.toBe(error);

    expect(cookie.clear).toHaveBeenCalledExactlyOnceWith(res);
    expect(cookie.write).not.toHaveBeenCalled();
  });

  it("keeps the cookie on any other failure, which says nothing about the token", async () => {
    const error = new Error("database down");
    const { cookie, refresh } = setUp(() => Promise.reject(error));

    await expect(refresh()).rejects.toBe(error);

    expect(cookie.clear).not.toHaveBeenCalled();
  });
});
