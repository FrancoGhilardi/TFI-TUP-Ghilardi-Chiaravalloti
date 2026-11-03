import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, useState } from "react";

import { TextField } from "@/modules/core/ui/TextField";

import { authContent } from "../content/auth";

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, "type" | "trailing">;

/** A password field with a button to see what was typed. */
export const PasswordField = (props: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  const { show, hide } = authContent.login.password;

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          aria-label={visible ? hide : show}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
          className="grid size-9 place-items-center rounded-full text-ink-soft transition-colors outline-none hover:bg-wheat hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Icon className="size-[18px]" aria-hidden="true" />
        </button>
      }
    />
  );
};
