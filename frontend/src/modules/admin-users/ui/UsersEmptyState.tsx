import { Users } from "lucide-react";
import Link from "next/link";

import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

import { usersContent } from "../content/users";
import { USERS_PATH } from "../domain/users-query";

interface UsersEmptyStateProps {
  /** Something narrows the list, so a different search or no filters may bring users. */
  filtered: boolean;
  onClear: () => void;
}

export const UsersEmptyState = ({ filtered, onClear }: UsersEmptyStateProps) => {
  const { empty, clear, newUser } = usersContent;
  return (
    <div className="p-4">
      <StatusMessage
        icon={Users}
        title={filtered ? empty.filteredTitle : empty.noneTitle}
        description={filtered ? empty.filteredText : empty.noneText}
        actions={
          filtered ? (
            <Button type="button" variant="outline" onClick={onClear}>
              {clear}
            </Button>
          ) : (
            <Button asChild>
              <Link href={`${USERS_PATH}/nuevo`}>{newUser}</Link>
            </Button>
          )
        }
      />
    </div>
  );
};
