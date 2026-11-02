/** Copy of the home hero, kept apart so it can change without touching UI. */
export const heroContent = {
  eyebrow: "Librería · Mendoza",
  /** Two lines, then the word set in the script font. */
  title: { lines: ["Todo para crear,", "estudiar y"], highlight: "soñar" },
  lead: "Libros, útiles escolares y artística. Reservá por WhatsApp y pasá a buscarlo por el local.",
  catalogCta: "Ver catálogo",
  inquiryCta: "Consultar",
} as const;
