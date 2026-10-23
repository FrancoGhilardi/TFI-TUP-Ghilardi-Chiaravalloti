import type { Request, Response } from "express";
import type { AuthSessionResult } from "../../application/dto/auth-session.result.js";
import type { LogoutCommand } from "../../application/dto/logout.command.js";
import type { RefreshSessionCommand } from "../../application/dto/refresh-session.command.js";
import { InvalidSessionError } from "../../application/errors/invalid-session-error.js";
import type { LoginUseCase } from "../../application/use-cases/login.use-case.js";
import type { LogoutUseCase } from "../../application/use-cases/logout.use-case.js";
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

function setUp(
  use: {
    refresh?: (command: RefreshSessionCommand) => Promise<AuthSessionResult>;
    logout?: (command: LogoutCommand) => Promise<void>;
  } = {},
) {
  const refreshSession = { execute: vi.fn(use.refresh ?? (() => Promise.resolve(SESSION))) };
  const logoutSession = { execute: vi.fn(use.logout ?? (() => Promise.resolve())) };
  const cookie = {
    read: vi.fn(() => "old-token"),
    write: vi.fn(),
    clear: vi.fn(),
  };
  const controller = new AuthController(
    {} as LoginUseCase,
    refreshSession as unknown as RefreshSessionUseCase,
    logoutSession as unknown as LogoutUseCase,
    cookie,
  );
  const req = {} as Request;
  const res = {} as Response;
  const refresh = () => controller.refresh(req, "Firefox", res);
  const logout = () => controller.logout(req, res);
  return { refreshSession, logoutSession, cookie, req, res, refresh, logout };
}

describe("AuthController.refresh", () => {
  it("renews the session with the token of the cookie and writes the new one", async () => {
    const { refreshSession, cookie, req, res, refresh } = setUp();

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
    const { cookie, res, refresh } = setUp({ refresh: () => Promise.reject(error) });

    await expect(refresh()).rejects.toBe(error);

    expect(cookie.clear).toHaveBeenCalledExactlyOnceWith(res);
    expect(cookie.write).not.toHaveBeenCalled();
  });

  it("keeps the cookie on any other failure, which says nothing about the token", async () => {
    const error = new Error("database down");
    const { cookie, refresh } = setUp({ refresh: () => Promise.reject(error) });

    await expect(refresh()).rejects.toBe(error);

    expect(cookie.clear).not.toHaveBeenCalled();
  });
});

describe("AuthController.logout", () => {
  it("ends the session of the cookie and clears it", async () => {
    const { logoutSession, cookie, req, res, logout } = setUp();

    await expect(logout()).resolves.toBeUndefined();

    expect(cookie.read).toHaveBeenCalledWith(req);
    expect(logoutSession.execute).toHaveBeenCalledExactlyOnceWith({ refreshToken: "old-token" });
    expect(cookie.clear).toHaveBeenCalledExactlyOnceWith(res);
    expect(cookie.write).not.toHaveBeenCalled();
  });

  it("keeps the cookie and rethrows when the session could not be ended", async () => {
    const error = new Error("database down");
    const { cookie, logout } = setUp({ logout: () => Promise.reject(error) });

    await expect(logout()).rejects.toBe(error);

    expect(cookie.clear).not.toHaveBeenCalled();
  });
});
