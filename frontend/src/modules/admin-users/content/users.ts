/** Limits of the user fields, the same the API holds them to. */
export const NAME_MAX_LENGTH = 120;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const roleLabels = { ADMIN: "Administrador", SELLER: "Vendedor" } as const;

/** Messages of the user form's validation, in the words of the person using it. */
export const userFormErrors = {
  name: {
    required: "Escribí el nombre.",
    tooLong: `El nombre puede tener hasta ${NAME_MAX_LENGTH} caracteres.`,
  },
  email: {
    required: "Escribí el email.",
    invalid: "Escribí un email válido, como nombre@dominio.com.",
    tooLong: `El email puede tener hasta ${EMAIL_MAX_LENGTH} caracteres.`,
  },
  role: "Elegí un rol.",
  temporaryPassword: {
    required: "Escribí la contraseña temporal.",
    length: `La contraseña tiene que tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
  },
  passwordConfirmation: {
    required: "Repetí la contraseña.",
    mismatch: "Las contraseñas no coinciden.",
  },
  /** For a failure that is not the API's, so there is nothing of its own to show. */
  fallback: "No pudimos guardar el usuario. Probá de nuevo.",
} as const;

/** Why an admin cannot do to their own account what they can do to another one. */
export const ownAccountReasons = {
  role: "No podés cambiar tu propio rol.",
  state: "No podés desactivarte a vos mismo.",
  remove: "No podés darte de baja a vos mismo.",
  resetPassword: "Para cambiar tu contraseña usá Mi cuenta.",
} as const;

/** Messages that tell the outcome of an action on a user. */
export const userActionToasts = {
  removed: "Usuario dado de baja",
  restored: "Usuario reactivado",
  passwordSent: "Le enviamos una contraseña temporal por mail",
  failed: "No pudimos completar la acción. Probá de nuevo.",
} as const;

/** Messages that tell the outcome of saving the user form. */
export const userFormToasts = {
  created: "Usuario creado",
  updated: "Cambios guardados",
  failed: "No pudimos guardar el usuario. Revisá los datos marcados.",
} as const;

/** Texts of the users list. */
export const usersContent = {
  eyebrow: "Administración",
  title: "Usuarios",
  lead: "Quiénes entran al panel y qué pueden hacer. Los administradores gestionan además a los usuarios.",
  newUser: "Agregar usuario",
  loading: "Cargando usuarios",
  search: { label: "Buscar", placeholder: "Buscar por nombre o email…" },
  role: { label: "Rol", any: "Todos los roles" },
  state: { label: "Estado" },
  clear: "Limpiar filtros",
  table: {
    caption: "Usuarios",
    columns: {
      user: "Usuario",
      role: "Rol",
      state: "Estado",
      lastAccess: "Último acceso",
      actions: "Acciones",
    },
    states: { active: "Activo", inactive: "Inactivo", deleted: "Dado de baja" },
    mustChangePassword: "Debe cambiar la contraseña",
    never: "Nunca",
    you: "Vos",
    summary: (from: number, to: number, total: number) => `${from}–${to} de ${total}`,
  },
  actions: {
    edit: (name: string) => `Editar ${name}`,
    remove: (name: string) => `Dar de baja a ${name}`,
    restore: (name: string) => `Reactivar a ${name}`,
    resetPassword: (name: string) => `Enviar contraseña temporal a ${name}`,
  },
  confirmRemove: {
    title: (name: string) => `¿Dar de baja a "${name}"?`,
    description:
      "El usuario deja de poder entrar al panel y se cierran sus sesiones. Podés reactivarlo cuando quieras.",
    confirm: "Dar de baja",
  },
  confirmResetPassword: {
    title: (name: string) => `¿Enviar una contraseña temporal a "${name}"?`,
    description:
      "Le llega por mail una clave nueva, se cierran sus sesiones y tiene que cambiarla al entrar.",
    confirm: "Enviar contraseña",
  },
  empty: {
    filteredTitle: "No hay usuarios con estos filtros",
    filteredText: "Probá con otra búsqueda o limpiá los filtros.",
    noneTitle: "Todavía no hay usuarios",
    noneText: "Agregá el primero para darle acceso al panel.",
  },
  error: {
    title: "No pudimos cargar los usuarios",
    text: "Revisá tu conexión e intentá de nuevo.",
    retry: "Reintentar",
  },
  outOfRange: {
    title: "Esa página no existe",
    text: "Con estos filtros hay menos páginas.",
    action: "Ir a la primera página",
  },
} as const;

/** Texts of the user form's screens. */
export const userFormText = {
  back: "Volver a usuarios",
  newTitle: "Nuevo usuario",
  newLead: "Completá sus datos y una contraseña temporal: la va a tener que cambiar al entrar.",
  sections: { data: "Datos del usuario", access: "Acceso" },
  fields: {
    name: { label: "Nombre", placeholder: "Ej.: Marta Gómez" },
    email: {
      label: "Email",
      placeholder: "nombre@dominio.com",
      hint: "Con este email entra al panel.",
    },
    role: {
      label: "Rol",
      choose: "Elegí un rol",
      hint: "Los administradores gestionan también a los usuarios; los vendedores, productos y categorías.",
    },
    temporaryPassword: {
      label: "Contraseña temporal",
      hint: "De 8 a 128 caracteres. El usuario la cambia en su primer ingreso.",
    },
    passwordConfirmation: { label: "Repetir contraseña" },
  },
  state: {
    label: "Estado",
    active: "Activo",
    inactive: "Inactivo",
    hint: "Un usuario inactivo no puede entrar al panel, pero sigue en la lista.",
  },
  meta: {
    createdAt: (date: string) => `Alta el ${date}`,
    lastAccess: (when: string) => `Último acceso ${when}`,
    neverAccessed: "Todavía no entró",
  },
  ownAccount: {
    note: "Es tu propia cuenta: podés cambiar tu nombre y tu email, pero no tu rol ni tu estado, ni darte de baja.",
    account: "Ir a Mi cuenta",
  },
  saveBar: {
    create: "Completá los datos para crear el usuario.",
    dirty: "Hay cambios sin guardar",
    clean: "Sin cambios",
    cancel: "Cancelar",
    createLabel: "Crear usuario",
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
      `Este usuario está dado de baja desde el ${date}. Para editarlo, primero reactivalo.`,
    restore: "Reactivar",
  },
  resetPassword: "Enviar contraseña temporal",
  remove: "Dar de baja",
  notFound: {
    title: "No encontramos ese usuario",
    text: "Puede que ya no exista o que el enlace esté mal.",
    action: "Volver a usuarios",
  },
  loadError: {
    title: "No pudimos cargar el usuario",
    text: "Revisá tu conexión e intentá de nuevo.",
    retry: "Reintentar",
  },
  loading: "Cargando el usuario",
} as const;
