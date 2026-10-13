/**
 * The module `browserMockerCanary.browser.test.tsx` tries to mock. It exists only to be
 * mocked: nothing ships imports it, and its one export is a marker whose value says which
 * copy of this module the canary got back.
 *
 * See that file for what the canary is measuring and why it is the one browser test
 * allowed to call `vi.mock`.
 */
/**
 * Annotated `: string` rather than left to infer `"real"` deliberately. Inferred, the literal
 * type makes the canary's `=== "mocked"` a compile error (TS2367, "these types have no
 * overlap") -- which is TypeScript describing the source it can see, and exactly the wrong
 * claim here: the whole question this module exists to answer is which copy of it the
 * importer got back at RUNTIME.
 */
export const BROWSER_MOCKER_CANARY_MARKER: string = "real";
