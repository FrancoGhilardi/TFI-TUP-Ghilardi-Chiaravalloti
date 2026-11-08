import { ImageUp } from "lucide-react";
import { type ChangeEvent, useId, useRef, useState } from "react";

import { Button } from "@/modules/core/ui/primitives/button";

import { productImagesText, savedImagesText } from "../content/product-form";
import type { AdminProductImage } from "../domain/admin-product";
import { checkImageFile, IMAGE_TYPES } from "../domain/image-rules";
import { AltTextEditor } from "./AltTextEditor";
import { ImagePreview } from "./ImagePreview";
import { ImageRowButtons } from "./ImageRowButtons";
import { ImageStatusOverlay } from "./ImageStatusOverlay";
import { SortableImageRow } from "./SortableImageRow";

interface SavedImageRowProps {
  image: AdminProductImage;
  index: number;
  total: number;
  /** Something is being asked of this image, or of the whole set. */
  busy: boolean;
  /** Something is being asked of any image: the order is not safe to change now. */
  locked: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  onAltText: (id: string, text: string) => void;
}

/** An image already saved in the product, with the actions that apply to it at once. */
export const SavedImageRow = ({
  image,
  index,
  total,
  busy,
  locked,
  onMove,
  onRemove,
  onRetry,
  onReplace,
  onAltText,
}: SavedImageRowProps) => {
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [problem, setProblem] = useState<string>();
  const { cover, position, problems } = productImagesText;
  const name = savedImagesText.name(index + 1);

  const replace = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const check = checkImageFile(file);
    setProblem(check.ok ? undefined : problems[check.reason](file.name));
    if (check.ok) {
      onReplace(image.id, file);
    }
  };

  return (
    <SortableImageRow id={image.id} name={name} disabled={locked}>
      <div className="relative">
        <ImagePreview url={image.previewUrl} />
        <span className="absolute top-1 left-1 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold text-white">
          {index === 0 ? cover : position(index + 1)}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ImageStatusOverlay status={image.status} busy={busy} onRetry={() => onRetry(image.id)} />
          <input
            ref={input}
            id={inputId}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={replace}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            aria-label={savedImagesText.replace(name)}
            onClick={() => input.current?.click()}
          >
            <ImageUp aria-hidden="true" />
            {savedImagesText.replaceLabel}
          </Button>
        </div>
        {problem && (
          <p role="alert" className="text-sm font-semibold text-coral-strong">
            {problem}
          </p>
        )}
        <AltTextEditor
          id={`saved-image-alt-${image.id}`}
          saved={image.altText ?? ""}
          disabled={busy}
          onSave={(text) => onAltText(image.id, text)}
        />
        {total === 1 && <p className="text-sm text-ink-soft">{savedImagesText.onlyOne}</p>}
      </div>
      <ImageRowButtons
        name={name}
        isFirst={index === 0}
        isLast={index === total - 1}
        disabled={busy}
        movesDisabled={locked}
        removeDisabled={total === 1}
        onUp={() => onMove(index, index - 1)}
        onDown={() => onMove(index, index + 1)}
        onRemove={() => onRemove(image.id)}
        confirmRemove={{
          title: savedImagesText.confirmRemove.title(name),
          description: savedImagesText.confirmRemove.description,
          confirm: savedImagesText.confirmRemove.confirm,
        }}
      />
    </SortableImageRow>
  );
};
