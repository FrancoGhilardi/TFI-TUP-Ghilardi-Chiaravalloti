import { useFormContext } from "react-hook-form";

import { TextField } from "@/modules/core/ui/TextField";

import { useObjectUrl } from "../application/useObjectUrl";
import { productImagesText } from "../content/product-form";
import type { ProductFormValues } from "../domain/product-form";
import { ImagePreview } from "./ImagePreview";
import { ImageRowButtons } from "./ImageRowButtons";
import { SortableImageRow } from "./SortableImageRow";

interface NewImageRowProps {
  /** Place in the list of images to upload. */
  index: number;
  total: number;
  /** Identifies the row while it is dragged. */
  id: string;
  file: File;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

/** One image picked to be uploaded with the product: a preview, its alternative text and its place. */
export const NewImageRow = ({ index, total, id, file, onMove, onRemove }: NewImageRowProps) => {
  const { register, formState } = useFormContext<ProductFormValues>();
  const preview = useObjectUrl(file);
  const { cover, position, alt } = productImagesText;
  const error = formState.errors.images?.[index]?.altText?.message;

  return (
    <SortableImageRow id={id} name={file.name}>
      <div className="relative">
        <ImagePreview url={preview} />
        <span className="absolute top-1 left-1 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold text-white">
          {index === 0 ? cover : position(index + 1)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-2 truncate text-sm font-semibold">{file.name}</p>
        <TextField
          id={`new-image-alt-${id}`}
          label={`${alt.label} ${alt.note}`}
          placeholder={alt.placeholder}
          error={error}
          {...register(`images.${index}.altText`)}
        />
      </div>
      <ImageRowButtons
        name={file.name}
        isFirst={index === 0}
        isLast={index === total - 1}
        onUp={() => onMove(index, index - 1)}
        onDown={() => onMove(index, index + 1)}
        onRemove={() => onRemove(index)}
      />
    </SortableImageRow>
  );
};
