import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import "katex/dist/katex.min.css";

/**
 * Move .,;:!? that sit right after a closing `$` into the math span, so the browser
 * cannot wrap and leave punctuation alone at the start of the next line.
 */
function glueTrailingPunctuation(markdown: string): string {
  return markdown.replace(/\$([^$\n]+)\$([.,;:!?])/g, "$$$1$2$$");
}

/**
 * Renders mini-lesson Markdown with inline/display LaTeX (via remark-math + rehype-katex)
 * and standard Markdown emphasis such as **bold**.
 */
export function LessonProse({ markdown }: { markdown: string }) {
  return (
    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {glueTrailingPunctuation(markdown)}
    </Markdown>
  );
}

/**
 * The same Markdown, rendered as a phrase rather than as a block.
 *
 * For authored prose that has to sit INSIDE a sentence the caller does not own. The shared
 * reveal passage in `widgetFeedback.tsx` is one flowing `<p>` - "Answer revealed. The answer
 * is X. <reasoning>" - and the check for understanding hands it an authored hint as that
 * reasoning. `LessonProse` would put a block `<p>` inside it, which breaks the sentence onto
 * its own line with its own margins and makes React log a DOM-nesting error on every reveal.
 * (It does not SPLIT the passage: React builds the tree through DOM calls rather than the
 * HTML parser, so the nested paragraph stays where it was put. The damage is the box, not
 * the nesting.)
 *
 * Only the paragraph mapping changes: the math plugins, the punctuation glue and every
 * inline mark are the block renderer's, so the two cannot disagree about how a hint reads.
 * A paragraph BREAK has nowhere to go in a phrase, so this is for single-paragraph prose;
 * every authored CFU hint is one today, and a second paragraph would run on rather than
 * break.
 */
export function LessonProseInline({ markdown }: { markdown: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{ p: ({ children }) => <span>{children}</span> }}
    >
      {glueTrailingPunctuation(markdown)}
    </Markdown>
  );
}

/**
 * One slide's subtitle, as a real heading.
 *
 * A real `<h2>` rather than styled text, in one component used by all three surfaces that
 * show a slide, so the heading a screen reader can jump to and the heading the learner
 * reads are the same element. Renders nothing when the pack has no subtitle for the slide,
 * which is every pack that predates the field.
 */
export function LessonSlideHeading({ subtitle }: { subtitle: string | undefined }) {
  if (subtitle === undefined || subtitle.trim() === "") {
    return null;
  }
  return (
    <h2 className="lesson-slide-heading">
      <LessonProse markdown={subtitle} />
    </h2>
  );
}
