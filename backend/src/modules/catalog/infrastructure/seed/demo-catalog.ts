/**
 * Sample catalog for local development: a category tree three levels deep and enough products
 * to fill more than one page of the store, with featured, new, discounted and out-of-stock ones.
 */

export interface DemoCategory {
  slug: string;
  name: string;
  children?: DemoCategory[];
}

export interface DemoProduct {
  title: string;
  slug: string;
  /** Slug of the category the product belongs to, its primary one. */
  category: string;
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
    category: "cuadernos",
    price: "3200.00",
    stock: 40,
    featured: true,
  },
  {
    title: "Cuaderno universitario A4 cuadriculado",
    slug: "cuaderno-universitario-a4-cuadriculado",
    category: "cuadernos",
    price: "5400.00",
    salePrice: "4590.00",
    stock: 25,
  },
  {
    title: "Cuaderno tapa dura 16x21 lunares",
    slug: "cuaderno-tapa-dura-16x21-lunares",
    category: "cuadernos",
    price: "4100.00",
    stock: 12,
    isNew: true,
  },
  {
    title: "Repuesto Gloria 96 hojas",
    slug: "repuesto-gloria-96-hojas",
    category: "cuadernos",
    price: "2900.00",
    stock: 0,
  },
  {
    title: "Cuaderno espiralado A5 con separadores",
    slug: "cuaderno-espiralado-a5-con-separadores",
    category: "cuadernos",
    price: "6200.00",
    stock: 8,
  },
  {
    title: "Lápices de colores Faber-Castell x 12",
    slug: "lapices-de-colores-faber-castell-x-12",
    category: "lapices-de-colores",
    price: "7800.00",
    salePrice: "6630.00",
    stock: 30,
    featured: true,
  },
  {
    title: "Lápices de colores acuarelables x 24",
    slug: "lapices-de-colores-acuarelables-x-24",
    category: "lapices-de-colores",
    price: "14500.00",
    stock: 6,
    isNew: true,
  },
  {
    title: "Lápices pastel x 12 tamaño corto",
    slug: "lapices-pastel-x-12-tamano-corto",
    category: "lapices-de-colores",
    price: "3900.00",
    stock: 18,
  },
  {
    title: "Lápiz negro HB con goma",
    slug: "lapiz-negro-hb-con-goma",
    category: "lapices-y-lapiceras",
    price: "450.00",
    stock: 200,
  },
  {
    title: "Portaminas 0.5 mm con minas",
    slug: "portaminas-0-5-mm-con-minas",
    category: "lapices-y-lapiceras",
    price: "2300.00",
    stock: 22,
  },
  {
    title: "Lapicera Bic azul x 4",
    slug: "lapicera-bic-azul-x-4",
    category: "lapiceras",
    price: "1900.00",
    stock: 60,
    featured: true,
  },
  {
    title: "Lapicera de gel glitter x 6",
    slug: "lapicera-de-gel-glitter-x-6",
    category: "lapiceras",
    price: "4800.00",
    salePrice: "3840.00",
    stock: 15,
    isNew: true,
  },
  {
    title: "Resaltadores pastel x 6",
    slug: "resaltadores-pastel-x-6",
    category: "lapiceras",
    price: "5600.00",
    stock: 0,
    isNew: true,
  },
  {
    title: "Mochila escolar 18 pulgadas floreada",
    slug: "mochila-escolar-18-pulgadas-floreada",
    category: "mochilas",
    price: "38900.00",
    salePrice: "32900.00",
    stock: 4,
    featured: true,
  },
  {
    title: "Mochila con carro 16 pulgadas",
    slug: "mochila-con-carro-16-pulgadas",
    category: "mochilas",
    price: "52000.00",
    stock: 3,
  },
  {
    title: "Cartuchera tubo de lona",
    slug: "cartuchera-tubo-de-lona",
    category: "escolar",
    price: "6900.00",
    stock: 20,
    isNew: true,
  },
  {
    title: "Témperas x 6 colores 15 ml",
    slug: "temperas-x-6-colores-15-ml",
    category: "pinturas",
    price: "3500.00",
    stock: 35,
  },
  {
    title: "Acrílicos profesionales x 12",
    slug: "acrilicos-profesionales-x-12",
    category: "pinturas",
    price: "16800.00",
    salePrice: "14280.00",
    stock: 9,
    featured: true,
  },
  {
    title: "Acuarelas en pastilla x 24",
    slug: "acuarelas-en-pastilla-x-24",
    category: "pinturas",
    price: "9200.00",
    stock: 11,
    isNew: true,
  },
  {
    title: "Set de pinceles sintéticos x 10",
    slug: "set-de-pinceles-sinteticos-x-10",
    category: "pinceles",
    price: "7400.00",
    stock: 14,
  },
  {
    title: "Pincel chato N° 12",
    slug: "pincel-chato-n-12",
    category: "pinceles",
    price: "1600.00",
    stock: 0,
  },
  {
    title: "Block de dibujo N° 5 blanco",
    slug: "block-de-dibujo-n-5-blanco",
    category: "arte-y-dibujo",
    price: "2800.00",
    stock: 50,
  },
  {
    title: "Bastidor entelado 30x40",
    slug: "bastidor-entelado-30x40",
    category: "arte-y-dibujo",
    price: "8900.00",
    stock: 7,
    featured: true,
  },
  {
    title: "Resma A4 75 g 500 hojas",
    slug: "resma-a4-75-g-500-hojas",
    category: "papeleria",
    price: "9800.00",
    stock: 45,
  },
  {
    title: "Sobres manila A4 x 10",
    slug: "sobres-manila-a4-x-10",
    category: "papeleria",
    price: "2100.00",
    stock: 30,
  },
  {
    title: "Notas adhesivas neón x 400",
    slug: "notas-adhesivas-neon-x-400",
    category: "papeleria",
    price: "3300.00",
    salePrice: "2640.00",
    stock: 26,
    isNew: true,
  },
  {
    title: "Bibliorato A4 lomo ancho",
    slug: "bibliorato-a4-lomo-ancho",
    category: "archivo",
    price: "5200.00",
    stock: 16,
  },
  {
    title: "Carpeta con elástico oficio",
    slug: "carpeta-con-elastico-oficio",
    category: "archivo",
    price: "2600.00",
    stock: 0,
  },
  {
    title: "Abrochadora metálica 21/6",
    slug: "abrochadora-metalica-21-6",
    category: "oficina",
    price: "11500.00",
    stock: 5,
  },
  {
    title: "Agenda 2027 semanal tapa dura",
    slug: "agenda-2027-semanal-tapa-dura",
    category: "regaleria",
    price: "15900.00",
    stock: 10,
    featured: true,
    isNew: true,
  },
  {
    title: "Taza de cerámica Mi Sueño",
    slug: "taza-de-ceramica-mi-sueno",
    category: "regaleria",
    price: "8500.00",
    stock: 8,
  },
  {
    title: "Set de stickers ilustrados",
    slug: "set-de-stickers-ilustrados",
    category: "regaleria",
    price: "2400.00",
    salePrice: "1920.00",
    stock: 40,
  },
];
