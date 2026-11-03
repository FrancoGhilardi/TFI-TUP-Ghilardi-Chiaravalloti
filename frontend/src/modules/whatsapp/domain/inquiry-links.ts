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
