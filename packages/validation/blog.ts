import { z } from 'zod';

/**
 * Shared between the admin blog editor form and the create/update server
 * actions (apps/web/app/admin/blogs/*). The slug is derived server-side
 * from the title via slugify() rather than user-entered, mirroring
 * service_categories (see packages/validation/listing.ts).
 */
export const blogPostSchema = z.object({
  title: z.string().trim().min(4, 'Title is too short').max(150),
  excerpt: z.string().trim().max(300).optional().or(z.literal('')),
  content: z
    .string()
    .trim()
    .min(50, 'Add a bit more content (at least 50 characters)')
    .max(20000),
  metaDescription: z.string().trim().max(300).optional().or(z.literal('')),
  coverImageAlt: z.string().trim().max(150).optional().or(z.literal('')),
  isFeatured: z.coerce.boolean().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});
export type BlogPostInput = z.infer<typeof blogPostSchema>;
