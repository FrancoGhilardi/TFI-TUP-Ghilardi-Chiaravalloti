/** Store details shown across the public pages. The WhatsApp number lives in `publicConfig`. */
export const siteConfig = {
  name: "Librería Mi Sueño",
  tagline: "Cerca tuyo, en cada sueño",
  description:
    "Tu librería de barrio en Mendoza. Libros, útiles, artística, impresiones y Rapipago. Reservá por WhatsApp y pasá a buscarlo.",
  instagramUrl: "https://www.instagram.com/libreria_misueno/",
  address: "San Martín 204, B6451XAC San Carlos, Mendoza",
  /** The store on Google Maps, as its listing shares it. */
  mapsUrl: "https://maps.app.goo.gl/fEBdQFBgGmq7ve1v6",
  hours: [
    { days: "Lunes a viernes", time: "8:00 a 12:30 y 17:00 a 20:30 h" },
    { days: "Sábados", time: "9:00 a 12:30 h" },
  ],
  email: "msueno27@gmail.com",
  services: [
    { id: "printing", label: "Impresiones y fotocopias" },
    { id: "binding", label: "Anillado y plastificado" },
    { id: "rapipago", label: "Rapipago" },
  ],
} as const;
