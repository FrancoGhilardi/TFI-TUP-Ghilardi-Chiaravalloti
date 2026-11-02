import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { IS_PUBLIC_KEY } from "../../../identity/presentation/decorators/public.decorator.js";
import type { GlobalSearchUseCase } from "../../application/use-cases/global-search.use-case.js";
import { GlobalSearchRequestDto } from "./global-search.request.dto.js";
import { SearchController } from "./search.controller.js";

const TEXT_MESSAGE = "Escribí entre 2 y 100 caracteres para buscar.";
const LIMIT_MESSAGE = "La cantidad de resultados tiene que ser un número entero entre 1 y 10.";

async function check(query: Record<string, unknown>) {
  const dto = plainToInstance(GlobalSearchRequestDto, query);
  const errors = await validate(dto);
  return {
    dto,
    messages: Object.fromEntries(
      errors.map((error) => [error.property, [...new Set(Object.values(error.constraints ?? {}))]]),
    ),
  };
}

describe("SearchController", () => {
  it("is open to anyone and lets the results be cached for 60 seconds", () => {
    const handler = Object.getOwnPropertyDescriptor(SearchController.prototype, "search")
      ?.value as object;

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, SearchController)).toBe(true);
    expect(Reflect.getMetadata("__headers__", handler)).toEqual([
      { name: "Cache-Control", value: "public, max-age=60" },
    ]);
  });

  it("passes the text and the limit to the use case", async () => {
    const globalSearch = {
      execute: vi.fn(() => Promise.resolve({ products: [], categories: [] })),
    };
    const controller = new SearchController(globalSearch as unknown as GlobalSearchUseCase);

    await controller.search({ q: "cuaderno", limit: 3 });

    expect(globalSearch.execute).toHaveBeenCalledExactlyOnceWith({ q: "cuaderno", limit: 3 });
  });
});

describe("GlobalSearchRequestDto", () => {
  it("trims the text and brings 5 of each by default", async () => {
    const { dto, messages } = await check({ q: "  cuaderno " });

    expect(messages).toEqual({});
    expect(dto).toMatchObject({ q: "cuaderno", limit: 5 });
  });

  it.each(["1", "10"])("takes a limit of %s", async (limit) => {
    await expect(check({ q: "ab", limit })).resolves.toMatchObject({ messages: {} });
  });

  it("takes 100 characters", async () => {
    await expect(check({ q: "a".repeat(100) })).resolves.toMatchObject({ messages: {} });
  });

  it.each([{}, { q: "a" }, { q: "  a  " }, { q: "a".repeat(101) }, { q: ["ab", "cd"] }])(
    "refuses the text of %o",
    async (query) => {
      await expect(check(query)).resolves.toMatchObject({ messages: { q: [TEXT_MESSAGE] } });
    },
  );

  it.each(["0", "11", "2.5", "cinco"])("refuses a limit of %s", async (limit) => {
    await expect(check({ q: "ab", limit })).resolves.toMatchObject({
      messages: { limit: [LIMIT_MESSAGE] },
    });
  });
});
