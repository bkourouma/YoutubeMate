export type Pipeline = "script" | "shorts";

export type Framing = {
  size: string;
  format: "png" | "jpeg";
  mime: string;
  extension: string;
  ratio: string;
  brief: string;
};

/**
 * Long-form and Shorts thumbnails are NOT the same shape, and getting this wrong is
 * invisible until the image lands on YouTube cropped.
 *
 * Each pipeline requests the transpose of the other inside the same model size family:
 *   gpt-image-2   2048x1152 (exactly 16:9)  <->  1152x2048 (exactly 9:16)
 *   gpt-image-1.5 1536x1024 (3:2, the closest landscape it supports)  <->  1024x1536
 *
 * gpt-image-1.5 offers no exact 16:9, so the composition brief states the target ratio
 * and the client crops to the delivery size on download — 1280x720 for long form,
 * 720x1280 for Shorts. Asking gpt-image for 720x1280 directly, as Shorts Studio did,
 * leaves that size family altogether and risks an outright rejection.
 */
export function framingFor(pipeline: Pipeline, model: string): Framing {
  const exact = model === "gpt-image-2";
  if (pipeline === "shorts") {
    return {
      size: exact ? "1152x2048" : "1024x1536",
      format: "jpeg", mime: "image/jpeg", extension: "jpg",
      ratio: exact ? "9:16" : "2:3",
      brief: `Create a polished YouTube Shorts thumbnail composed for a 9:16 vertical frame, designed to be read on a phone.${exact ? "" : " The canvas is slightly wider than 9:16, so keep the composition safe for a centred 9:16 crop."} Keep the subject and any essential text within the central area, clear of the top and bottom interface overlays.`,
    };
  }
  return {
    size: exact ? "2048x1152" : "1536x1024",
    format: "png", mime: "image/png", extension: "png",
    ratio: exact ? "16:9" : "3:2",
    brief: `Create a polished YouTube thumbnail composed for a 16:9 landscape frame.${exact ? "" : " The canvas is slightly taller than 16:9, so keep the composition safe for a centred 16:9 crop."}`,
  };
}

/**
 * Where the presenter belongs depends on the frame, so the instruction does too.
 *
 * Stated as an override: a channel's editorial system prompt often asks for a "generic"
 * person — sound advice for stock imagery, fatal when the creator's own face is the
 * point. This must win over that instruction.
 */
export function presenterBrief(pipeline: Pipeline) {
  const identity = "The FIRST supplied image is a photograph of this channel's real presenter, not a style reference. The presenter must appear in the thumbnail and must be recognisably the same person: same face, same skin tone, same head shape, same eyewear, same age and build. Do not generalise, beautify, rejuvenate or substitute them, and ignore any instruction asking for a generic or representative person — that rule applies to stock subjects, never to this photograph. Expression, clothing, lighting and pose may change to fit the scene.";
  return pipeline === "shorts"
    ? `${identity} Frame them vertically, head and shoulders or waist up, filling roughly the lower two thirds on one side, with the visual subject above or beside them. Their face must stay fully inside the safe central area, never behind the top or bottom interface overlays.`
    : `${identity} Place them to one side, head and shoulders or waist up, occupying roughly one third of the frame, with the visual subject on the opposite side.`;
}
