import Image from "next/image";

interface ImagePreviewProps {
  /** A link to a file picked in the browser or to the signed link of a saved original. */
  url: string | null | undefined;
}

/** The picture of an image, with a grey box while it has none to show yet. */
export const ImagePreview = ({ url }: ImagePreviewProps) => {
  return (
    <span className="relative block size-24 shrink-0 overflow-hidden rounded-lg bg-wheat">
      {url && (
        // Links to files picked here or signed by the Storage cannot be optimized by Next.
        <Image src={url} alt="" fill sizes="96px" unoptimized className="object-cover" />
      )}
    </span>
  );
};
