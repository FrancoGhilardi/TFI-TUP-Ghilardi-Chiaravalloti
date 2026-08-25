# E-commerce con reserva por WhatsApp — Librería Mi Sueño

## Datos del trabajo

| | |
|---|---|
| **Título** | E-commerce con reserva por WhatsApp — Caso de aplicación: Librería Mi Sueño |
| **Tipo de trabajo** | Trabajo Final Integrador |
| **Institución** | Universidad Tecnológica Nacional |
| **Carrera** | Tecnicatura Universitaria en Programación |
| **Autor/a** |  Agustin Chiaravalloti / Franco Ghilardi |
| **Tutor/a** |Juan Ignacio Schiavonni  |

## De qué se trata

Librería Mi Sueño es un comercio de barrio en Mendoza (libros, útiles
escolares, artística, regalería y servicios de impresión) cuya operación
comercial es hoy enteramente manual: los clientes consultan disponibilidad y
precio uno por uno por WhatsApp, sin ningún catálogo público ni presencia en
internet.

El proyecto resuelve esto con un e-commerce de catálogo con reserva por
WhatsApp: el cliente navega el catálogo, arma un carrito y el sistema genera
un mensaje de WhatsApp con el pedido para que el negocio lo confirme. El
negocio administra el catálogo (productos, categorías, precios, imágenes)
desde un panel propio con login, sin depender de un desarrollador para cada
cambio.

**Primera implementación (MVP):** tienda pública (home, catálogo con
buscador y filtros, ficha de producto), carrito con reserva por WhatsApp,
página institucional, y panel de administración con login y ABM completo de
productos y categorías.

**Mejora futura:** pagos online con Mercado Pago, gestión de pedidos con
estados, descuento automático de stock, rol "vendedor" y estadísticas
básicas.

## Tecnologías

Arquitectura desacoplada: frontend y backend son aplicaciones independientes,
cada una con su propio repositorio dentro del monorepo, ciclo de despliegue y
responsabilidad.

| Capa | Tecnología | Rol |
|---|---|---|
| Frontend | Next.js (React), alojado en Vercel | Tienda pública y panel de administración. SSR/ISR para SEO y velocidad. |
| Backend / API | NestJS + Drizzle ORM, alojado en Render | API REST: catálogo, autenticación del panel y, a futuro, pedidos y pagos. |
| Base de datos | PostgreSQL relacional en Supabase | Productos, categorías, imágenes, usuarios y, a futuro, pedidos. |
| Almacenamiento | Bucket de Supabase Storage | Imágenes de producto. |
| Mensajería | WhatsApp (deep links wa.me) | Reserva, consulta y contacto. |
| Pagos (mejora futura) | SDK de Mercado Pago, integrado desde el backend | Checkout Pro y confirmación de pago vía webhook. |

## Documentación

El documento completo de arquitectura técnica, fundamentos de decisión del
stack y análisis de viabilidad está en la carpeta de documentación del
proyecto (Trabajo Final Integrador).
