import { useState } from "react";

import { TextField } from "@/modules/core/ui/TextField";
import { Button } from "@/modules/core/ui/primitives/button";

import { productFormErrors, productImagesText, savedImagesText } from "../content/product-form";
import { MAX_ALT_TEXT_LENGTH } from "../domain/image-rules";

interface AltTextEditorProps {
  id: string;
  /** The text the image has saved. */
  saved: string;
  disabled: boolean;
  onSave: (text: string) => void;
}

/** The alternative text of a saved image, which is saved on its own with its button. */
export const AltTextEditor = ({ id, saved, disabled, onSave }: AltTextEditorProps) => {
  const [text, setText] = useState(saved);
  const [seen, setSeen] = useState(saved);
  // The saved text changed (it was saved, or read again): the field shows it.
  if (saved !== seen) {
    setSeen(saved);
    setText(saved);
  }
  const { alt } = productImagesText;
  const changed = text.trim() !== saved.trim();
  const tooLong = [...text.trim()].length > MAX_ALT_TEXT_LENGTH;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-48 flex-1">
        <TextField
          id={id}
          label={`${alt.label} ${alt.note}`}
          placeholder={alt.placeholder}
          value={text}
          error={tooLong ? productFormErrors.altText : undefined}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter saves this text; it must not submit the product's form around it.
            if (event.key === "Enter") {
              event.preventDefault();
              if (changed && !tooLong && !disabled) {
                onSave(text);
              }
            }
          }}
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || !changed || tooLong}
        onClick={() => onSave(text)}
      >
        {savedImagesText.saveAlt}
      </Button>
    </div>
  );
};
