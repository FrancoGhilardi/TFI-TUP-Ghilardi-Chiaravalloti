import { CircleAlert } from "lucide-react";

import { cn } from "@/modules/core/lib/utils";
import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

interface LoadErrorStateProps {
  title: string;
  text: string;
  retry: string;
  onRetry: () => void;
  /** Room around it, when it sits inside a card. */
  framed?: boolean;
}

/** In place of what could not be read, with a way to ask again. */
export const LoadErrorState = ({ title, text, retry, onRetry, framed }: LoadErrorStateProps) => {
  return (
    <div className={cn(framed && "p-4")}>
      <StatusMessage
        icon={CircleAlert}
        role="alert"
        title={title}
        description={text}
        actions={
          <Button type="button" variant="outline" onClick={onRetry}>
            {retry}
          </Button>
        }
      />
    </div>
  );
};
