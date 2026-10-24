import type { Resend } from "resend";
import { MailDeliveryError } from "../../application/errors/mail-delivery-error.js";
import { assignedPasswordMail, temporaryPasswordMail } from "./password-mails.js";
import { ResendPasswordResetNotifier } from "./resend-password-reset-notifier.js";

const EXPIRES_AT = new Date("2026-10-22T12:30:00.000Z");
const FROM = "Librería Mi Sueño <no-reply@libreriamisueno.com.ar>";
const LOGIN_URL = "https://libreriamisueno.com.ar/admin/login";

type Send = Resend["emails"]["send"];

const ACCEPTED: Awaited<ReturnType<Send>> = { data: { id: "mail-1" }, error: null, headers: null };

function setUp(send: Send) {
  const spy = vi.fn<Send>(send);
  const notifier = new ResendPasswordResetNotifier({ send: spy }, FROM, LOGIN_URL, 20);
  const sends = {
    temporary: () =>
      notifier.sendTemporaryPassword("ana@example.com", "Ana", "Tmp2Pass3Key", EXPIRES_AT),
    assigned: () => notifier.sendAssignedPassword("ana@example.com", "Ana", "Tmp2Pass3Key"),
  };
  return { send: spy, sends };
}

describe("ResendPasswordResetNotifier", () => {
  it.each([
    [
      "temporary",
      temporaryPasswordMail({
        name: "Ana",
        temporaryPassword: "Tmp2Pass3Key",
        expiresAt: EXPIRES_AT,
        loginUrl: LOGIN_URL,
      }),
    ],
    [
      "assigned",
      assignedPasswordMail({ name: "Ana", temporaryPassword: "Tmp2Pass3Key", loginUrl: LOGIN_URL }),
    ],
  ] as const)("sends the %s password mail from the configured address", async (kind, mail) => {
    const { send, sends } = setUp(() => Promise.resolve(ACCEPTED));

    await sends[kind]();

    expect(send).toHaveBeenCalledExactlyOnceWith(
      { from: FROM, to: "ana@example.com", ...mail },
      { signal: expect.any(AbortSignal) as AbortSignal },
    );
  });

  describe.each(["temporary", "assigned"] as const)(
    "fails with MailDeliveryError for the %s mail",
    (kind) => {
      it("when Resend does not accept it, keeping the reason", async () => {
        const { sends } = setUp(() =>
          Promise.resolve({
            data: null,
            error: {
              name: "daily_quota_exceeded",
              message: "Daily quota exceeded",
              statusCode: 429,
            },
            headers: null,
          }),
        );

        const error = await sends[kind]().catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(MailDeliveryError);
        expect((error as MailDeliveryError).cause).toEqual(
          new Error("Resend did not accept the mail: daily_quota_exceeded: Daily quota exceeded"),
        );
      });

      it("when the client throws", async () => {
        const failure = new TypeError("fetch failed");
        const { sends } = setUp(() => Promise.reject(failure));

        await expect(sends[kind]()).rejects.toMatchObject({
          code: "MAIL_DELIVERY_FAILED",
          cause: failure,
        });
      });

      it("when the provider does not answer in time", async () => {
        // Like the client, which rethrows the reason of the aborted signal.
        const { sends } = setUp(
          (_payload, options) =>
            new Promise((_resolve, reject) => {
              const signal = options?.signal;
              signal?.addEventListener("abort", () => {
                reject(signal.reason as Error);
              });
            }),
        );

        const error = await sends[kind]().catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(MailDeliveryError);
        expect((error as MailDeliveryError).cause).toMatchObject({ name: "TimeoutError" });
      });
    },
  );
});
