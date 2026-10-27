/** Only a missing field is left alone; a null one is invalid, not a way to skip it. */
export const isPresent = (_dto: object, value: unknown) => value !== undefined;

export const CATEGORY_MESSAGES = {
  name: "Ingresá el nombre.",
  description: "La descripción tiene que ser un texto.",
  parentId: "Elegí una categoría padre válida.",
  sortOrder: "La posición tiene que ser un número entero desde 0.",
  isActive: "Indicá si la categoría está activa.",
} as const;
