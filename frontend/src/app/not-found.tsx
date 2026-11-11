import { StoreNotFound, StoreShell } from "@/modules/site-layout";

// An unknown address does not go through the store's layout, so the shell is composed here.
const NotFound = () => {
  return (
    <StoreShell>
      <StoreNotFound />
    </StoreShell>
  );
};

export default NotFound;
