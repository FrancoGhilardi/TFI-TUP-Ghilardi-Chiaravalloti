import { useProductImages } from "../application/useProductImages";
import { productFormText, productImagesText } from "../content/product-form";
import { MAX_IMAGES } from "../domain/image-rules";
import { FormSection } from "@/modules/core/ui/FormSection";
import { SavedImagesManager } from "./SavedImagesManager";

interface SavedImagesSectionProps {
  productId: string;
}

/** The images section of a product that exists: they are managed one by one, not with "Guardar". */
export const SavedImagesSection = ({ productId }: SavedImagesSectionProps) => {
  const { data } = useProductImages(productId);
  const { help, count } = productImagesText;

  return (
    <FormSection
      title={productFormText.sections.images}
      note={data ? count(data.length, MAX_IMAGES) : undefined}
    >
      <p className="text-sm text-ink-soft">{help}</p>
      <SavedImagesManager productId={productId} />
    </FormSection>
  );
};
