import type { ReactNode } from "react";

interface ScriptWordProps {
  children: ReactNode;
}

/** The word of a heading set in the store's handwritten script, larger and in coral. */
export const ScriptWord = ({ children }: ScriptWordProps) => {
  return (
    <span className="inline-block font-script text-[1.15em] leading-[0.8] font-normal text-coral">
      {children}
    </span>
  );
};
