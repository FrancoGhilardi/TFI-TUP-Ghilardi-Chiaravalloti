import type { ReactNode } from "react";

interface SearchResultGroupProps {
  title: string;
  children: ReactNode;
}

/** A titled list of suggestions; each child is one `li`. */
export const SearchResultGroup = ({ title, children }: SearchResultGroupProps) => {
  return (
    <section>
      <h3 className="px-3 pb-1 text-[0.72rem] font-bold tracking-[0.16em] text-ink-soft uppercase">
        {title}
      </h3>
      <ul>{children}</ul>
    </section>
  );
};
