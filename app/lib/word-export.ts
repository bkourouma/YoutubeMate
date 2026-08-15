import { productName } from "../config/product";
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, PageNumber,
  Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";

type Lang = "fr" | "en";

export type WordChapter = { title: string; objective: string; keyPoints: string[]; targetWords: number };
export type WordConcept = { name: string; prompt: string };
export type WordOption = { id: string; register: string; title: string; description: string; overlay: string; concepts: WordConcept[] };
export type WordQuiz = { question: string; options: string[]; correctOption: number };

export type WordExportInput = {
  lang: Lang;
  company: string;
  logo: { data: ArrayBuffer; type: "png" | "jpg" } | null;
  title: string;
  subject: string;
  status: string;
  updated: string;
  step: number;
  hook: string;
  promise: string;
  conclusion: string;
  chapters: WordChapter[];
  /** Body split on its CHAPITRE markers, so each chapter becomes its own navigable heading. */
  bodyByChapter: Array<{ heading: string; text: string }>;
  bodyIntro: string;
  fixed: { presentation: string; launch: string; closing: string };
  meta: { audience: string; tone: string; duration: string; theme: string; words: number; models: string };
  timecodes: string;
  packaging: {
    options: WordOption[];
    selected: Record<string, number>;
    description: string;
    tags: { tags: string[]; dropped: string[]; characters: number; limit: number };
    pinnedComment: string;
    quiz: WordQuiz[];
    scores: Record<string, number>;
  } | null;
};

const INK = "1A1A1A";
const MUTED = "5B6470";
const ACCENT = "0B5FFF";
const PAPER = "F4F6F8";

const t = (lang: Lang, fr: string, en: string) => (lang === "fr" ? fr : en);

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel], pageBreak = false) {
  return new Paragraph({ text, heading: level, pageBreakBefore: pageBreak, spacing: { before: 320, after: 160 } });
}

function body(text: string, options: { italic?: boolean; color?: string; size?: number } = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 300 },
    children: [new TextRun({ text, italics: options.italic, color: options.color ?? INK, size: options.size ?? 22 })],
  });
}

/**
 * A block meant to be selected and pasted somewhere else — a description, the tags, the
 * script. It is shaded so its boundaries are obvious, carries no bullet, marker or
 * decoration inside, and every line is a plain paragraph: whatever is selected is exactly
 * what arrives in the YouTube field.
 */
function copyBlock(text: string) {
  const lines = text.split("\n");
  return lines.map((line, index) => new Paragraph({
    spacing: { before: index === 0 ? 80 : 0, after: index === lines.length - 1 ? 200 : 0, line: 280 },
    shading: { fill: PAPER },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 12 },
      top: index === 0 ? { style: BorderStyle.SINGLE, size: 2, color: PAPER, space: 6 } : undefined,
      bottom: index === lines.length - 1 ? { style: BorderStyle.SINGLE, size: 2, color: PAPER, space: 6 } : undefined,
    },
    children: [new TextRun({ text: line || " ", size: 22, color: INK })],
  }));
}

function label(text: string) {
  return new Paragraph({
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 17, color: MUTED, characterSpacing: 20 })],
  });
}

function infoTable(rows: Array<[string, string]>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([key, value]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          shading: { fill: PAPER },
          margins: { top: 90, bottom: 90, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: key, bold: true, size: 20, color: MUTED })] })],
        }),
        new TableCell({
          margins: { top: 90, bottom: 90, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: value || "—", size: 20, color: INK })] })],
        }),
      ],
    })),
  });
}

function chapterTable(lang: Lang, chapters: WordChapter[]) {
  const head = [t(lang, "N°", "No."), t(lang, "Chapitre", "Chapter"), t(lang, "Objectif", "Objective"), t(lang, "Points clés", "Key points"), t(lang, "Mots", "Words")];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: head.map(text => new TableCell({
          shading: { fill: INK },
          margins: { top: 90, bottom: 90, left: 110, right: 110 },
          children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: "FFFFFF" })] })],
        })),
      }),
      ...chapters.map((chapter, index) => new TableRow({
        children: [
          String(index + 1),
          chapter.title,
          chapter.objective,
          chapter.keyPoints.filter(Boolean).join(" · "),
          String(chapter.targetWords),
        ].map(text => new TableCell({
          margins: { top: 90, bottom: 90, left: 110, right: 110 },
          children: [new Paragraph({ children: [new TextRun({ text: text || "—", size: 19, color: INK })] })],
        })),
      })),
    ],
  });
}

