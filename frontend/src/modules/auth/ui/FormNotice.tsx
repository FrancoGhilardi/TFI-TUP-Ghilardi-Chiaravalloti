import { CircleCheck } from "lucide-react";

interface FormNoticeProps {
  /** What went well, or `null` while there is nothing to tell. */
  message: string | null;
}

/** The notice of a submit that worked. Stays mounted, like `FormAlert`, so it is announced. */
export const FormNotice = ({ message }: FormNoticeProps) => {
  return (
    <div role="status" className="empty:hidden">
      {message && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-teal-soft px-3.5 py-3 text-sm text-ink">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-teal-deep" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
};
