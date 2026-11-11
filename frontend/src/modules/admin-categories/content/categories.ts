/** Limits of the category fields, the same the API holds them to. */
export const NAME_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const SORT_ORDER_MAX = 2_147_483_647;

/** Messages of the category form's validation, in the words of the person using it. */
export const categoryFormErrors = {
  name: {
    required: "Escribí el nombre.",
    tooLong: `El nombre puede tener hasta ${NAME_MAX_LENGTH} caracteres.`,
  },
  description: {
    tooLong: `La descripción puede tener hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`,
  },
  sortOrder: "Escribí la posición como un número entero, 0 o más.",
  /** For a failure that is not the API's, so there is nothing of its own to show. */
  fallback: "No pudimos guardar la categoría. Probá de nuevo.",
} as const;

/** What tells how many things stop a category from being deleted. */
export const blockedByText = {
  one: "Hay 1 elemento que la bloquea.",
  many: (count: number) => `Hay ${count} elementos que la bloquean.`,
} as const;

/** Messages that tell the outcome of an action on a category from the list. */
export const categoryActionToasts = {
  removed: "Categoría dada de baja",
  restored: "Categoría reactivada",
  failed: "No pudimos completar la acción. Probá de nuevo.",
} as const;

/** Messages that tell the outcome of saving the category form. */
export const categoryFormToasts = {
  created: "Categoría creada",
  updated: "Cambios guardados",
  failed: "No pudimos guardar la categoría. Revisá los datos marcados.",
} as const;

/** Texts of the categories list. */
export const categoriesContent = {
  eyebrow: "Catálogo",
  title: "Categorías",
  lead: "Organizá el catálogo en categorías y subcategorías. El enlace (slug) se genera al crearla y no cambia.",
  newCategory: "Nueva categoría",
  loading: "Cargando categorías",
  search: { label: "Buscar", placeholder: "Buscar por nombre o enlace…" },
  state: { label: "Estado" },
  location: {
    label: "Ubicación",
    any: "Cualquier ubicación",
    within: (name: string) => `Dentro de ${name}`,
    chosen: "Ubicación elegida",
  },
  clear: "Limpiar filtros",
  table: {
    caption: "Categorías",
    columns: {
      category: "Categoría",
      location: "Ubicación",
      products: "Productos",
      order: "Orden",
      state: "Estado",
      modified: "Modificada",
      actions: "Acciones",
    },
    states: { active: "Activa", inactive: "Inactiva", deleted: "Dada de baja" },
    hidden: "Oculta",
    hiddenHint: "Una categoría superior está inactiva",
    root: "Raíz",
    summary: (from: number, to: number, total: number) => `${from}–${to} de ${total}`,
  },
  actions: {
    edit: (name: string) => `Editar ${name}`,
    remove: (name: string) => `Dar de baja ${name}`,
    restore: (name: string) => `Reactivar ${name}`,
  },
  confirmRemove: {
    title: (name: string) => `¿Dar de baja "${name}"?`,
    description:
      "La categoría deja de verse en la tienda y podés reactivarla cuando quieras. Para darla de baja no puede tener subcategorías ni ser la única de un producto.",
    confirm: "Dar de baja",
  },
  empty: {
    filteredTitle: "No hay categorías con estos filtros",
    filteredText: "Probá con otra búsqueda o limpiá los filtros.",
    noneTitle: "Todavía no hay categorías",
    noneText: "Creá la primera para organizar el catálogo.",
  },
  error: {
    title: "No pudimos cargar las categorías",
    text: "Revisá tu conexión e intentá de nuevo.",
    retry: "Reintentar",
  },
  outOfRange: {
    title: "Esa página no existe",
    text: "Con estos filtros hay menos páginas.",
    action: "Ir a la primera página",
  },
} as const;

/** Texts of the category form's screens. */
export const categoryFormText = {
  back: "Volver a categorías",
  newTitle: "Nueva categoría",
  newLead: "Completá el nombre y elegí dónde va dentro del árbol.",
  sections: { data: "Datos de la categoría", publication: "Publicación" },
  fields: {
    name: {
      label: "Nombre",
      placeholder: "Ej.: Cuadernos escolares",
      hintNew: "El enlace de la categoría lo genera el sistema al guardar.",
      hintEdit: "El enlace de la categoría no cambia aunque edites el nombre.",
    },
    description: {
      label: "Descripción",
      note: "(opcional)",
      placeholder: "Contá qué productos van en esta categoría.",
    },
    parent: {
      label: "Categoría padre",
      root: "Sin categoría padre (raíz)",
      current: "Categoría padre actual",
      hintNew: "Elegí dentro de qué categoría va; sin padre queda en la raíz.",
      hintEdit:
        "No se ofrecen la propia categoría ni sus subcategorías, porque cerrarían un ciclo.",
      loading: "Cargando categorías…",
      failed: "No pudimos cargar las categorías.",
      retry: "Reintentar",
    },
    sortOrder: {
      label: "Posición",
      hint: "Menor número = aparece antes. A igual posición, ordena por nombre.",
    },
  },
  state: {
    label: "Estado",
    active: "Activa",
    inactive: "Inactiva",
    hint: "Una categoría inactiva queda guardada pero no se muestra en la tienda, ni sus subcategorías.",
  },
  productCount: (count: number) => (count === 1 ? "1 producto" : `${count} productos`),
  saveBar: {
    create: "Completá el nombre para crear la categoría.",
    dirty: "Hay cambios sin guardar",
    clean: "Sin cambios",
    cancel: "Cancelar",
    createLabel: "Crear categoría",
    saveLabel: "Guardar cambios",
    saving: "Guardando…",
    leave: {
      title: "¿Salir sin guardar?",
      description: "Los cambios que hiciste se pierden.",
      confirm: "Salir",
      keep: "Seguir editando",
    },
  },
  deleted: {
    notice: (date: string) =>
      `Esta categoría está dada de baja desde el ${date}. Para editarla, primero reactivala.`,
    restore: "Reactivar",
  },
  remove: "Dar de baja",
  notFound: {
    title: "No encontramos esa categoría",
    text: "Puede que ya no exista o que el enlace esté mal.",
    action: "Volver a categorías",
  },
  loadError: {
    title: "No pudimos cargar la categoría",
    text: "Revisá tu conexión e intentá de nuevo.",
    retry: "Reintentar",
  },
  loading: "Cargando la categoría",
} as const;
