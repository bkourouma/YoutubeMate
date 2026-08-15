/**
 * One place that names the product.
 *
 * The app was called YoutubeMate. Google's branding guidelines say an application must
 * not carry "YouTube", "YT" or a variant in its overall name, so it was renamed:
 *   https://developers.google.com/youtube/terms/branding-guidelines
 *
 * "CreatorStudio" was considered first and dropped: Apple, Meta and YouTube Studio all
 * use that phrase, so it would have traded a guideline violation for a crowded name.
 * "CreatorMate" is more distinctive and keeps continuity with the former name, but it is
 * NOT cleared — trademark, domain and handle checks are still open. See
 * docs/BRAND_RENAME_CHECKLIST.md. Routing every surface through this module is what makes
 * the next rename a one-line change instead of a hunt; it already survived one.
 *
 * References to YouTube that genuinely mean the platform, its API or its rules stay as
 * they are: renaming a third-party API would falsely imply it belongs to this product.
 */
export const product = {
  name: "CreatorMate",
  /** Shown under the wordmark in the sidebar. */
  tagline: "Creator workspace",
  shortDescription: {
    en: "An editorial production cockpit: research, long-form script, Shorts, packaging, Descript and YouTube — with a human check at each step that matters.",
    fr: "Un cockpit de production éditoriale : recherche, script long, Shorts, packaging, Descript et YouTube — avec une validation humaine à chaque étape qui compte.",
  },
  repositoryUrl: "https://github.com/bkourouma/CreatorMate",
  supportUrl: "https://github.com/bkourouma/CreatorMate/issues",
  /** Kept so migration notes and release notes can say what the product used to be called. */
  formerName: "YoutubeMate",
} as const;

export const productName = product.name;
