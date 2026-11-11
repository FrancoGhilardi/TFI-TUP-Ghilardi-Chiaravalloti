/** Texts of the pages that stand in for a missing address or a failed one. */
export const systemPagesContent = {
  home: "Ir al inicio",
  notFound: {
    title: "No encontramos esa página",
    body: "Puede que el enlace esté mal o que la página ya no exista.",
  },
  error: {
    title: "Algo salió mal",
    body: "Tuvimos un problema al mostrar esta página. Probá de nuevo; si sigue pasando, volvé al inicio.",
    retry: "Reintentar",
  },
  reference: (code: string) => `Código de referencia: ${code}`,
} as const;
