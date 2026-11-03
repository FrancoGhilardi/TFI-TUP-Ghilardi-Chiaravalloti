import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QueryProvider } from "./QueryProvider";

const Defaults = () => {
  const { staleTime, refetchOnWindowFocus, retry } =
    useQueryClient().getDefaultOptions().queries ?? {};
  return <p>{JSON.stringify({ staleTime, refetchOnWindowFocus, retry })}</p>;
};

describe("QueryProvider", () => {
  it("serves its children a client that keeps answers for 60 s and never retries by itself", () => {
    render(
      <QueryProvider>
        <Defaults />
      </QueryProvider>,
    );

    expect(JSON.parse(screen.getByText(/staleTime/).textContent ?? "")).toEqual({
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: false,
    });
  });
});
