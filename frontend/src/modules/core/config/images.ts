const LOOPBACK_HOSTS = new Set(["localhost", "0.0.0.0", "[::1]"]);
const LOOPBACK_IPV4 = /^127(\.\d{1,3}){3}$/;

/** Path under which Supabase serves the objects of public buckets. */
const PUBLIC_OBJECTS_PREFIX = "/storage/v1/object/public/";

/** The only remote images `next/image` may optimize: public Storage objects. */
export function storageImagePattern(storageOrigin: string): URL {
  return new URL(`${storageOrigin}${PUBLIC_OBJECTS_PREFIX}**`);
}

/** Whether `next/image` may optimize `url`: only public objects of the configured Storage. */
export function isOptimizableImage(url: string, storageOrigin: string): boolean {
  return url.startsWith(`${storageOrigin}${PUBLIC_OBJECTS_PREFIX}`);
}

/**
 * Whether Storage runs on this machine. Next refuses to optimize images from private addresses
 * (a guard against requests to the internal network), so the local Storage needs that guard
 * lifted; any other host keeps it.
 */
export function isLoopbackOrigin(origin: string): boolean {
  const { hostname } = new URL(origin);
  return LOOPBACK_HOSTS.has(hostname) || LOOPBACK_IPV4.test(hostname);
}
