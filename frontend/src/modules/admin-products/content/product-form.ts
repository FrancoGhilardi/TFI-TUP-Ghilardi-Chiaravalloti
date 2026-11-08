import { MAX_ALT_TEXT_LENGTH, MAX_IMAGES } from "../domain/image-rules";

/** Limits of the fields, the same the API holds them to. */
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 5000;
export const RELATED_MAX = 4;
export const NUMBER_MAX = 2_147_483_647;

/** Messages of the product form's validation, in the words of the person using it. */
export const productFormErrors = {
  title: {
    required: "Escribí el título.",
    tooLong: `El título puede tener hasta ${TITLE_MAX_LENGTH} caracteres.`,
  },
  description: {
    tooLong: `La descripción puede tener hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`,
  },
  price: {
    empty: "Escribí el precio.",
    format: "Escribí un precio válido, como 1500 o 1500,50.",
    zero: "El precio tiene que ser mayor que cero.",
    range: "El precio es demasiado alto.",
  },
  stock: "Escribí el stock como un número entero, 0 o más.",
  sortOrder: "Escribí la posición como un número entero, 0 o más.",
  salePrice: {
    empty: "Escribí el precio de oferta.",
    format: "Escribí un precio válido, como 1200 o 1200,50.",
    zero: "El precio de oferta tiene que ser mayor que cero.",
    range: "El precio de oferta es demasiado alto.",
    notLower: "El precio de oferta tiene que ser menor que el precio.",
  },
  day: {
    invalid: "Elegí un día válido.",
    past: "El día no puede ser anterior a hoy.",
  },
  categories: {
    none: "Elegí al menos una categoría.",
    noPrimary: "Elegí cuál es la categoría principal.",
  },
  related: { tooMany: `Podés elegir hasta ${RELATED_MAX} productos similares.` },
  images: {
    none: "Sumá al menos una imagen.",
    tooMany: `Podés subir hasta ${MAX_IMAGES} imágenes.`,
  },
  altText: `El texto alternativo puede tener hasta ${MAX_ALT_TEXT_LENGTH} caracteres.`,
  /** For a failure that is not the API's, so there is nothing of its own to show. */
  fallback: "No pudimos guardar el producto. Probá de nuevo.",
} as const;

/** Messages that tell the outcome of saving the product and of the actions on its images. */
export const productFormToasts = {
  created: "Producto creado",
  updated: "Cambios guardados",
  failed: "No pudimos guardar el producto. Revisá los datos marcados.",
  images: {
    added: "Imagen agregada",
    replaced: "Imagen reemplazada: se está procesando",
    reordered: "Orden de las imágenes actualizado",
    altChanged: "Texto alternativo guardado",
    removed: "Imagen eliminada",
    retried: "Volvemos a procesar la imagen",
    failed: "No pudimos completar la acción sobre la imagen. Probá de nuevo.",
  },
} as const;

/** Texts of the product form's screen. */
export const productFormText = {
  back: "Volver a productos",
  newTitle: "Nuevo producto",
  newLead: "Completá los datos, sumá al menos una imagen y elegí su categoría principal.",
  sections: {
    data: "Datos del producto",
    images: "Imágenes",
    categories: "Categorías",
    related: "Productos similares",
  },
  fields: {
    title: {
      label: "Título",
      placeholder: "Ej.: Cuaderno tapa dura A5 — Trigo",
      hintNew: "El enlace del producto y el SKU los genera el sistema al guardar.",
      hintEdit: "El enlace del producto y el SKU no cambian aunque edites el título.",
    },
    description: {
      label: "Descripción",
      note: "(opcional)",
      placeholder: "Contá qué es, medidas, materiales, para qué edad…",
    },
    price: { label: "Precio ($)", placeholder: "0,00" },
    stock: { label: "Stock", placeholder: "0" },
    sortOrder: {
      label: "Posición en listados",
      hint: "Menor número = aparece antes. A igual posición, primero el más nuevo.",
    },
  },
  publication: {
    title: "Publicación",
    state: "Estado",
    active: "Activo",
    inactive: "Inactivo",
    stateHint: "Un producto inactivo queda guardado pero no se muestra en la tienda.",
    featured: {
      label: "Destacado",
      hint: 'Aparece en "Destacados" del inicio (se muestran 5).',
    },
    sale: {
      label: "Oferta",
      hint: "Muestra el precio de oferta y el regular tachado.",
      price: "Precio de oferta ($)",
      pricePlaceholder: "Menor al precio",
      discount: (percent: number) => `${percent}% de descuento`,
      ends: "Termina el",
      endsHint: "Sin fecha, la oferta sigue hasta que la quites.",
    },
    new: {
      label: "Nuevo",
      hint: 'Aparece en "Novedades" del inicio (se muestran 5).',
      until: "Es novedad hasta",
      untilHint: "Al vencer, la marca se quita sola a la medianoche.",
    },
    optional: "(opcional)",
  },
  record: {
    title: "Registro",
    sku: "SKU",
    created: "Creado",
    edited: "Última edición",
    nobody: "—",
  },
  saveBar: {
    create: "Completá los datos y sumá al menos una imagen.",
    dirty: "Hay cambios sin guardar",
    clean: "Sin cambios",
    cancel: "Cancelar",
    createLabel: "Crear producto",
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
      `Este producto está dado de baja desde el ${date}. Para editarlo, primero reactivalo: vuelve con sus imágenes, categorías y similares.`,
    restore: "Reactivar",
  },
  remove: "Dar de baja",
  notFound: {
    title: "No encontramos ese producto",
    text: "Puede que ya no exista o que el enlace esté mal.",
    action: "Volver a productos",
  },
  loadError: {
    title: "No pudimos cargar el producto",
    text: "Revisá tu conexión e intentá de nuevo.",
    retry: "Reintentar",
  },
  loading: "Cargando el producto",
} as const;

