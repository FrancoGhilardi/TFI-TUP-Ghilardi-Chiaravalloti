import { useSyncExternalStore } from "react";

/** One link per file picked in the browser, kept while something shows it. */
const urls = new WeakMap<File, string>();

/** One way of subscribing per file, so that rendering again does not let go of the link. */
const subscriptions = new WeakMap<File, () => () => void>();

const urlOf = (file: File): string => {
  let url = urls.get(file);
  if (!url) {
    url = URL.createObjectURL(file);
    urls.set(file, url);
  }
  return url;
};

function subscriptionOf(file: File): () => () => void {
  let subscription = subscriptions.get(file);
  if (!subscription) {
    subscription = () => () => {
      const url = urls.get(file);
      if (url) {
        URL.revokeObjectURL(url);
        urls.delete(file);
      }
    };
    subscriptions.set(file, subscription);
  }
  return subscription;
}

const noSubscription = () => () => {};

/** A link to show a file picked in the browser, let go of when nothing shows the file any more. */
export function useObjectUrl(file: File | undefined): string | undefined {
  return useSyncExternalStore(
    file ? subscriptionOf(file) : noSubscription,
    () => (file ? urlOf(file) : undefined),
    () => undefined,
  );
}
