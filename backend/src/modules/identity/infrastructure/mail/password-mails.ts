const TIME_ZONE = "America/Argentina/Buenos_Aires";
const DATE = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const TIME = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface Mail {
  subject: string;
  text: string;
  html: string;
}

interface PasswordMailInput {
  name: string;
  temporaryPassword: string;
  loginUrl: string;
}

export interface TemporaryPasswordMailInput extends PasswordMailInput {
  expiresAt: Date;
}

/** Forgot password: the temporary password works alongside the current one until it expires. */
export function temporaryPasswordMail(input: TemporaryPasswordMailInput): Mail {
  const expiry = `${DATE.format(input.expiresAt)} a las ${TIME.format(input.expiresAt)}`;
  return passwordMail(input, {
    subject: "Tu clave temporal de Librería Mi Sueño",
    intro:
      "Pediste ingresar al panel de Librería Mi Sueño sin tu contraseña. Tu clave temporal es:",
    terms: `Vence el ${expiry} (hora de Argentina) y sirve una sola vez. Al ingresar con ella vas a tener que elegir una contraseña nueva.`,
    closing: "Si no lo pediste, ignorá este mail: tu contraseña actual sigue funcionando.",
  });
}

/** An admin reset the password: the temporary one replaces it and must be changed. */
export function assignedPasswordMail(input: PasswordMailInput): Mail {
  return passwordMail(input, {
    subject: "Restablecimos tu contraseña de Librería Mi Sueño",
    intro:
      "Un administrador restableció tu contraseña del panel de Librería Mi Sueño. Tu clave temporal es:",
    terms:
      "Tu contraseña anterior ya no funciona. Al ingresar con esta clave vas a tener que elegir una contraseña nueva.",
    closing: "Si no lo pediste, avisale a un administrador.",
  });
}

interface Wording {
  subject: string;
  intro: string;
  terms: string;
  closing: string;
}

/** The layout both mails share, as plain text and as HTML. */
function passwordMail(input: PasswordMailInput, wording: Wording): Mail {
  const text = [
    `Hola, ${input.name}:`,
    "",
    wording.intro,
    "",
    input.temporaryPassword,
    "",
    wording.terms,
    "",
    `Ingresá en: ${input.loginUrl}`,
    "",
    wording.closing,
  ].join("\n");
  const html = [
    `<p>Hola, ${escapeHtml(input.name)}:</p>`,
    `<p>${wording.intro}</p>`,
    `<p style="font-family: monospace; font-size: 20px; letter-spacing: 2px;"><strong>${escapeHtml(input.temporaryPassword)}</strong></p>`,
    `<p>${wording.terms}</p>`,
    `<p><a href="${escapeHtml(input.loginUrl)}">Ingresar al panel</a></p>`,
    `<p>${wording.closing}</p>`,
  ].join("\n");
  return { subject: wording.subject, text, html };
}

// The name is set by an admin and could hold markup.
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
