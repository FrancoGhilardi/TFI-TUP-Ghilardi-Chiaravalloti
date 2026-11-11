import { notFound } from "next/navigation";

// Any address under the panel that no screen answers lands here, so it gets the panel's 404.
const AdminUnknownPage = () => {
  notFound();
};

export default AdminUnknownPage;
