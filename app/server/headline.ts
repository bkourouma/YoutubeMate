/**
 * Concept prompts were written on the assumption that the headline would be added
 * outside the image, so they end with "no text, no letters, no numbers" — while the
 * composer asks for a large headline in the same breath. The model resolved that
 * contradiction at random.
 *
 * The headline is rendered by the image model now. Prompts already saved (and any the
 * user edited by hand) still carry the old prohibition, so the contradiction is removed
 * at composition time as well as at generation time.
 */

// Only a clause that is *nothing but* a ban on lettering is dropped. "Use a clean
// background with no text overlay" is a composition instruction and must survive; the
// overriding directive below is what settles those cases.
const ONLY_A_TEXT_BAN = /^(?:and\s+)?(?:no|without|avoid|omit)\s+(?:(?:any|other|visible|additional|extra)\s+)*(?:text|lettering|letters|words?|wording|numbers?|numerals|digits|typography|captions?|writing)(?:\s+(?:overlays?|elements?|marks?))?$/i;

export function allowHeadlineText(prompt: string) {
  return prompt
    .split(/(?<=[.;!?])\s+/)
    .map(sentence => {
      const kept = sentence
        .split(",")
        .filter(part => !ONLY_A_TEXT_BAN.test(part.trim().replace(/\s+because\b[\s\S]*$/i, "").replace(/[.;!?]+$/, "").trim()));
      if (!kept.length) return "";
      const rebuilt = kept.join(",").trim().replace(/^,+\s*/, "");
      // Dropping the opening clause can leave a sentence starting lower-case; dropping
      // the closing one takes the full stop with it.
      const cased = rebuilt.replace(/^([a-z])/, match => match.toUpperCase()).replace(/\s+,/g, ",");
      const ending = sentence.trim().match(/[.;!?]$/)?.[0] ?? "";
      return ending && !/[.;!?]$/.test(cased) ? `${cased}${ending}` : cased;
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

/**
 * Stated as an override rather than woven into the prompt: the same shape as the
 * presenter requirement, which is the one instruction that reliably wins against an
 * editorial system prompt saying otherwise.
 */
export function headlineDirective(overlay: string, channel: string) {
  const parts = [
    "OVERRIDING REQUIREMENT — THE TEXT: the composition above may ask for no text; that instruction is superseded by this one.",
    `Render this headline into the image, spelled exactly as written here, character for character, keeping every accent and punctuation mark: "${overlay}".`,
    "Set it large and bold in the uncluttered area the composition reserves, at high contrast against whatever sits behind it, fully inside the safe margins, and still readable when the whole image is 120 pixels wide.",
    // The composition is allowed to call for supporting text — a badge, a price, a
    // number. Anything quoted there is rendered; anything not quoted is not invented.
    "Any further words the composition quotes — a badge, a sticker, a number — are welcome: render each exactly as quoted, keep them short, and keep them clearly smaller than the headline.",
    "Do not translate any of this text, do not rephrase it, do not correct its spelling, and do not split a word across two lines.",
  ];
  if (channel) parts.push(`Add one small channel label reading exactly "${channel}", placed away from the headline and much smaller than it.`);
  parts.push("Every word in the image must be one quoted above: no invented lettering, no logo, no watermark, no brand marks.");
  return parts.join(" ");
}
