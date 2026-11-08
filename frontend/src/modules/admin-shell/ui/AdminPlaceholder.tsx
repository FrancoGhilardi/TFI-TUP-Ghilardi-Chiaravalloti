"use client";

import { useSessionUser } from "@/modules/auth";

interface AdminPlaceholderProps {
  title: string;
}

/** Stands in for a panel screen that is not built yet; it only says who is signed in. */
export const AdminPlaceholder = ({ title }: AdminPlaceholderProps) => {
  const user = useSessionUser();
  return (
    <section className="flex max-w-xl flex-col gap-3">
      <h1 className="text-section font-semibold">{title}</h1>
      <p className="text-ink-soft">
        {user ? `Sesión iniciada como ${user.name} (${user.role}).` : "No hay una sesión iniciada."}
      </p>
    </section>
  );
};
