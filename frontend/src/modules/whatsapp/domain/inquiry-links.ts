import { formatPrice } from "@/modules/core/formatters/price";

const GENERAL_INQUIRY_MESSAGE = "¡Hola Librería Mi Sueño! Quería hacer una consulta.";

function chatUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Chat with the store, opened with a greeting the customer can edit. */
export function generalInquiryUrl(number: string): string {
  return chatUrl(number, GENERAL_INQUIRY_MESSAGE);
}

interface ProductInquiry {
  title: string;
  /** Price the customer would pay now, as decimal text such as `"1500.50"`. */
  price: string;
  /** Absolute address of the product page. */
  href: string;
}

/** Chat with the store about one product, naming it, its current price and where to see it. */
export function productInquiryUrl(number: string, { title, price, href }: ProductInquiry): string {
  return chatUrl(
    number,
    `¡Hola Librería Mi Sueño! Quería consultar por «${title}» (${formatPrice(price)}): ${href}`,
  );
}

export interface CartInquiryLine {
  quantity: number;
  title: string;
  /** What the units cost together, as decimal text such as `"19600.00"`. */
  subtotal: string;
}

interface CartInquiry {
  lines: CartInquiryLine[];
  /** What the whole cart costs, as decimal text. */
  total: string;
}

/** Chat with the store to order what is in the cart, one line per product and the total. */
export function cartInquiryUrl(number: string, { lines, total }: CartInquiry): string {
  const items = lines
    .map(({ quantity, title, subtotal }) => `• ${quantity}× ${title} — ${formatPrice(subtotal)}`)
    .join("\n");
  return chatUrl(
    number,
    `¡Hola Librería Mi Sueño! Quiero reservar este pedido:\n\n${items}\n\nTotal: ${formatPrice(total)}\n\n¿Está disponible para pasar a buscarlo por el local?`,
  );
}
