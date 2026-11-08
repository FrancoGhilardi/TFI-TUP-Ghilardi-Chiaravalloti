import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { ReactNode } from "react";

import { productImagesText } from "../content/product-form";
import { dropMove } from "../domain/image-rules";

interface SortableImageListProps {
  /** The ids of the rows, in the order they are shown. */
  ids: string[];
  label: string;
  /** Where each id is called in the announcements. */
  nameOf: (id: string) => string;
  /** An image was dropped in another place. */
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}

/** A list whose rows can be dragged with the pointer or with the keyboard, announced in Spanish. */
export const SortableImageList = ({
  ids,
  label,
  nameOf,
  onMove,
  children,
}: SortableImageListProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const { announcements } = productImagesText;
  const positionOf = (id: string | number | undefined) => ids.indexOf(String(id)) + 1;

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const move = dropMove(ids, String(active.id), over ? String(over.id) : undefined);
    if (move) {
      onMove(move.from, move.to);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: announcements.instructions },
        announcements: {
          onDragStart: ({ active }) => announcements.picked(nameOf(String(active.id))),
          onDragOver: ({ active, over }) =>
            announcements.over(nameOf(String(active.id)), positionOf(over?.id ?? active.id)),
          onDragEnd: ({ active, over }) =>
            announcements.dropped(nameOf(String(active.id)), positionOf(over?.id ?? active.id)),
          onDragCancel: ({ active }) => announcements.cancelled(nameOf(String(active.id))),
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol aria-label={label} className="flex flex-col gap-3">
          {children}
        </ol>
      </SortableContext>
    </DndContext>
  );
};
