const ROWS = 8;

/** Grey rows where the table will be, so the page does not jump when it loads. */
export const ProductsSkeleton = () => {
  return (
    <ul aria-busy="true" aria-label="Cargando productos" className="flex flex-col gap-3 p-4">
      {Array.from({ length: ROWS }, (_, index) => (
        <li key={index} className="h-14 animate-pulse rounded-xl bg-wheat" />
      ))}
    </ul>
  );
};
