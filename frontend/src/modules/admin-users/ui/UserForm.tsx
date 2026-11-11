"use client";

import { FormProvider } from "react-hook-form";

import { useSessionUser } from "@/modules/auth";
import { formatDate } from "@/modules/core/formatters/date-time";
import { cn } from "@/modules/core/lib/utils";
import { ArchivedNotice } from "@/modules/core/ui/ArchivedNotice";
import { FormAlert } from "@/modules/core/ui/FormAlert";
import { FormSaveBar } from "@/modules/core/ui/FormSaveBar";

import { useUserActions } from "../application/useUserActions";
import { useUserForm } from "../application/useUserForm";
import { userFormText } from "../content/users";
import type { AdminUserRow } from "../domain/admin-user";
import { isOwnAccount } from "../domain/own-account";
import { initialValuesOf } from "../domain/user-form";
import { USERS_PATH } from "../domain/users-query";
import { OwnAccountNote } from "./OwnAccountNote";
import { UserDataSection } from "./UserDataSection";
import { UserFormHeader } from "./UserFormHeader";

interface UserFormProps {
  /** The user being edited; absent when creating one. */
  user?: AdminUserRow;
}

/** The form to create a user or edit one, with what it has on screen and what it sends. */
export const UserForm = ({ user }: UserFormProps) => {
  const { form, submit, general, isSaving, canSave, changed } = useUserForm(
    user ? { mode: "edit", userId: user.id, initial: initialValuesOf(user) } : { mode: "create" },
  );
  const { restore, isPending } = useUserActions();
  const sessionUser = useSessionUser();
  const { deleted, saveBar } = userFormText;
  const deletedAt = user?.deletedAt ?? undefined;
  const editing = user !== undefined;
  const own = editing && isOwnAccount(sessionUser?.id, user.id);

  let message: string = saveBar.create;
  if (editing) {
    message = changed ? saveBar.dirty : saveBar.clean;
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="flex max-w-3xl flex-col gap-6">
        <UserFormHeader user={user} own={own} />
        {user && deletedAt && (
          <ArchivedNotice
            message={deleted.notice(formatDate(deletedAt))}
            actionLabel={deleted.restore}
            pending={isPending(user.id)}
            onAction={() => void restore(user.id)}
          />
        )}
        {own && !deletedAt && <OwnAccountNote />}
        <FormAlert message={general} />
        <div
          inert={Boolean(deletedAt)}
          className={cn("flex flex-col gap-5", deletedAt && "opacity-75")}
        >
          <UserDataSection mode={editing ? "edit" : "create"} own={own} />
        </div>
        {!deletedAt && (
          <FormSaveBar
            message={message}
            changed={changed}
            canSave={canSave}
            saving={isSaving}
            submitLabel={editing ? saveBar.saveLabel : saveBar.createLabel}
            savingLabel={saveBar.saving}
            cancelLabel={saveBar.cancel}
            leaveHref={USERS_PATH}
            leave={saveBar.leave}
          />
        )}
      </form>
    </FormProvider>
  );
};
