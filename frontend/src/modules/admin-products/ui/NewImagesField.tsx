import { ImagePlus } from "lucide-react";
import { type ChangeEvent, useId, useRef, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Button } from "@/modules/core/ui/primitives/button";

import { productImagesText } from "../content/product-form";
import { checkImageFile, IMAGE_TYPES, MAX_IMAGES } from "../domain/image-rules";
import type { ProductFormValues } from "../domain/product-form";
import { FieldError } from "./FieldError";
import { NewImageRow } from "./NewImageRow";
import { SortableImageList } from "./SortableImageList";

const ERROR_ID = "product-images-error";

/** Picks the images to upload with a new product, checks them, and lets them be ordered. */
export const NewImagesField = () => {
  const { control, formState, trigger } = useFormContext<ProductFormValues>();
  const { fields, append, move, remove } = useFieldArray({
    control,
    name: "images",
    keyName: "id",
  });
  const [problems, setProblems] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const { add, list, none, problems: messages } = productImagesText;

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    const found: string[] = [];
    const accepted: File[] = [];
    for (const file of files) {
      const check = checkImageFile(file);
      if (!check.ok) {
        found.push(messages[check.reason](file.name));
      } else {
        accepted.push(file);
      }
    }
    const room = MAX_IMAGES - fields.length;
    if (accepted.length > room) {
      found.push(messages.tooMany(MAX_IMAGES));
    }
    append(
      accepted
        .slice(0, Math.max(room, 0))
        .map((file) => ({ key: crypto.randomUUID(), file, altText: "" })),
      { shouldFocus: false },
    );
    setProblems(found);
    void trigger("images");
  };

  const error = formState.errors.images;
  const message = error?.message ?? error?.root?.message;
  const names = new Map(fields.map((field) => [field.id, field.file.name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={pick}
          aria-describedby={message ? ERROR_ID : undefined}
        />
        <Button
          type="button"
          variant="outline"
          disabled={fields.length >= MAX_IMAGES}
          onClick={() => input.current?.click()}
        >
          <ImagePlus aria-hidden="true" />
          {add}
        </Button>
      </div>
      {problems.length > 0 && (
        <ul role="alert" className="list-disc pl-5 text-sm text-coral-strong">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {fields.length === 0 ? (
        <p className="text-sm text-ink-soft">{none}</p>
      ) : (
        <SortableImageList
          ids={fields.map(({ id }) => id)}
          label={list}
          nameOf={(id) => names.get(id) ?? id}
          onMove={move}
        >
          {fields.map((field, index) => (
            <NewImageRow
              key={field.id}
              id={field.id}
              index={index}
              total={fields.length}
              file={field.file}
              onMove={move}
              onRemove={remove}
            />
          ))}
        </SortableImageList>
      )}
      <FieldError id={ERROR_ID} message={message} />
    </div>
  );
};
