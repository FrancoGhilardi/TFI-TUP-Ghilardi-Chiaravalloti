/** Copy of the panel's account screen, kept apart so it can change without touching UI. */
export const accountContent = {
  eyebrow: "Cuenta",
  title: "Mi cuenta",
  lead: "Tus datos de acceso al panel.",
  lastLogin: "Último ingreso",
  createdAt: "Cuenta creada",
  help: {
    ADMIN: "Para cambiar tu nombre o email, pedíselo a otro administrador.",
    SELLER: "Para cambiar tu nombre, email o rol, pedíselo a un administrador.",
  },
  password: {
    title: "Cambiar contraseña",
    note: "Al cambiarla se cierran tus sesiones en otros dispositivos. En este seguís conectado.",
  },
} as const;
