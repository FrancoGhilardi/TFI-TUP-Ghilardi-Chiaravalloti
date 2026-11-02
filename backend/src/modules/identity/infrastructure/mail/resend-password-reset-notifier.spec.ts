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
      // The status is not always a number at runtime: the client passes the body through.
      const rejected = (statusCode: number | null | undefined) =>
        setUp(() =>
          Promise.resolve({
            data: null,
            error: {
              name: "daily_quota_exceeded",
              message: "Daily quota exceeded",
              statusCode: statusCode as number | null,
            },
            headers: null,
          }),
        )
          .sends[kind]()
          .catch((caught: unknown) => caught);

      it("when Resend rejects it, keeping its whole answer, status included", async () => {
        const error = (await rejected(429)) as MailDeliveryError;

        expect(error).toBeInstanceOf(MailDeliveryError);
        expect(error.maybeDelivered).toBe(false);
        expect(error.cause).toMatchObject({
          message: "Resend did not accept the mail",
          cause: { name: "daily_quota_exceeded", statusCode: 429 },
        });
      });

      it.each([
        // How the client reports a timeout or an unreachable provider alike.
        ["without a status, as after a timeout or when the provider is unreachable", null],
        ["with a status missing from its answer", undefined],
        ["with a provider error", 500],
      ])("as maybe delivered when Resend answers %s", async (_label, statusCode) => {
        expect(((await rejected(statusCode)) as MailDeliveryError).maybeDelivered).toBe(true);
      });

      it("as maybe delivered when the client throws", async () => {
        const failure = new TypeError("fetch failed");
        const { sends } = setUp(() => Promise.reject(failure));

        await expect(sends[kind]()).rejects.toMatchObject({
          code: "MAIL_DELIVERY_FAILED",
          cause: failure,
          maybeDelivered: true,
        });
      });

      it("as maybe delivered when the timeout aborts the client while it reads the answer", async () => {
        // The only timeout the client throws instead of returning: it rethrows the reason of
        // the aborted signal when it happens while reading the body.
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
        expect(error).toMatchObject({ maybeDelivered: true, cause: { name: "TimeoutError" } });
      });
    },
  );
});
