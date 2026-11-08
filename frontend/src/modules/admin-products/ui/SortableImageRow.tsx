import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/modules/core/lib/utils";

import { productImagesText } from "../content/product-form";

interface SortableImageRowProps {
  id: string;
  /** What the image is called, for the handle that drags it. */
  name: string;
  /** The row cannot be dragged for now. */
  disabled?: boolean;
  children: ReactNode;
}

/** A row of a `SortableImageList`, with the handle to drag it. */
export const SortableImageRow = ({ id, name, disabled, children }: SortableImageRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-3 rounded-xl border border-line-soft bg-surface p-3",
        isDragging && "relative z-10 shadow-raised",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={productImagesText.drag(name)}
        disabled={disabled}
        className="mt-1 grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-full text-ink-soft outline-none hover:bg-wheat focus-visible:ring-3 focus-visible:ring-ring/40"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      {children}
    </li>
  );
};
