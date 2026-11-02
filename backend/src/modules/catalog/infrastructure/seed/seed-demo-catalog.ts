import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { type FileStorage, StorageBucket } from "../../../../shared/application/file-storage.js";
import type { Database } from "../../../../shared/infrastructure/database/drizzle.client.js";
import {
  categories,
  productCategories,
  productImages,
  products,
} from "../../../../shared/infrastructure/database/schema/index.js";
import type { ImageProcessor } from "../../application/ports/image-processor.js";
import { ImageKeyFactory } from "../../application/services/image-key-factory.js";
import { DEMO_CATEGORIES, DEMO_PRODUCTS, type DemoCategory } from "./demo-catalog.js";
import { placeholderImage } from "./placeholder-image.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const WEBP = "image/webp";

// One color per top-level category, from the store palette, so the grid reads at a glance.
const ROOT_COLORS: Record<string, string> = {
  escolar: "#2a8c8c",
  "arte-y-dibujo": "#e2725b",
  oficina: "#3d5a80",
  regaleria: "#b5838d",
};

export interface SeedDemoCatalogResult {
  status: "created" | "already-exists";
  categories: number;
  products: number;
}

interface CategoryRow {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  sortOrder: number;
  root: string;
}

interface StoredImage {
  originalKey: string;
  publicKey: string;
  width: number;
  height: number;
  sizeBytes: number;
}

function flatten(
  nodes: DemoCategory[],
  parentId: string | null = null,
  root?: string,
): CategoryRow[] {
  return nodes.flatMap((node, index) => {
    const id = randomUUID();
    const nodeRoot = root ?? node.slug;
    return [
      { id, parentId, name: node.name, slug: node.slug, sortOrder: index, root: nodeRoot },
      ...flatten(node.children ?? [], id, nodeRoot),
    ];
  });
}

/**
 * Loads the sample catalog for local development: categories, products and one processed
 * image each, uploaded to both buckets as the admin panel would leave them. Does nothing if
 * the sample categories are already there.
 */
export async function seedDemoCatalog(
  db: Database,
  storage: FileStorage,
  processor: ImageProcessor,
): Promise<SeedDemoCatalogResult> {
  const categoryRows = flatten(DEMO_CATEGORIES);
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      inArray(
        categories.slug,
        categoryRows.map((row) => row.slug),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return { status: "already-exists", categories: 0, products: 0 };
  }

  const bySlug = new Map(categoryRows.map((row) => [row.slug, row]));
  const keys = new ImageKeyFactory();
  const now = Date.now();
  const productRows = DEMO_PRODUCTS.map((product, index) => {
    const category = bySlug.get(product.category);
    if (!category) {
      throw new Error(`Unknown category ${product.category} for ${product.slug}`);
    }
    return { product, category, id: randomUUID(), imageId: randomUUID(), index };
  });

  // Files go up before the transaction and are removed if anything fails, as the panel does.
  const uploaded: Record<StorageBucket, string[]> = {
    [StorageBucket.PRIVATE]: [],
    [StorageBucket.PUBLIC]: [],
  };
  try {
    const images = new Map<string, StoredImage>();
    for (const { product, category, id, imageId } of productRows) {
      const original = await placeholderImage(product.title, ROOT_COLORS[category.root] ?? "#555");
      const publicVersion = await processor.toPublicVersion(original);
      const originalKey = keys.originalKey(id, imageId, WEBP);
      const publicKey = keys.publicKey(id, imageId, "1");
      uploaded[StorageBucket.PRIVATE].push(originalKey);
      await storage.upload(StorageBucket.PRIVATE, originalKey, original, WEBP);
      uploaded[StorageBucket.PUBLIC].push(publicKey);
      await storage.upload(StorageBucket.PUBLIC, publicKey, publicVersion.bytes, WEBP);
      images.set(id, {
        originalKey,
        publicKey,
        width: publicVersion.width,
        height: publicVersion.height,
        sizeBytes: original.byteLength,
      });
    }

    await db.transaction(async (tx) => {
      await tx.insert(categories).values(
        categoryRows.map(({ id, parentId, name, slug, sortOrder }) => ({
          id,
          parentId,
          name,
          slug,
          sortOrder,
        })),
      );
      await tx.insert(products).values(
        productRows.map(({ product, id, index }) => ({
          id,
          title: product.title,
          slug: product.slug,
          price: product.price,
          salePrice: product.salePrice ?? null,
          isOnSale: product.salePrice !== undefined,
          stock: product.stock,
          isFeatured: product.featured ?? false,
          isNew: product.isNew ?? false,
          newUntil: product.isNew ? new Date(now + 30 * DAY_MS) : null,
          // Staggered, so sorting by the newest differs from the store order.
          createdAt: new Date(now - index * HOUR_MS),
        })),
      );
      await tx.insert(productCategories).values(
        productRows.map(({ id, category }) => ({
          productId: id,
          categoryId: category.id,
          isPrimary: true,
        })),
      );
      await tx.insert(productImages).values(
        productRows.map(({ product, id, imageId }) => {
          const image = images.get(id);
          if (!image) {
            throw new Error(`Missing image for ${product.slug}`);
          }
          return {
            id: imageId,
            productId: id,
            position: 1,
            altText: product.title,
            mimeType: WEBP,
            status: "PROCESSED" as const,
            ...image,
          };
        }),
      );
    });
  } catch (error) {
    await Promise.allSettled([
      storage.remove(StorageBucket.PRIVATE, uploaded[StorageBucket.PRIVATE]),
      storage.remove(StorageBucket.PUBLIC, uploaded[StorageBucket.PUBLIC]),
    ]);
    throw error;
  }

  return { status: "created", categories: categoryRows.length, products: productRows.length };
}
