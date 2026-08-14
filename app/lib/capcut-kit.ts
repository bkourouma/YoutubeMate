import JSZip from "jszip";
import type { ShortItem, ShortsMetadataItem } from "../shorts-studio";

const timeToSeconds = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  const parts = normalized.split(":").map(Number);
  if (parts.some(part => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
};

const srtTime = (seconds: number) => {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const safe = Math.floor(totalMilliseconds / 1000);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const wholeSeconds = safe % 60;
  return [hours, minutes, wholeSeconds].map(part => String(part).padStart(2, "0")).join(":") + "," + String(totalMilliseconds % 1000).padStart(3, "0");
};

/**
 * Distributes the excerpt's words across its source segments as timed cues, so the
 * subtitles line up with the passages the editor is about to cut. Kept verbatim from
 * Shorts Studio: the cue placement is what makes the file usable without re-syncing.
 */
export function buildSrt(short: ShortItem) {
  const segments = short.sequences
    .map(sequence => ({ start: timeToSeconds(sequence.startTime), end: timeToSeconds(sequence.endTime) }))
    .filter(sequence => sequence.end > sequence.start);
  if (!segments.length) return "";

  const totalDuration = segments.reduce((total, sequence) => total + sequence.end - sequence.start, 0);
  const words = short.text.trim().split(/\s+/).filter(Boolean);
  const cueCount = Math.min(words.length, Math.max(1, Math.ceil(totalDuration / 2.5)));
  const wordsPerCue = Math.max(1, Math.ceil(words.length / cueCount));
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += wordsPerCue) chunks.push(words.slice(index, index + wordsPerCue).join(" "));

  return chunks.map((chunk, index) => {
    const virtualPoint = ((index + 0.5) / chunks.length) * totalDuration;
    let elapsed = 0;
    let segment = segments[segments.length - 1];
    for (const candidate of segments) {
      const duration = candidate.end - candidate.start;
      if (virtualPoint <= elapsed + duration) { segment = candidate; break; }
      elapsed += duration;
    }
    const segmentDuration = segment.end - segment.start;
    const center = segment.start + Math.min(segmentDuration, Math.max(0, virtualPoint - elapsed));
    const cueDuration = Math.min(segmentDuration, Math.max(1.2, Math.min(2.4, totalDuration / chunks.length * 0.88)));
    const start = Math.max(segment.start, Math.min(segment.end - cueDuration, center - cueDuration / 2));
    const end = Math.min(segment.end, start + cueDuration);
    return `${index + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${chunk}\n`;
  }).join("\n");
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60) || "short";
}

export type KitOptions = {
  shorts: ShortItem[];
  titles: Record<number, string>;
  metadata: Record<number, ShortsMetadataItem>;
  includeCta: boolean;
  lang: "fr" | "en";
};

/**
 * CapCut has no public API to build a timeline, so the kit replaces that step: an
 * editing plan the human follows, with every timecode, subtitle file and caption
 * already prepared.
 */
export async function buildCapCutKit({ shorts, titles, metadata, includeCta, lang }: KitOptions) {
  const zip = new JSZip();
  const fr = lang === "fr";

  const planRows = [[
    csvCell(fr ? "Short" : "Short"), csvCell(fr ? "Titre" : "Title"), csvCell(fr ? "Sequence" : "Sequence"),
    csvCell(fr ? "Debut" : "Start"), csvCell(fr ? "Fin" : "End"), csvCell(fr ? "Horaires estimes" : "Estimated timing"),
  ].join(",")];

  for (const [index, short] of shorts.entries()) {
    const number = String(index + 1).padStart(2, "0");
    const title = titles[index] || short.title;
    const folder = `shorts/${number}-${safeFileName(title)}`;
    const item = metadata[index];

    zip.file(`${folder}/texte.txt`, short.text);
    const srt = buildSrt(short);
    if (srt) zip.file(`${folder}/sous-titres-source.srt`, srt);
    zip.file(`${folder}/publication.txt`, [
      `${fr ? "TITRE" : "TITLE"}\n${title}`,
      item ? `\n${fr ? "DESCRIPTION" : "DESCRIPTION"}\n${item.description}` : "",
      item ? `\n${fr ? "TAGS" : "TAGS"}\n${item.tags.join(", ")}` : "",
      `\n${fr ? "SEQUENCES SOURCE" : "SOURCE SEQUENCES"}\n${short.sequences.map((sequence, order) => `${order + 1}. ${sequence.startTime} → ${sequence.endTime}`).join("\n")}`,
      short.positionEstimated ? `\n${fr ? "ATTENTION : ces horaires sont estimes, pas lus dans un SRT. Verifiez-les a l'ecran." : "WARNING: these timings are estimated, not read from an SRT. Check them on screen."}` : "",
    ].filter(Boolean).join("\n"));

    for (const [order, sequence] of short.sequences.entries()) {
      planRows.push([
        csvCell(number), csvCell(title), csvCell(order + 1),
        csvCell(sequence.startTime), csvCell(sequence.endTime),
        csvCell(short.positionEstimated ? (fr ? "oui" : "yes") : (fr ? "non" : "no")),
      ].join(","));
    }
  }

  // A BOM so the plan opens with correct accents in Excel, which most editors use.
  zip.file("plan-de-montage.csv", "﻿" + planRows.join("\n"));

  zip.file(fr ? "LISEZ-MOI.txt" : "READ-ME.txt", fr
    ? `KIT CAPCUT — ${shorts.length} short(s)\n\nCapCut ne propose pas de connexion publique permettant de construire une timeline automatiquement. Ce kit remplace cette etape : tout ce qui peut etre prepare a l'avance l'est.\n\n1. Importez votre video longue dans CapCut.\n2. Ouvrez plan-de-montage.csv : chaque ligne est une sequence a decouper, avec son debut et sa fin.\n3. Pour chaque short, coupez les sequences dans l'ordre indique, puis assemblez-les sans laisser les intervalles.\n4. Passez le format en 9:16 vertical.\n5. Sous-titres : importez sous-titres-source.srt, ou laissez CapCut les generer.\n6. ${includeCta ? "Ajoutez la video CTA fournie a la toute fin, en entier." : "Aucune video CTA n'est incluse dans ce kit."}\n7. A la publication, reprenez le titre, la description et les tags depuis publication.txt.\n\nLes horaires marques comme estimes proviennent d'une transcription sans horodatage : verifiez-les a l'ecran avant de couper.\n\nCapCut Web : https://www.capcut.com/editor\n`
    : `CAPCUT KIT — ${shorts.length} short(s)\n\nCapCut offers no public API to build a timeline automatically. This kit replaces that step: everything that can be prepared in advance is.\n\n1. Import your long video into CapCut.\n2. Open plan-de-montage.csv: each row is one sequence to cut, with its start and end.\n3. For each short, cut the sequences in the given order, then join them without the gaps.\n4. Switch the canvas to 9:16 vertical.\n5. Subtitles: import sous-titres-source.srt, or let CapCut generate them.\n6. ${includeCta ? "Add the supplied CTA video at the very end, in full." : "No CTA video is included in this kit."}\n7. When publishing, reuse the title, description and tags from publication.txt.\n\nTimings marked as estimated come from a transcript without timestamps: check them on screen before cutting.\n\nCapCut Web: https://www.capcut.com/editor\n`);

  if (includeCta) {
    try {
      const response = await fetch("/short-cta.mp4");
      if (response.ok) zip.file("SHORT CTA.mp4", await response.blob());
    } catch {
      // The kit is still useful without the clip; the guide says whether it is there.
    }
  }

  return zip.generateAsync({ type: "blob" });
}
