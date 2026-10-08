import type { CollectionEntry } from "astro:content";
import config from "@/config";

/**
 * Determines whether a post is eligible to be listed/rendered.
 *
 * - Drafts are visible only in explicitly enabled local development previews
 * - In production, excludes scheduled posts until `pubDatetime` minus the configured margin
 * - In dev, always shows non-draft posts to make authoring easier
 */
export function postFilter({ data }: CollectionEntry<"posts">) {
  if (import.meta.env.DEV && process.env.BLOG_PREVIEW_DRAFTS === "1")
    return true;
  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - config.posts.scheduledPostMargin;
  return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
}
