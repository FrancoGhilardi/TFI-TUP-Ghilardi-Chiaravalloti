interface SkipLinkProps {
  /** Id of the main content element, which must be focusable (`tabIndex={-1}`). */
  targetId: string;
}

/** First stop for keyboard users: jumps over the header straight to the page content. */
export const SkipLink = ({ targetId }: SkipLinkProps) => {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only rounded-full bg-teal px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100"
    >
      Saltar al contenido
    </a>
  );
};
