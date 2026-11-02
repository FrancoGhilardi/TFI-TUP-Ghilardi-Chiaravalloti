import type { ComponentProps } from "react";

type ExternalLinkProps = Omit<ComponentProps<"a">, "target" | "rel">;

/** Link to another site, opened in a new tab without giving that site access to this page. */
export const ExternalLink = (props: ExternalLinkProps) => {
  return <a target="_blank" rel="noopener noreferrer" {...props} />;
};
