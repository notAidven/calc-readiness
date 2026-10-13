import { resetDemoProgress } from "./demoMode";

export function DemoModeNotice({
  onReset = resetDemoProgress,
}: {
  readonly onReset?: () => void;
}) {
  return (
    <aside className="demo-mode-notice" aria-label="Demo storage">
      <span>
        <strong>Demo mode.</strong> Progress is stored only on this device.
      </span>
      <button type="button" onClick={onReset}>
        Reset demo
      </button>
    </aside>
  );
}
