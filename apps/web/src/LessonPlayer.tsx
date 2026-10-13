import { AdvisorLesson } from "./lessons/AdvisorLesson";
import { LessonCfu } from "./lessons/cfu";
import type { LessonContent } from "./lessons/types";
import { LessonSoundToggle } from "./lessons/widgetFeedback";

/** Fallback shown when a lesson has no authored check-your-understanding question. */
export function PlaceholderCfu() {
  return (
    <div className="lesson-player__placeholder">
      <span className="micro-label">Check your understanding</span>
      <p>Coming soon - a quick question to check the main idea will go here.</p>
    </div>
  );
}

/** The end-of-lesson check: the interactive question when authored, else the placeholder. */
export function LessonCheck({ content }: { content: LessonContent }) {
  return content.cfu ? (
    <LessonCfu cfu={content.cfu} nodeId={content.node_id} />
  ) : (
    <PlaceholderCfu />
  );
}

export function LessonPlayer({
  content,
  onExit,
}: {
  content: LessonContent;
  onExit: () => void;
}) {
  return (
    <article className="lesson-player">
      <header className="lesson-player__head">
        <span className="micro-label">{content.node_id} - mini-lesson</span>
        <h2>{content.title}</h2>
        <LessonSoundToggle />
      </header>

      <AdvisorLesson content={content} />

      <footer className="lesson-player__foot">
        <button type="button" className="primary-action" onClick={onExit}>
          Back to lessons
        </button>
      </footer>
    </article>
  );
}
