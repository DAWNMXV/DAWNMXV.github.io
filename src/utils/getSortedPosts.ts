import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";
import series from "../../notion-series-manifest.json";

const seriesOrder = new Map(
  series.map((article, index) => [article.path.split("/")[1], index])
);

/**
 * Returns posts that are eligible to be shown to users, sorted by publication date
 * descending, preserving the original blog’s chronology.
 *
 * Note: filtering respects drafts and scheduled posts via `postFilter()`.
 */
export function getSortedPosts(posts: CollectionEntry<"posts">[]) {
  return posts
    .filter(postFilter)
    .sort(
      (a, b) =>
        Math.floor(new Date(b.data.pubDatetime).getTime() / 1000) -
          Math.floor(new Date(a.data.pubDatetime).getTime() / 1000) ||
        (seriesOrder.get(a.id) ?? Infinity) -
          (seriesOrder.get(b.id) ?? Infinity) ||
        a.id.localeCompare(b.id)
    );
}
