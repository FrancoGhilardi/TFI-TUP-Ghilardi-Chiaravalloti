import type { Resend } from "resend";
import { ResendPasswordResetNotifier } from "./resend-password-reset-notifier.js";
import { temporaryPasswordMail } from "./temporary-password-mail.js";

const EXPIRES_AT = new Date("2026-10-22T12:30:00.000Z");
const FROM = "Librería Mi Sueño <no-reply@libreriamisueno.com.ar>";
const LOGIN_URL = "https://libreriamisueno.com.ar/admin/login";

type Send = Resend["emails"]["send"];

function setUp(result: Awaited<ReturnType<Send>>) {
  const send = vi.fn<Send>(() => Promise.resolve(result));
  const notifier = new ResendPasswordResetNotifier({ send }, FROM, LOGIN_URL);
  const notify = () =>
    notifier.sendTemporaryPassword("ana@example.com", "Ana", "Tmp2Pass3Key", EXPIRES_AT);
  return { send, notify };
}

describe("ResendPasswordResetNotifier", () => {
  it("sends the mail from the configured address to the user", async () => {
    const { send, notify } = setUp({ data: { id: "mail-1" }, error: null, headers: null });

    await notify();

    expect(send).toHaveBeenCalledExactlyOnceWith(
      {
        from: FROM,
        to: "ana@example.com",
        ...temporaryPasswordMail({
          name: "Ana",
          temporaryPassword: "Tmp2Pass3Key",
          expiresAt: EXPIRES_AT,
          loginUrl: LOGIN_URL,
        }),
      },
      { signal: expect.any(AbortSignal) as AbortSignal },
    );
  });

  it("gives up on a provider that does not answer in time", async () => {
    let signal: AbortSignal | undefined;
    const send = vi.fn<Send>(
      (_payload, options) =>
        new Promise((_resolve, reject) => {
          signal = options?.signal;
          signal?.addEventListener("abort", () => reject(new Error("aborted by the timeout")));
        }),
    );
    const notifier = new ResendPasswordResetNotifier({ send }, FROM, LOGIN_URL, 20);

    await expect(
      notifier.sendTemporaryPassword("ana@example.com", "Ana", "Tmp2Pass3Key", EXPIRES_AT),
    ).rejects.toThrow("aborted by the timeout");

    expect(signal?.aborted).toBe(true);
  });

  it("rejects when Resend does not accept the mail", async () => {
    const { notify } = setUp({
      data: null,
      error: { name: "daily_quota_exceeded", message: "Daily quota exceeded", statusCode: 429 },
      headers: null,
    });

    await expect(notify()).rejects.toThrow(
      "Resend did not accept the mail: daily_quota_exceeded: Daily quota exceeded",
    );
  });
});
