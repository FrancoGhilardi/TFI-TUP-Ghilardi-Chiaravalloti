interface FieldErrorProps {
  id: string;
  message: string | undefined;
}

/** The message of a field that has no input of its own to carry it; announced when it shows up. */
export const FieldError = ({ id, message }: FieldErrorProps) => {
  return (
    <div id={id} role="alert" className="empty:hidden">
      {message && <p className="text-sm font-semibold text-coral-strong">{message}</p>}
    </div>
  );
};
