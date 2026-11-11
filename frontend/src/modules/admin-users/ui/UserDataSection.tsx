import { Controller, useFormContext } from "react-hook-form";

import { FormSection } from "@/modules/core/ui/FormSection";
import { SelectField } from "@/modules/core/ui/SelectField";
import { StateRadioField } from "@/modules/core/ui/StateRadioField";
import { TextField } from "@/modules/core/ui/TextField";

import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  ownAccountReasons,
  PASSWORD_MAX_LENGTH,
  roleLabels,
  userFormText,
} from "../content/users";
import type { UserFormMode, UserFormValues } from "../domain/user-form";

interface UserDataSectionProps {
  mode: UserFormMode;
  /** The user is the one signed in: their role and state cannot be changed. */
  own: boolean;
}

export const UserDataSection = ({ mode, own }: UserDataSectionProps) => {
  const { control, register, formState } = useFormContext<UserFormValues>();
  const { errors } = formState;
  const { sections, fields, state } = userFormText;
  const creating = mode === "create";

  return (
    <>
      <FormSection title={sections.data}>
        <TextField
          id="user-name"
          label={fields.name.label}
          placeholder={fields.name.placeholder}
          autoComplete="off"
          maxLength={NAME_MAX_LENGTH * 2}
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          id="user-email"
          type="email"
          label={fields.email.label}
          placeholder={fields.email.placeholder}
          hint={fields.email.hint}
          autoComplete="off"
          maxLength={EMAIL_MAX_LENGTH}
          error={errors.email?.message}
          {...register("email")}
        />
      </FormSection>
      <FormSection title={sections.access}>
        <SelectField
          id="user-role"
          label={fields.role.label}
          options={[
            ...(creating ? [{ value: "", label: fields.role.choose }] : []),
            { value: "ADMIN", label: roleLabels.ADMIN },
            { value: "SELLER", label: roleLabels.SELLER },
          ]}
          disabled={own}
          hint={own ? ownAccountReasons.role : fields.role.hint}
          error={errors.role?.message}
          {...register("role")}
        />
        {creating ? (
          <>
            <TextField
              id="user-password"
              type="password"
              label={fields.temporaryPassword.label}
              hint={fields.temporaryPassword.hint}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH * 4}
              error={errors.temporaryPassword?.message}
              {...register("temporaryPassword")}
            />
            <TextField
              id="user-password-confirmation"
              type="password"
              label={fields.passwordConfirmation.label}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH * 4}
              error={errors.passwordConfirmation?.message}
              {...register("passwordConfirmation")}
            />
          </>
        ) : (
          <>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <StateRadioField
                  id="user-state"
                  label={state.label}
                  activeLabel={state.active}
                  inactiveLabel={state.inactive}
                  hint={own ? ownAccountReasons.state : state.hint}
                  active={field.value}
                  onChange={field.onChange}
                  disabled={own}
                />
              )}
            />
            {errors.isActive?.message && (
              <p className="text-sm font-semibold text-coral-strong">{errors.isActive.message}</p>
            )}
          </>
        )}
      </FormSection>
    </>
  );
};