export async function buildWordDocument(input: WordExportInput) {
  const { lang } = input;
  const children: Array<Paragraph | Table> = [];

  // ── Cover ────────────────────────────────────────────────────────────────────
  if (input.logo) {
    children.push(new Paragraph({
      spacing: { after: 160 },
      children: [new ImageRun({ data: input.logo.data, type: input.logo.type, transformation: { width: 132, height: 132 } })],
    }));
  }
  children.push(new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: input.company || productName, bold: true, size: 30, color: ACCENT, characterSpacing: 16 })],
  }));
  children.push(new Paragraph({
    spacing: { after: 320 },
    children: [new TextRun({ text: t(lang, "Document de travail — production vidéo", "Working document — video production"), size: 20, color: MUTED })],
  }));
  children.push(new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 200 }, children: [new TextRun({ text: input.title, bold: true, size: 44, color: INK })] }));

  children.push(label(t(lang, "Fiche de production", "Production sheet")));
  children.push(infoTable([
    [t(lang, "Statut", "Status"), input.status],
    [t(lang, "Étape", "Step"), `${input.step} / 7`],
    [t(lang, "Dernière modification", "Last updated"), input.updated],
    [t(lang, "Thème de la chaîne", "Channel theme"), input.meta.theme],
    [t(lang, "Audience", "Audience"), input.meta.audience],
    [t(lang, "Ton", "Tone"), input.meta.tone],
    [t(lang, "Durée cible", "Target duration"), input.meta.duration],
    [t(lang, "Mots du script", "Script words"), String(input.meta.words)],
    [t(lang, "Modèles utilisés", "Models used"), input.meta.models],
  ]));

  // ── 1. Research ──────────────────────────────────────────────────────────────
  children.push(heading(t(lang, "1. Recherche & angle", "1. Research & angle"), HeadingLevel.HEADING_1, true));
  children.push(...copyBlock(input.subject || t(lang, "Aucun sujet saisi.", "No subject entered.")));

  // ── 2. Hook ──────────────────────────────────────────────────────────────────
  children.push(heading(t(lang, "2. Hook & promesse", "2. Hook & promise"), HeadingLevel.HEADING_1));
  children.push(label(t(lang, "Hook — 15 premières secondes", "Hook — first 15 seconds")));
  children.push(...copyBlock(input.hook || "—"));
  children.push(label(t(lang, "Promesse", "Promise")));
  children.push(...copyBlock(input.promise || "—"));
  children.push(label(t(lang, "Textes fixes de la chaîne — reproduits mot pour mot", "Channel fixed copy — reproduced word for word")));
  children.push(...copyBlock([input.fixed.presentation, input.fixed.launch].filter(Boolean).join("\n\n") || "—"));

  // ── 3. Chapters ──────────────────────────────────────────────────────────────
  children.push(heading(t(lang, "3. Plan de chapitres", "3. Chapter plan"), HeadingLevel.HEADING_1, true));
  if (input.chapters.length) children.push(chapterTable(lang, input.chapters));
  else children.push(body(t(lang, "Aucun chapitre validé.", "No chapter approved."), { italic: true, color: MUTED }));

  // ── 4. Script ────────────────────────────────────────────────────────────────
  children.push(heading(t(lang, "4. Script complet", "4. Full script"), HeadingLevel.HEADING_1, true));
  children.push(body(t(lang, "Sélectionnez d’un bloc de la première à la dernière ligne pour copier tout le script.", "Select from the first to the last line to copy the whole script."), { italic: true, color: MUTED, size: 19 }));
  if (input.bodyIntro.trim()) children.push(...copyBlock(input.bodyIntro.trim()));
  for (const section of input.bodyByChapter) {
    children.push(heading(section.heading, HeadingLevel.HEADING_2));
    children.push(...copyBlock(section.text.trim() || "—"));
  }
  if (!input.bodyByChapter.length && !input.bodyIntro.trim()) {
    children.push(body(t(lang, "Le corps du script n’a pas encore été généré.", "The script body has not been generated yet."), { italic: true, color: MUTED }));
  }

  // ── 5. Conclusion ────────────────────────────────────────────────────────────
  children.push(heading(t(lang, "5. Conclusion & CTA", "5. Conclusion & CTA"), HeadingLevel.HEADING_1));
  children.push(...copyBlock(input.conclusion || "—"));
  if (input.fixed.closing) {
    children.push(label(t(lang, "Clôture fixe", "Fixed closing")));
    children.push(...copyBlock(input.fixed.closing));
  }

  // ── 6. Timecodes ─────────────────────────────────────────────────────────────
  if (input.timecodes.trim()) {
    children.push(heading(t(lang, "6. Timecodes de chapitres", "6. Chapter timecodes"), HeadingLevel.HEADING_1));
    children.push(body(t(lang, "Estimés à 145 mots par minute — à vérifier au montage avant publication.", "Estimated at 145 words per minute — check against the edit before publishing."), { italic: true, color: MUTED, size: 19 }));
    children.push(...copyBlock(input.timecodes.trim()));
  }

  // ── 7. Packaging ─────────────────────────────────────────────────────────────
  const pack = input.packaging;
  children.push(heading(t(lang, "7. Packaging — test A/B/C", "7. Packaging — A/B/C test"), HeadingLevel.HEADING_1, true));
  if (!pack) {
    children.push(body(t(lang, "Le packaging n’a pas encore été généré pour ce projet.", "Packaging has not been generated for this project yet."), { italic: true, color: MUTED }));
  } else {
    children.push(body(t(lang, "YouTube ne teste qu’une variable à la fois : titres OU miniatures.", "YouTube tests one variable at a time: titles OR thumbnails."), { italic: true, color: MUTED, size: 19 }));
    for (const option of pack.options) {
      const score = pack.scores?.[option.id];
      children.push(heading(`Option ${option.id} — ${option.register}`, HeadingLevel.HEADING_2));
      if (score !== undefined) children.push(body(t(lang, `Score vidIQ : ${score}`, `vidIQ score: ${score}`), { color: MUTED, size: 19 }));
      children.push(label(t(lang, "Titre", "Title")));
      children.push(...copyBlock(option.title));
      children.push(label(t(lang, "Description du test", "Test description")));
      children.push(...copyBlock(option.description));
      children.push(label(t(lang, "Texte de la miniature", "Thumbnail headline")));
      children.push(...copyBlock(option.overlay));
      const chosen = pack.selected?.[option.id] ?? 0;
      option.concepts.forEach((concept, index) => {
        children.push(label(`${t(lang, "Concept", "Concept")} ${index + 1} — ${concept.name}${index === chosen ? t(lang, "  ·  RETENU", "  ·  SELECTED") : ""}`));
        children.push(...copyBlock(concept.prompt));
      });
    }

    children.push(heading(t(lang, "8. Description YouTube", "8. YouTube description"), HeadingLevel.HEADING_1, true));
    children.push(...copyBlock(pack.description || "—"));

    children.push(heading(t(lang, "9. Tags", "9. Tags"), HeadingLevel.HEADING_1));
    const merged = pack.tags;
    children.push(body(
      t(lang,
        `Tags de la vidéo puis tags par défaut de la chaîne — ${merged.tags.length} tags, ${merged.characters} / ${merged.limit} caractères.`,
        `The video's tags followed by the channel defaults — ${merged.tags.length} tags, ${merged.characters} / ${merged.limit} characters.`),
      { italic: true, color: MUTED, size: 19 }));
    children.push(...copyBlock(merged.tags.join(", ") || "—"));
    // What was cut is written down rather than dropped in silence: it is the difference
    // between a document you can trust and one you have to re-check against the app.
    if (merged.dropped.length) {
      children.push(body(
        t(lang,
          `${merged.dropped.length} tag(s) retirés pour tenir dans la limite de ${merged.limit} caractères, en partant de la fin : ${merged.dropped.join(", ")}.`,
          `${merged.dropped.length} tag(s) dropped to fit the ${merged.limit}-character limit, starting from the end: ${merged.dropped.join(", ")}.`),
        { italic: true, color: MUTED, size: 19 }));
    }

    children.push(heading(t(lang, "10. Commentaire à épingler", "10. Comment to pin"), HeadingLevel.HEADING_1));
    children.push(...copyBlock(pack.pinnedComment || "—"));

    if (pack.quiz.length) {
      children.push(heading(t(lang, "11. Quiz", "11. Quiz"), HeadingLevel.HEADING_1));
      pack.quiz.forEach((item, index) => {
        children.push(new Paragraph({
          spacing: { before: 200, after: 60 },
          children: [new TextRun({ text: `${index + 1}. ${item.question}`, bold: true, size: 22, color: INK })],
        }));
        item.options.forEach((choice, choiceIndex) => {
          const correct = choiceIndex === item.correctOption;
          children.push(new Paragraph({
            spacing: { after: 40 },
            indent: { left: 340 },
            children: [new TextRun({
              text: `${String.fromCharCode(65 + choiceIndex)}. ${choice}${correct ? t(lang, "   ✓ bonne réponse", "   ✓ correct") : ""}`,
              size: 21, bold: correct, color: correct ? ACCENT : INK,
            })],
          }));
        });
      });
    }
  }

  const document = new Document({
    creator: input.company || productName,
    title: input.title,
    description: t(lang, `Document de travail généré par ${productName}`, `Working document generated by ${productName}`),
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22, color: INK } },
        title: { run: { font: "Calibri", size: 44, bold: true, color: INK }, paragraph: { spacing: { after: 200 } } },
        heading1: { run: { font: "Calibri", size: 30, bold: true, color: INK }, paragraph: { spacing: { before: 320, after: 160 } } },
        heading2: { run: { font: "Calibri", size: 25, bold: true, color: ACCENT }, paragraph: { spacing: { before: 260, after: 120 } } },
      },
    },
    sections: [{
      properties: { page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `${input.company || productName} · ${input.title}`, size: 17, color: MUTED })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], size: 17, color: MUTED })],
          })],
        }),
      },
      children,
    }],
  });

  return Packer.toBlob(document);
}
