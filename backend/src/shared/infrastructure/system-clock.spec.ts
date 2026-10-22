import { SystemClock } from "./system-clock.js";

describe("SystemClock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current time", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T12:00:00.000Z"));

    expect(new SystemClock().now()).toEqual(new Date("2026-10-22T12:00:00.000Z"));
  });

  it("returns a new date on every call", () => {
    const clock = new SystemClock();

    expect(clock.now()).not.toBe(clock.now());
  });
});
