const GENERAL_INQUIRY_MESSAGE = "¡Hola Librería Mi Sueño! Quería hacer una consulta.";

function chatUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Chat with the store, opened with a greeting the customer can edit. */
export function generalInquiryUrl(number: string): string {
  return chatUrl(number, GENERAL_INQUIRY_MESSAGE);
}
