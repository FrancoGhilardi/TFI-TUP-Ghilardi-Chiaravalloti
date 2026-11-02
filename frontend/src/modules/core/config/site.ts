/** Store details shown across the public pages. The WhatsApp number lives in `publicConfig`. */
export const siteConfig = {
  name: "Librería Mi Sueño",
  description:
    "Tu librería de barrio en Mendoza. Libros, útiles, artística, impresiones y Rapipago. Reservá por WhatsApp y pasá a buscarlo.",
  instagramUrl: "https://www.instagram.com/libreria_misueno/",
  city: "Mendoza, Argentina",
  hours: "Lun a Sáb · 9 a 13 / 17 a 21 h",
  email: "msueno27@gmail.com",
  services: [
    { id: "printing", label: "Impresiones y fotocopias" },
    { id: "binding", label: "Anillado y plastificado" },
    { id: "rapipago", label: "Rapipago" },
  ],
} as const;
