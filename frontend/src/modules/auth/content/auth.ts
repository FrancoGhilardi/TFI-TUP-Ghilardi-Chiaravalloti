/** Copy of the panel's sign-in screen, kept apart so it can change without touching UI. */
export const authContent = {
  login: {
    pageTitle: "Ingresar al panel",
    pageDescription: "Ingresá al panel de Librería Mi Sueño para gestionar el catálogo.",
    panelBadge: "Panel",
    title: "Hola de nuevo",
    lead: "Ingresá para gestionar el catálogo de la librería.",
    email: { label: "Email", placeholder: "nombre@libreriamisueno.com.ar" },
    password: {
      label: "Contraseña",
      placeholder: "Tu contraseña",
      show: "Mostrar contraseña",
      hide: "Ocultar contraseña",
    },
    forgotPassword: "¿Olvidaste tu contraseña?",
    submit: "Ingresar",
    submitting: "Ingresando…",
  },
  errors: {
    emailRequired: "Escribí tu email.",
    emailInvalid: "Escribí un email válido, como nombre@dominio.com.",
    passwordRequired: "Escribí tu contraseña.",
    unexpected: "No pudimos iniciar sesión. Intentá de nuevo en unos minutos.",
    /** `waitSeconds` is how long the API asks to wait; without it the message gives no time. */
    tooManyAttempts: (waitSeconds: number | undefined) => {
      if (waitSeconds === undefined) {
        return "Hiciste demasiados intentos. Esperá unos minutos y volvé a intentar.";
      }
      const minutes = Math.max(1, Math.ceil(waitSeconds / 60));
      return `Hiciste demasiados intentos. Esperá ${minutes} ${minutes === 1 ? "minuto" : "minutos"} y volvé a intentar.`;
    },
  },
} as const;
