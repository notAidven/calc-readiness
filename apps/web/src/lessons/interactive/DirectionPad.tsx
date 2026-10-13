type DirectionPadProps = {
  onLeft: () => void;
  onRight: () => void;
  onUp: () => void;
  onDown: () => void;
  disabled?: boolean;
};

/** Arrow keys in keyboard layout: up on top, left / down / right on the bottom row. */
export function DirectionPad({
  onLeft,
  onRight,
  onUp,
  onDown,
  disabled,
}: DirectionPadProps) {
  return (
    <div className="lesson-interactive__direction-pad">
      <div className="lesson-interactive__direction-pad-row">
        <button
          type="button"
          className="lesson-interactive__direction-key"
          aria-label="move up"
          disabled={disabled}
          onClick={onUp}
        >
          ↑
        </button>
      </div>
      <div className="lesson-interactive__direction-pad-row">
        <button
          type="button"
          className="lesson-interactive__direction-key"
          aria-label="move left"
          disabled={disabled}
          onClick={onLeft}
        >
          ←
        </button>
        <button
          type="button"
          className="lesson-interactive__direction-key"
          aria-label="move down"
          disabled={disabled}
          onClick={onDown}
        >
          ↓
        </button>
        <button
          type="button"
          className="lesson-interactive__direction-key"
          aria-label="move right"
          disabled={disabled}
          onClick={onRight}
        >
          →
        </button>
      </div>
    </div>
  );
}
