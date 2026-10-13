import { Fragment } from "react";

import { LessonProse, LessonSlideHeading } from "./prose";
import { workedExampleFor } from "./teachingSections";
import type { LessonContent } from "./types";
import { LessonVisual } from "./visuals";
import { WorkedSolution } from "./WorkedSolution";

/**
 * The teaching text of one node's mini-lesson: paragraphs with interleaved worked examples
 * and visuals.
 *
 * The order within a paragraph is the order the player walked it in (lecture, worked
 * example, activity), so a learner rereading the lesson meets the parts where they left
 * them rather than having to re-map a rearranged page onto what they remember.
 */
export function LessonBody({ content }: { content: LessonContent }) {
  return (
    <div className="lesson-player__prose">
      {content.mini_lesson.map((paragraph, index) => {
        const workedExample = workedExampleFor(content, index);
        return (
          <Fragment key={paragraph.slice(0, 32)}>
            <LessonSlideHeading subtitle={content.slide_subtitles?.[index]} />
            <LessonProse markdown={paragraph} />
            {workedExample && (
              <WorkedSolution
                label="Worked example"
                intro={workedExample.prompt}
                steps={workedExample.steps}
              />
            )}
            {content.visuals
              ?.filter((v) => v.after === index)
              .map((v) => (
                <LessonVisual key={v.id} id={v.id} />
              ))}
          </Fragment>
        );
      })}
    </div>
  );
}
