import { z } from "zod";
import { findOpenStorageAccess } from "../shared/infrastructure/storage/find-open-storage-access.js";
import { setupStorageBuckets } from "../shared/infrastructure/storage/setup-storage-buckets.js";
import { createStorageClient } from "../shared/infrastructure/storage/supabase-file-storage.js";

const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // The project's public anon key, to check the buckets stay closed to anyone else.
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(`Invalid storage settings:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

const env = parsed.data;
const admin = createStorageClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

try {
  for (const [name, result] of await setupStorageBuckets(admin)) {
    console.log(`Bucket ${name}: ${result}`);
  }
  if (env.SUPABASE_ANON_KEY === undefined) {
    console.warn("SUPABASE_ANON_KEY is not set: the access to the buckets was not checked");
  } else {
    const problems = await findOpenStorageAccess(
      admin,
      createStorageClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY),
    );
    if (problems.length > 0) {
      console.error(`The buckets are open beyond the backend:\n- ${problems.join("\n- ")}`);
      process.exit(1);
    }
    console.log("Only the backend can touch the files; anyone reads the processed images");
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
