/**
 * The width of a product's gallery: the 4:5 photo never grows taller than most of the screen,
 * so on a phone it is seen whole instead of running past the bottom. Shared with the skeleton,
 * which renders on the server and cannot take it from the gallery, a client component.
 */
export const GALLERY_WIDTH = "mx-auto w-full max-w-[min(20rem,50svh)] nav:max-w-[min(32rem,68svh)]";
