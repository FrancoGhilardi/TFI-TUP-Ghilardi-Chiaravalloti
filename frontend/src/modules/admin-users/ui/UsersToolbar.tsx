import { FilterSelect } from "@/modules/core/ui/FilterSelect";
import { ListToolbar } from "@/modules/core/ui/ListToolbar";

import { usersContent } from "../content/users";
import {
  clearedFilters,
  isFiltered,
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
    <ListToolbar
      search={{
        id: "users-search",
        label: search.label,
        placeholder: search.placeholder,
        value: query.q ?? "",
        onSearch: (text) => go({ q: text || undefined }, { replace: true }),
      }}
      clear={isFiltered(query) && { label: clear, onClear: () => go(clearedFilters()) }}
    >
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
    </ListToolbar>
  );
};
