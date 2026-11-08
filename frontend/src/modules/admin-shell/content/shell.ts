/** Copy of the panel's frame, kept apart so it can change without touching UI. */
export const shellContent = {
  navigationLabel: "Navegación del panel",
  breadcrumbLabel: "Migas de pan",
  defaultTitle: "Panel",
  panelBadge: "Panel",
  openMenu: "Abrir menú",
  logout: "Cerrar sesión",
  menuTitle: "Menú del panel",
  contentId: "panel-content",
  groups: {
    catalog: "Catálogo",
    admin: "Administración",
    account: "Cuenta",
  },
  menu: {
    home: "Inicio",
    products: "Productos",
    categories: "Categorías",
    users: "Usuarios",
    account: "Mi cuenta",
    store: "Ver tienda",
  },
  roles: {
    ADMIN: "Administrador",
    SELLER: "Vendedor",
  },
  forbidden: {
    title: "Sin permisos",
    description:
      "Tu rol no puede abrir esta sección. Si creés que es un error, pedíselo a un administrador.",
    action: "Ir a Productos",
  },
} as const;
