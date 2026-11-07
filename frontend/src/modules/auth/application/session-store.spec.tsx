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

describe("session store expiry", () => {
  it("drops the token and the user when the session ends", () => {
    useSessionStore.getState().start(login);

    useSessionStore.getState().expire();

    expect(useSessionStore.getState()).toMatchObject({
      status: "anonymous",
      accessToken: null,
      user: null,
    });
  });
});

describe("session store restore", () => {
  it("tells when the session could not be looked up and goes back to trying", () => {
    useSessionStore.getState().markUnavailable();
    expect(useSessionStore.getState().status).toBe("unavailable");

    useSessionStore.getState().retry();
    expect(useSessionStore.getState().status).toBe("loading");
  });
});

describe("session store sign out", () => {
  it("clears the token and the user, and a new sign in starts a session again", () => {
    useSessionStore.getState().start(login);

    useSessionStore.getState().signOut();
    expect(useSessionStore.getState()).toMatchObject({
      status: "signedOut",
      accessToken: null,
      user: null,
    });

    useSessionStore.getState().start(login);
    expect(useSessionStore.getState().status).toBe("authenticated");
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
