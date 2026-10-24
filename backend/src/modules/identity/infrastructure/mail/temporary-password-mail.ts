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

export interface TemporaryPasswordMailInput {
  name: string;
  temporaryPassword: string;
  expiresAt: Date;
  loginUrl: string;
}

export interface Mail {
  subject: string;
  text: string;
  html: string;
}

/** The mail with a temporary password, as plain text and as HTML. */
export function temporaryPasswordMail(input: TemporaryPasswordMailInput): Mail {
  const expiry = `${DATE.format(input.expiresAt)} a las ${TIME.format(input.expiresAt)}`;
  const text = [
    `Hola, ${input.name}:`,
    "",
    "Pediste ingresar al panel de Librería Mi Sueño sin tu contraseña. Tu clave temporal es:",
    "",
    input.temporaryPassword,
    "",
    `Vence el ${expiry} (hora de Argentina) y sirve una sola vez. Al ingresar con ella vas a tener que elegir una contraseña nueva.`,
    "",
    `Ingresá en: ${input.loginUrl}`,
    "",
    "Si no lo pediste, ignorá este mail: tu contraseña actual sigue funcionando.",
  ].join("\n");
  const html = [
    `<p>Hola, ${escapeHtml(input.name)}:</p>`,
    "<p>Pediste ingresar al panel de Librería Mi Sueño sin tu contraseña. Tu clave temporal es:</p>",
    `<p style="font-family: monospace; font-size: 20px; letter-spacing: 2px;"><strong>${escapeHtml(input.temporaryPassword)}</strong></p>`,
    `<p>Vence el ${expiry} (hora de Argentina) y sirve una sola vez. Al ingresar con ella vas a tener que elegir una contraseña nueva.</p>`,
    `<p><a href="${escapeHtml(input.loginUrl)}">Ingresar al panel</a></p>`,
    "<p>Si no lo pediste, ignorá este mail: tu contraseña actual sigue funcionando.</p>",
  ].join("\n");
  return { subject: "Tu clave temporal de Librería Mi Sueño", text, html };
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
