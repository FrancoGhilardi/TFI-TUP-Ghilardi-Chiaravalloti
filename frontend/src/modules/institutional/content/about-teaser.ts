import { ABOUT_PATH } from "../domain/routes";

/** Copy of the "about us" block on the home page, kept apart so it can change without touching UI. */
export const aboutTeaserContent = {
  eyebrow: "Sobre nosotros",
  title: "Una librería de barrio, con nombre de sueño.",
  body: "Desde hace años acompañamos a las familias del barrio: la lista escolar de marzo, el libro que te recomendaron, la lámina para la entrega del lunes y esas fotocopias de último momento. Atención cercana y de confianza.",
  cta: { label: "Conocé la historia", href: ABOUT_PATH },
} as const;
