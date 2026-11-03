import { beforeEach, describe, expect, it } from "vitest";

import { useSessionStore } from "./session-store";

const login = {
  accessToken: "token-123",
  expiresIn: 900,
  user: {
    id: "u1",
    email: "marta@libreriamisueno.com.ar",
    name: "Marta",
    role: "ADMIN" as const,
    mustChangePassword: false,
  },
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useSessionStore.setState({ status: "loading", accessToken: null, user: null });
});

describe("session store", () => {
  it("starts without a session", () => {
    expect(useSessionStore.getState()).toMatchObject({
      status: "loading",
      accessToken: null,
      user: null,
    });
  });

  it("keeps the token and the user once signed in, and nowhere in the browser's storage", () => {
    useSessionStore.getState().start(login);

    expect(useSessionStore.getState()).toMatchObject({
      status: "authenticated",
      accessToken: "token-123",
      user: login.user,
    });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
