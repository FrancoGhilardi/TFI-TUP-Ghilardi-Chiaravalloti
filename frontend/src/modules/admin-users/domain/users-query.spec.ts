import { describe, expect, it } from "vitest";

import {
  clearedFilters,
  EMPTY_USERS_QUERY,
  isFiltered,
  parseUsersQuery,
  toApiQuery,
  type UsersQuery,
  usersHref,
} from "./users-query";

const parse = (search: string) => parseUsersQuery(new URLSearchParams(search));
const query = (overrides: Partial<UsersQuery> = {}): UsersQuery => ({
  ...EMPTY_USERS_QUERY,
  ...overrides,
});

describe("parseUsersQuery", () => {
  it("gives the default query for an empty address", () => {
    expect(parse("")).toEqual(EMPTY_USERS_QUERY);
  });

  it("reads every parameter", () => {
    expect(parse("q=marta&rol=vendedor&estado=bajas&pagina=3")).toEqual({
      q: "marta",
      role: "vendedor",
      state: "bajas",
      page: 3,
    });
  });

  it("trims the search and drops a blank one", () => {
    expect(parse("q=%20%20marta%20").q).toBe("marta");
    expect(parse("q=%20").q).toBeUndefined();
  });

  it("cuts a search that is too long instead of dropping it", () => {
    expect(parse(`q=${"a".repeat(120)}`).q).toHaveLength(100);
  });

  it("does not leave a space at the end of a search that was cut", () => {
    expect(parse(`q=${"a".repeat(99)}%20bbb`).q).toBe("a".repeat(99));
  });

  it.each(["rol=jefe", "rol=ADMIN", "rol="])("drops the invalid role in %s", (search) => {
    expect(parse(search).role).toBeUndefined();
  });

  it.each(["estado=otro", "estado=ACTIVE", "estado="])("uses the default for %s", (search) => {
    expect(parse(search).state).toBe("vigentes");
  });

  it.each(["pagina=0", "pagina=-2", "pagina=x", "pagina=501", "pagina=1.5"])(
    "goes to the first page for %s",
    (search) => {
      expect(parse(search).page).toBe(1);
    },
  );
});

describe("usersHref", () => {
  it("is the bare path for the default query", () => {
    expect(usersHref(EMPTY_USERS_QUERY)).toBe("/admin/usuarios");
  });

  it("leaves out what is the default and keeps the rest in order", () => {
    expect(
      usersHref(query({ q: "ana", role: "admin", state: "todos", page: 2 }), { page: 2 }),
    ).toBe("/admin/usuarios?q=ana&rol=admin&estado=todos&pagina=2");
  });

  it("goes back to the first page when anything but the page changes", () => {
    const current = query({ q: "ana", page: 4 });

    expect(usersHref(current, { state: "bajas" })).toBe("/admin/usuarios?q=ana&estado=bajas");
    expect(usersHref(current, { page: 5 })).toBe("/admin/usuarios?q=ana&pagina=5");
  });

  it("round-trips through the parser", () => {
    const original = query({ q: "ñandú & co", role: "vendedor", state: "inactivos", page: 2 });

    expect(parse(usersHref(original, { page: 2 }).split("?")[1])).toEqual(original);
  });
});

describe("isFiltered and clearedFilters", () => {
  it("is false for the default query", () => {
    expect(isFiltered(EMPTY_USERS_QUERY)).toBe(false);
  });

  it.each([{ q: "x" }, { role: "admin" as const }, { state: "bajas" as const }])(
    "is true for %o",
    (overrides) => {
      expect(isFiltered(query(overrides))).toBe(true);
    },
  );

  it("takes away every filter but leaves the page to the link", () => {
    const filtered = query({ q: "x", role: "admin", state: "bajas", page: 3 });

    expect(usersHref(filtered, clearedFilters())).toBe("/admin/usuarios");
    expect(isFiltered({ ...filtered, ...clearedFilters() })).toBe(false);
  });
});

describe("toApiQuery", () => {
  it("asks for the first page of current users, 20 at a time, by default", () => {
    expect(toApiQuery(EMPTY_USERS_QUERY)).toEqual({
      q: undefined,
      role: undefined,
      status: undefined,
      page: 1,
      limit: 20,
    });
  });

  it.each([
    ["activos", "ACTIVE"],
    ["inactivos", "INACTIVE"],
    ["bajas", "DELETED"],
    ["todos", "ALL"],
  ] as const)("asks for the state %s as %s", (state, status) => {
    expect(toApiQuery(query({ state })).status).toBe(status);
  });

  it.each([
    ["admin", "ADMIN"],
    ["vendedor", "SELLER"],
  ] as const)("asks for the role %s as %s", (role, api) => {
    expect(toApiQuery(query({ role })).role).toBe(api);
  });

  it("carries the search and the page", () => {
    expect(toApiQuery(query({ q: "ana", page: 4 }))).toMatchObject({ q: "ana", page: 4 });
  });
});
