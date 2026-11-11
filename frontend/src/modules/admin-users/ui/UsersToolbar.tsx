import { Button } from "@/modules/core/ui/primitives/button";
import { FilterSelect } from "@/modules/core/ui/FilterSelect";
import { SearchField } from "@/modules/core/ui/SearchField";

import { usersContent } from "../content/users";
import {
  clearedFilters,
  isFiltered,
  SEARCH_MAX_LENGTH,
  USER_ROLE_FILTERS,
  USER_STATES,
  type UsersQuery,
} from "../domain/users-query";

interface UsersToolbarProps {
  query: UsersQuery;
  go: (changes: Partial<UsersQuery>, options?: { replace?: boolean }) => void;
}

export const UsersToolbar = ({ query, go }: UsersToolbarProps) => {
  const { search, role, state, clear } = usersContent;

  return (
    <div className="flex flex-col gap-3 border-b border-line-soft p-4">
      <div className="flex flex-wrap gap-3">
        <SearchField
          id="users-search"
          label={search.label}
          placeholder={search.placeholder}
          maxLength={SEARCH_MAX_LENGTH}
          value={query.q ?? ""}
          onSearch={(text) => go({ q: text || undefined }, { replace: true })}
        />
        <FilterSelect
          id="users-role"
          label={role.label}
          value={query.role ?? ""}
          options={[
            { value: "", label: role.any },
            ...USER_ROLE_FILTERS.map(({ value, label }) => ({ value, label })),
          ]}
          onChange={(value) => go({ role: (value || undefined) as UsersQuery["role"] })}
        />
        <FilterSelect
          id="users-state"
          label={state.label}
          value={query.state}
          options={USER_STATES.map(({ value, label }) => ({ value, label }))}
          onChange={(value) => go({ state: value as UsersQuery["state"] })}
        />
        {isFiltered(query) && (
          <Button type="button" variant="ghost" onClick={() => go(clearedFilters())}>
            {clear}
          </Button>
        )}
      </div>
    </div>
  );
};
