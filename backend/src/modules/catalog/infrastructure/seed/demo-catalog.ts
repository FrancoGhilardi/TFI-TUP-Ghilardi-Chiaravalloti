/**
 * Sample catalog for local development: a category tree three levels deep and enough products
 * to fill more than one page of the store, with featured, new, discounted and out-of-stock ones.
 */

export interface DemoCategory {
  slug: string;
  name: string;
  children?: DemoCategory[];
}

interface DemoProduct {
  title: string;
  slug: string;
  /** Slug of the category the product belongs to, its primary one. */
  category: string;
  /** As shown on the product page; line breaks are kept. */
  description: string;
  price: string;
  salePrice?: string;
  stock: number;
  featured?: boolean;
  isNew?: boolean;
}

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    slug: "escolar",
    name: "Escolar",
    children: [
      { slug: "cuadernos", name: "Cuadernos" },
      {
        slug: "lapices-y-lapiceras",
        name: "Lápices y lapiceras",
        children: [
          { slug: "lapices-de-colores", name: "Lápices de colores" },
          { slug: "lapiceras", name: "Lapiceras" },
        ],
      },
      { slug: "mochilas", name: "Mochilas" },
    ],
  },
  {
    slug: "arte-y-dibujo",
    name: "Arte y dibujo",
    children: [
      { slug: "pinturas", name: "Pinturas" },
      { slug: "pinceles", name: "Pinceles" },
    ],
  },
  {
    slug: "oficina",
    name: "Oficina",
    children: [
      { slug: "papeleria", name: "Papelería" },
      { slug: "archivo", name: "Archivo" },
    ],
  },
  { slug: "regaleria", name: "Regalería" },
];

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    title: "Cuaderno Rivadavia ABC 50 hojas rayadas",
    slug: "cuaderno-rivadavia-abc-50-hojas-rayadas",
    description:
      "Cuaderno tapa flexible de 50 hojas rayadas, el clásico de primaria. Papel de 56 g que no se transparenta con lapicera.",
    category: "cuadernos",
    price: "3200.00",
    stock: 40,
    featured: true,
  },
  {
    title: "Cuaderno universitario A4 cuadriculado",
    slug: "cuaderno-universitario-a4-cuadriculado",
    description:
      "Cuaderno universitario tamaño A4 con 84 hojas cuadriculadas y espiral doble. Tapa de cartón forrado y hojas con margen.",
    category: "cuadernos",
    price: "5400.00",
    salePrice: "4590.00",
    stock: 25,
  },
  {
    title: "Cuaderno tapa dura 16x21 lunares",
    slug: "cuaderno-tapa-dura-16x21-lunares",
    description:
      "Cuaderno de 16 x 21 cm con tapa dura estampada con lunares. 48 hojas rayadas, ideal para la carpeta de clase o para regalar.",
    category: "cuadernos",
    price: "4100.00",
    stock: 12,
    isNew: true,
  },
  {
    title: "Repuesto Gloria 96 hojas",
    slug: "repuesto-gloria-96-hojas",
    description:
      "Repuesto de 96 hojas rayadas tamaño N° 3 para carpeta escolar, con perforación de tres agujeros y refuerzo.",
    category: "cuadernos",
    price: "2900.00",
    stock: 0,
  },
  {
    title: "Cuaderno espiralado A5 con separadores",
    slug: "cuaderno-espiralado-a5-con-separadores",
    description:
      "Cuaderno espiralado tamaño A5 con 5 separadores de colores para organizar materias.\n120 hojas rayadas de 80 g, tapa rígida.",
    category: "cuadernos",
    price: "6200.00",
    stock: 8,
  },
  {
    title: "Lápices de colores Faber-Castell x 12",
    slug: "lapices-de-colores-faber-castell-x-12",
    description:
      "Caja de 12 lápices de colores Faber-Castell, largos y con mina resistente a la rotura. Colores intensos que se mezclan bien, ideales para la escuela.",
    category: "lapices-de-colores",
    price: "7800.00",
    salePrice: "6630.00",
    stock: 30,
    featured: true,
  },
  {
    title: "Lápices de colores acuarelables x 24",
    slug: "lapices-de-colores-acuarelables-x-24",
    description:
      "24 lápices de colores acuarelables: se usan en seco o se pasan con un pincel húmedo para lograr efecto de acuarela. Incluye pincel.",
    category: "lapices-de-colores",
    price: "14500.00",
    stock: 6,
    isNew: true,
  },
  {
    title: "Lápices pastel x 12 tamaño corto",
    slug: "lapices-pastel-x-12-tamano-corto",
    description:
      "Lápices de colores en tonos pastel, tamaño corto, ideales para cartucheras chicas y para los más chicos.",
    category: "lapices-de-colores",
    price: "3900.00",
    stock: 18,
  },
  {
    title: "Lápiz negro HB con goma",
    slug: "lapiz-negro-hb-con-goma",
    description:
      "Lápiz negro grafito HB con goma en la punta. Madera fácil de afilar y mina pareja para escribir y dibujar.",
    category: "lapices-y-lapiceras",
    price: "450.00",
    stock: 200,
  },
  {
    title: "Portaminas 0.5 mm con minas",
    slug: "portaminas-0-5-mm-con-minas",
    description:
      "Portaminas de 0,5 mm con grip de goma y clip metálico. Incluye un tubo de minas HB de repuesto.",
    category: "lapices-y-lapiceras",
    price: "2300.00",
    stock: 22,
  },
  {
    title: "Lapicera Bic azul x 4",
    slug: "lapicera-bic-azul-x-4",
    description:
      "Pack de 4 lapiceras Bic Cristal de tinta azul, punta media de 1 mm. Escritura suave y duradera.",
    category: "lapiceras",
    price: "1900.00",
    stock: 60,
    featured: true,
  },
  {
    title: "Lapicera de gel glitter x 6",
    slug: "lapicera-de-gel-glitter-x-6",
    description:
      "6 lapiceras de gel con brillos en colores surtidos. Tinta que seca rápido, ideal para títulos y decorar la carpeta.",
    category: "lapiceras",
    price: "4800.00",
    salePrice: "3840.00",
    stock: 15,
    isNew: true,
  },
  {
    title: "Resaltadores pastel x 6",
    slug: "resaltadores-pastel-x-6",
    description:
      "Set de 6 resaltadores en colores pastel con punta biselada para trazo fino o grueso. No traspasan el papel.",
    category: "lapiceras",
    price: "5600.00",
    stock: 0,
    isNew: true,
  },
  {
    title: "Mochila escolar 18 pulgadas floreada",
    slug: "mochila-escolar-18-pulgadas-floreada",
    description:
      "Mochila escolar de 18 pulgadas con estampado floreado.\nDos compartimentos con cierre, bolsillo frontal y laterales para botella.\nEspalda y tiras acolchadas, regulables.",
    category: "mochilas",
    price: "38900.00",
    salePrice: "32900.00",
    stock: 4,
    featured: true,
  },
  {
    title: "Mochila con carro 16 pulgadas",
    slug: "mochila-con-carro-16-pulgadas",
    description:
      "Mochila de 16 pulgadas con carro desmontable de aluminio y ruedas silenciosas. Se usa también como mochila común.",
    category: "mochilas",
    price: "52000.00",
    stock: 3,
  },
  {
    title: "Cartuchera tubo de lona",
    slug: "cartuchera-tubo-de-lona",
    description:
      "Cartuchera tipo tubo de lona resistente con cierre metálico. Entra todo lo de la clase: lápices, regla corta y goma.",
    category: "escolar",
    price: "6900.00",
    stock: 20,
    isNew: true,
  },
  {
    title: "Témperas x 6 colores 15 ml",
    slug: "temperas-x-6-colores-15-ml",
    description:
      "Témperas escolares en 6 colores de 15 ml. Lavables, no tóxicas y con buen cubrimiento sobre papel y cartulina.",
    category: "pinturas",
    price: "3500.00",
    stock: 35,
  },
  {
    title: "Acrílicos profesionales x 12",
    slug: "acrilicos-profesionales-x-12",
    description:
      "Set de 12 pinturas acrílicas de 20 ml con alta pigmentación. Secan rápido y quedan resistentes al agua sobre tela, madera o cartón.",
    category: "pinturas",
    price: "16800.00",
    salePrice: "14280.00",
    stock: 9,
    featured: true,
  },
  {
    title: "Acuarelas en pastilla x 24",
    slug: "acuarelas-en-pastilla-x-24",
    description:
      "Estuche de 24 acuarelas en pastilla con pincel incluido. Colores vivos que se activan con poca agua.",
    category: "pinturas",
    price: "9200.00",
    stock: 11,
    isNew: true,
  },
  {
    title: "Set de pinceles sintéticos x 10",
    slug: "set-de-pinceles-sinteticos-x-10",
    description:
      "10 pinceles de pelo sintético, chatos y redondos en distintos tamaños. Sirven para acrílico, témpera y acuarela.",
    category: "pinceles",
    price: "7400.00",
    stock: 14,
  },
  {
    title: "Pincel chato N° 12",
    slug: "pincel-chato-n-12",
    description:
      "Pincel chato N° 12 de pelo sintético con mango largo de madera. Para fondos y superficies grandes.",
    category: "pinceles",
    price: "1600.00",
    stock: 0,
  },
  {
    title: "Block de dibujo N° 5 blanco",
    slug: "block-de-dibujo-n-5-blanco",
    description:
      "Block de dibujo N° 5 con 24 hojas blancas de 120 g. Apto para lápiz, marcadores y témpera.",
    category: "arte-y-dibujo",
    price: "2800.00",
    stock: 50,
  },
  {
    title: "Bastidor entelado 30x40",
    slug: "bastidor-entelado-30x40",
    description:
      "Bastidor de 30 x 40 cm con tela de algodón imprimada, lista para pintar con acrílico u óleo.",
    category: "arte-y-dibujo",
    price: "8900.00",
    stock: 7,
    featured: true,
  },
  {
    title: "Resma A4 75 g 500 hojas",
    slug: "resma-a4-75-g-500-hojas",
    description:
      "Resma de 500 hojas A4 de 75 g, blancas. Para impresora láser, de chorro de tinta y fotocopiadora.",
    category: "papeleria",
    price: "9800.00",
    stock: 45,
  },
  {
    title: "Sobres manila A4 x 10",
    slug: "sobres-manila-a4-x-10",
    description:
      "Paquete de 10 sobres manila tamaño A4 con solapa engomada. Para enviar o guardar documentos sin doblarlos.",
    category: "papeleria",
    price: "2100.00",
    stock: 30,
  },
  {
    title: "Notas adhesivas neón x 400",
    slug: "notas-adhesivas-neon-x-400",
    description:
      "Notas adhesivas de 76 x 76 mm en colores neón, 400 hojas en 5 tacos. Se pegan y despegan sin dejar marcas.",
    category: "papeleria",
    price: "3300.00",
    salePrice: "2640.00",
    stock: 26,
    isNew: true,
  },
  {
    title: "Bibliorato A4 lomo ancho",
    slug: "bibliorato-a4-lomo-ancho",
    description:
      "Bibliorato A4 de lomo ancho con palanca metálica y anillo para descolgar. Capacidad para unas 500 hojas.",
    category: "archivo",
    price: "5200.00",
    stock: 16,
  },
  {
    title: "Carpeta con elástico oficio",
    slug: "carpeta-con-elastico-oficio",
    description:
      "Carpeta de cartón plastificado tamaño oficio con solapas y cierre elástico. Mantiene los papeles juntos y protegidos.",
    category: "archivo",
    price: "2600.00",
    stock: 0,
  },
  {
    title: "Abrochadora metálica 21/6",
    slug: "abrochadora-metalica-21-6",
    description:
      "Abrochadora metálica para broches 21/6, abrocha hasta 20 hojas. Base antideslizante y carga superior.",
    category: "oficina",
    price: "11500.00",
    stock: 5,
  },
  {
    title: "Agenda 2027 semanal tapa dura",
    slug: "agenda-2027-semanal-tapa-dura",
    description:
      "Agenda 2027 con vista semanal, tapa dura y cinta señaladora. Incluye calendarios, planificador mensual y hojas para notas.",
    category: "regaleria",
    price: "15900.00",
    stock: 10,
    featured: true,
    isNew: true,
  },
  {
    title: "Taza de cerámica Mi Sueño",
    slug: "taza-de-ceramica-mi-sueno",
    description:
      "Taza de cerámica de 350 ml con el logo de Librería Mi Sueño. Apta para microondas y lavavajillas.",
    category: "regaleria",
    price: "8500.00",
    stock: 8,
  },
  {
    title: "Set de stickers ilustrados",
    slug: "set-de-stickers-ilustrados",
    description:
      "Set de 60 stickers ilustrados con motivos de lectura y naturaleza. Para decorar cuadernos, agendas y regalos.",
    category: "regaleria",
    price: "2400.00",
    salePrice: "1920.00",
    stock: 40,
  },
];
