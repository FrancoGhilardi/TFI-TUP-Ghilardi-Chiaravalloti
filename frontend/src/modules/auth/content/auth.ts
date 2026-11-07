import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../domain/password-rules";

/** Copy of the panel's auth screens, kept apart so it can change without touching UI. */
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
    unexpected: "No pudimos iniciar sesión. Intentá de nuevo en unos minutos.",
  },
  forgotPassword: {
    pageTitle: "Recuperar contraseña",
    pageDescription:
      "Pedí una clave temporal para volver a ingresar al panel de Librería Mi Sueño.",
    title: "¿Olvidaste tu contraseña?",
    lead: "Escribí tu email y te enviamos una clave temporal para ingresar.",
    submit: "Enviar clave temporal",
    submitting: "Enviando…",
    backToLogin: "Volver a ingresar",
    otherEmail: "Usar otro email",
    sent: "Si el email existe, te enviamos una clave temporal. Usala para ingresar y cambiala al entrar.",
    unexpected: "No pudimos enviar el pedido. Intentá de nuevo en unos minutos.",
  },
  changePassword: {
    pageTitle: "Cambiar contraseña",
    pageDescription: "Cambiá la contraseña de tu cuenta del panel.",
    title: "Cambiar contraseña",
    leadRequired: "Ingresaste con una clave temporal. Elegí una contraseña nueva para seguir.",
    leadOptional: "Elegí una contraseña nueva para tu cuenta.",
    currentPassword: { label: "Contraseña actual", placeholder: "Tu contraseña actual" },
    newPassword: {
      label: "Contraseña nueva",
      placeholder: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
    },
    confirmPassword: {
      label: "Repetí la contraseña nueva",
      placeholder: "Repetí la contraseña nueva",
    },
    submit: "Cambiar contraseña",
    submitting: "Guardando…",
    success: "Listo, cambiaste tu contraseña.",
    unexpected: "No pudimos cambiar la contraseña. Intentá de nuevo en unos minutos.",
    errors: {
      currentRequired: "Escribí tu contraseña actual.",
      newTooShort: `La contraseña nueva debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      newTooLong: `La contraseña nueva no puede tener más de ${PASSWORD_MAX_LENGTH} caracteres.`,
      confirmRequired: "Repetí la contraseña nueva.",
      mismatch: "Las contraseñas no coinciden.",
      sameAsCurrent: "La contraseña nueva tiene que ser distinta de la actual.",
    },
  },
  gate: {
    loading: "Cargando el panel…",
    unavailable: "No pudimos verificar tu sesión. Revisá tu conexión e intentá de nuevo.",
    retry: "Reintentar",
  },
  errors: {
    emailRequired: "Escribí tu email.",
    emailInvalid: "Escribí un email válido, como nombre@dominio.com.",
    passwordRequired: "Escribí tu contraseña.",
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
