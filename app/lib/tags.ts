/**
 * YouTube caps the tags field at 500 characters in total, not 500 tags. What is measured
 * here is the exact string the user will paste — tags joined by ", " — so the count can
 * never come out under what YouTube then rejects.
 */
export const TAG_LIMIT = 500;

export type MergedTags = {
  /** Video tags first, channel defaults after, deduplicated and trimmed to fit. */
  tags: string[];
  /** Dropped for length, in the order they were dropped. Reported, never silent. */
  dropped: string[];
  characters: number;
  /** Channel defaults that survived, so the document can show what came from where. */
  fromDefaults: string[];
};

export function parseTagList(value: string) {
  return value
    .split(/[,\n]/)
    .map(tag => tag.replace(/^#+/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export const joinTags = (tags: string[]) => tags.join(", ");

/**
 * Video tags come first and channel defaults after, so trimming from the end sacrifices
 * the generic tags and never the ones written for this video.
 */
export function mergeTags(videoTags: string[], defaultTags: string, limit = TAG_LIMIT): MergedTags {
  const defaults = parseTagList(defaultTags);
  const seen = new Set<string>();
  const ordered: Array<{ tag: string; isDefault: boolean }> = [];
  for (const [list, isDefault] of [[videoTags, false], [defaults, true]] as const) {
    for (const raw of list) {
      const tag = raw.replace(/^#+/, "").replace(/\s+/g, " ").trim();
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) continue;
      seen.add(key);
      ordered.push({ tag, isDefault });
    }
  }
  const kept = [...ordered];
  const dropped: string[] = [];
  while (kept.length && joinTags(kept.map(entry => entry.tag)).length > limit) {
    dropped.push(kept.pop()!.tag);
  }
  const tags = kept.map(entry => entry.tag);
  return { tags, dropped, characters: joinTags(tags).length, fromDefaults: kept.filter(entry => entry.isDefault).map(entry => entry.tag) };
}
