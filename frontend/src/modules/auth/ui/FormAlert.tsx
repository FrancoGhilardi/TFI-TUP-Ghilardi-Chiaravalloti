import { CircleAlert } from "lucide-react";

interface FormAlertProps {
  /** What went wrong, or `null` while nothing did. */
  message: string | null;
}

/** The notice of a failed submit. The alert stays mounted so that a message that shows up is announced. */
export const FormAlert = ({ message }: FormAlertProps) => {
  return (
    <div role="alert" className="empty:hidden">
      {message && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-coral-soft px-3.5 py-3 text-sm text-ink">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-coral-strong" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
};
