import { HomePage, homeMetadata } from "@/modules/home";

// Regenerated at most once a minute, also when the API was down at build time.
export const revalidate = 60;
export const metadata = homeMetadata;

const Home = () => {
  return <HomePage />;
};

export default Home;
