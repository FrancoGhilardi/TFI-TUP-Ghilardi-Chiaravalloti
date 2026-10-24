import { ExternalServiceError } from "../../../../shared/domain/errors/index.js";
import { MailDeliveryError } from "./mail-delivery-error.js";

describe("MailDeliveryError", () => {
  it("is a failing external service, so it answers 502 and is logged", () => {
    expect(new MailDeliveryError(new Error("timeout"))).toBeInstanceOf(ExternalServiceError);
  });

  it("has a stable code, a message for the user and the provider failure as its cause", () => {
    const cause = new Error("daily_quota_exceeded");

    expect(new MailDeliveryError(cause)).toMatchObject({
      code: "MAIL_DELIVERY_FAILED",
      message: "No se pudo enviar el mail. Probá de nuevo.",
      cause,
    });
  });
});
