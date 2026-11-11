"use client";

import { UserRound } from "lucide-react";

import { ApiError } from "@/modules/core/http";
import { FormSkeleton } from "@/modules/core/ui/FormSkeleton";
import { LoadErrorState } from "@/modules/core/ui/LoadErrorState";
import { NotFoundState } from "@/modules/core/ui/NotFoundState";

import { useUser } from "../application/useUser";
import { userFormText } from "../content/users";
import { USERS_PATH } from "../domain/users-query";
import { UserForm } from "./UserForm";

interface EditUserPageProps {
  id: string;
}

/** The screen to edit a user: it loads it first, and says so if it is missing or fails. */
export const EditUserPage = ({ id }: EditUserPageProps) => {
  const { data, isPending, error, refetch } = useUser(id);

  if (isPending) {
    return <FormSkeleton label={userFormText.loading} />;
  }
  if (!data) {
    return error instanceof ApiError && error.status === 404 ? (
      <NotFoundState {...userFormText.notFound} href={USERS_PATH} icon={UserRound} />
    ) : (
      <LoadErrorState {...userFormText.loadError} onRetry={() => void refetch()} />
    );
  }
  // Remounted when the user is deleted or restored, so the form starts from what is saved; any
  // other refresh must not throw away what the person has typed.
  const version = `${data.id}-${data.deletedAt?.getTime() ?? 0}`;
  return <UserForm key={version} user={data} />;
};