/** Texts of the sections where categories and related products are chosen. */
export const productPickersText = {
  categories: {
    help: "Marcá una o más y elegí la principal",
    add: "Elegir categorías",
    search: "Buscar categoría",
    empty: "No hay categorías que coincidan.",
    loading: "Cargando categorías…",
    failed: "No pudimos cargar las categorías.",
    retry: "Reintentar",
    chosen: "Categorías elegidas",
    primary: "Principal",
    primaryOf: (name: string) => `Hacer principal a ${name}`,
    remove: (name: string) => `Quitar ${name}`,
    none: "Todavía no elegiste ninguna categoría.",
    inactive: "inactiva: no se puede elegir",
    picked: "elegida",
  },
  related: {
    intro:
      "Hasta 4, en el orden en que se muestran en la ficha. Si cargás menos, la tienda completa con productos de la categoría principal.",
    add: "Buscar productos",
    search: "Buscar por título o SKU",
    searching: "Buscando…",
    empty: "No encontramos productos.",
    failed: "No pudimos buscar productos.",
    retry: "Reintentar",
    full: "Ya elegiste los 4 productos que se muestran.",
    none: "Todavía no elegiste productos similares.",
    chosen: "Productos similares elegidos",
    count: (chosen: number, max: number) => `${chosen} de ${max}`,
    moveUp: (title: string) => `Subir ${title}`,
    moveDown: (title: string) => `Bajar ${title}`,
    remove: (title: string) => `Quitar ${title}`,
  },
} as const;

/** Texts of the images section, when choosing them and when managing the saved ones. */
export const productImagesText = {
  help: "De 1 a 5 imágenes JPEG, PNG o WebP, hasta 10 MB cada una. Arrastrá para ordenar: la primera es la portada. Se recortan a 4:5 al procesarse.",
  count: (chosen: number, max: number) => `${chosen} de ${max}`,
  add: "Agregar imágenes",
  list: "Imágenes del producto",
  none: "Todavía no sumaste ninguna imagen.",
  cover: "Portada",
  position: (position: number) => `Imagen ${position}`,
  alt: {
    label: "Texto alternativo",
    note: "(opcional)",
    placeholder: "Describí la imagen para quienes no pueden verla",
  },
  problems: {
    type: (name: string) => `${name}: usá una imagen JPEG, PNG o WebP.`,
    size: (name: string) => `${name}: pesa más de 10 MB.`,
    tooMany: (max: number) =>
      `Podés subir hasta ${max} imágenes: las que sobraron no se agregaron.`,
  },
  drag: (name: string) => `Arrastrar ${name} para ordenarla`,
  moveUp: (name: string) => `Subir ${name}`,
  moveDown: (name: string) => `Bajar ${name}`,
  remove: (name: string) => `Quitar ${name}`,
  announcements: {
    instructions:
      "Para ordenar, apretá espacio sobre la imagen, movela con las flechas y soltala con espacio. Con escape se cancela.",
    picked: (name: string) => `Tomaste ${name}.`,
    over: (name: string, position: number) => `${name} está sobre la posición ${position}.`,
    dropped: (name: string, position: number) => `Soltaste ${name} en la posición ${position}.`,
    cancelled: (name: string) => `Cancelaste el movimiento de ${name}.`,
  },
} as const;

/** Texts of the images already saved in a product. */
export const savedImagesText = {
  name: (position: number) => `imagen ${position}`,
  status: {
    PENDING: "Procesando…",
    PROCESSED: "Lista",
    FAILED: "No se pudo procesar",
  },
  retry: "Reintentar",
  replaceLabel: "Reemplazar",
  replace: (name: string) => `Reemplazar ${name}`,
  saveAlt: "Guardar texto",
  onlyOne: "Un producto necesita al menos una imagen: sumá otra antes de quitar esta.",
  loading: "Cargando imágenes…",
  failed: "No pudimos cargar las imágenes.",
  retryLoad: "Reintentar",
  confirmRemove: {
    title: (name: string) => `¿Quitar la ${name}?`,
    description: "La imagen se borra del producto y no se puede recuperar.",
    confirm: "Quitar imagen",
  },
} as const;
