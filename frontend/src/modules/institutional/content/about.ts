/** Copy of the about page, kept apart so the owner can change it without touching UI. */
export const aboutContent = {
  hero: {
    eyebrow: "Nuestra historia",
    /** Two lines, then the word set in the script font. */
    title: { lines: ["La librería con", "nombre de"], highlight: "sueño" },
    paragraphs: [
      "Librería Mi Sueño nació como tantos comercios de barrio: con la idea de tener cerca un lugar donde encontrar lo que hace falta para la escuela, el trabajo y los proyectos personales. Con el tiempo nos volvimos parte de la rutina del barrio.",
      "Hoy ofrecemos libros, útiles escolares, artística y regalería, además de servicios de impresión, fotocopias, anillado, plastificado y Rapipago. Lo que buscamos sigue siendo lo mismo: atención cercana y de confianza.",
    ],
    contactCta: "Escribinos",
    productsCta: "Ver productos",
  },
  values: {
    /** Not shown: it names the section for assistive technology. */
    heading: "Lo que nos define",
    items: [
      {
        id: "closeness",
        title: "Atención cercana",
        text: "Te ayudamos a encontrar lo que necesitás, sin vueltas, como en la librería de siempre.",
      },
      {
        id: "services",
        title: "Servicios al instante",
        text: "Impresiones, fotocopias, anillado, plastificado y Rapipago en el mismo local.",
      },
      {
        id: "pickup",
        title: "Reservá y retirá",
        text: "Armás tu pedido online, lo mandás por WhatsApp y lo retirás cuando puedas.",
      },
    ],
  },
  visit: {
    title: "¿Pasás a visitarnos?",
    text: "Estamos en Mendoza. Escribinos por WhatsApp y coordinamos tu pedido o tu trabajo de impresión.",
    contactCta: "Hablar con la librería",
    directionsCta: "Cómo llegar",
    cityLabel: "Ubicación",
    hoursLabel: "Horarios",
  },
} as const;
