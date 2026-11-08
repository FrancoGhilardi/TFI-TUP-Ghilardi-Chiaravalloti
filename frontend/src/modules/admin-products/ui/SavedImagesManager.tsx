import { ImagePlus } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";

import { Button } from "@/modules/core/ui/primitives/button";

import { useImageActions } from "../application/useImageActions";
import { useProductImages } from "../application/useProductImages";
import { productImagesText, savedImagesText } from "../content/product-form";
import { checkImageFile, IMAGE_TYPES, MAX_IMAGES, moveItem } from "../domain/image-rules";
import { SavedImageRow } from "./SavedImageRow";
import { SortableImageList } from "./SortableImageList";

interface SavedImagesManagerProps {
  productId: string;
}

/** The saved images of a product: each action is sent at once, apart from saving the form. */
export const SavedImagesManager = ({ productId }: SavedImagesManagerProps) => {
  const images = useProductImages(productId);
  const actions = useImageActions(productId);
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string>();
  const { add, list, problems } = productImagesText;

  if (images.isPending) {
    return <p className="text-sm text-ink-soft">{savedImagesText.loading}</p>;
  }
  if (!images.data) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
        <span>{savedImagesText.failed}</span>
        <Button type="button" size="sm" variant="outline" onClick={() => void images.refetch()}>
          {savedImagesText.retryLoad}
        </Button>
      </div>
    );
  }

  const saved = images.data;
  const ids = saved.map(({ id }) => id);
  const setBusy = actions.isPending("");

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const check = checkImageFile(file);
    setProblem(check.ok ? undefined : problems[check.reason](file.name));
    if (check.ok) {
      void actions.add(file, "");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={pick}
        />
        <Button
          type="button"
          variant="outline"
          disabled={saved.length >= MAX_IMAGES || setBusy}
          onClick={() => input.current?.click()}
        >
          <ImagePlus aria-hidden="true" />
          {add}
        </Button>
      </div>
      {problem && (
        <p role="alert" className="text-sm font-semibold text-coral-strong">
          {problem}
        </p>
      )}
      <SortableImageList
        ids={ids}
        label={list}
        nameOf={(id) => savedImagesText.name(ids.indexOf(id) + 1)}
        onMove={(from, to) => void actions.reorder(moveItem(ids, from, to))}
      >
        {saved.map((image, index) => (
          <SavedImageRow
            key={image.id}
            image={image}
            index={index}
            total={saved.length}
            busy={setBusy || actions.isPending(image.id)}
            locked={actions.isBusy}
            onMove={(from, to) => void actions.reorder(moveItem(ids, from, to))}
            onRemove={(id) => void actions.remove(id)}
            onRetry={(id) => void actions.retry(id)}
            onReplace={(id, file) => void actions.replace(id, file)}
            onAltText={(id, text) => void actions.changeAltText(id, text)}
          />
        ))}
      </SortableImageList>
    </div>
  );
};
