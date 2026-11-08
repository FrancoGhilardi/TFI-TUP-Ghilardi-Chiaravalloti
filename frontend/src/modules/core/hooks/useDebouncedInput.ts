import { useEffect, useRef, useState } from "react";

import { useDebouncedValue } from "./useDebouncedValue";

/**
 * Text typed in a field whose value lives somewhere else (such as the address of the page): it
 * follows that value when it changes by other means, and reports what was typed, trimmed, once the
 * typing pauses for `delayMs`. Nothing is reported while the text already is the value, and a text
 * is reported once even if the value never takes it (because the receiver turns it into another
 * one or refuses it).
 */
export function useDebouncedInput(
  value: string,
  onCommit: (text: string) => void,
  delayMs: number,
): [text: string, setText: (text: string) => void] {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  // The value changed on its own (a filter was cleared, the person went back): the field follows.
  if (value !== seen) {
    setSeen(value);
    if (value !== text.trim()) {
      setText(value);
    }
  }

  const settled = useDebouncedValue(text, delayMs) === text;
  const typed = text.trim();
  const reported = useRef(value);
  useEffect(() => {
    reported.current = value;
  }, [value]);
  useEffect(() => {
    if (settled && typed !== value && typed !== reported.current) {
      reported.current = typed;
      onCommit(typed);
    }
  }, [settled, typed, value, onCommit]);

  return [text, setText];
}
