import type { ReactNode } from "react";

interface FooterColumnProps {
  title: string;
  /** One entry per row: a link or plain text. */
  items: ReactNode[];
}

export const FooterColumn = ({ title, items }: FooterColumnProps) => {
  return (
    <section aria-label={title}>
      <h2 className="mb-3.5 font-sans text-[0.76rem] font-bold tracking-[0.13em] text-white uppercase">
        {title}
      </h2>
      <ul className="flex flex-col gap-2.5 text-[0.92rem]">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
};
