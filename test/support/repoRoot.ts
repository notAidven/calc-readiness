/**
 * The repository root, in a form `node:fs` can open on every machine the suite runs on.
 *
 * ## The bug this exists to prevent
 *
 * Every whole-repository invariant under `test/` has to locate its subject, and the way it
 * does that is to ask git where the checkout is:
 *
 *   execFileSync("git", ["rev-parse", "--show-toplevel"])
 *
 * That answer is not portable. Under an MSYS git -- the build MSYS2 ships, which a Git Bash
 * shell on Windows will often put first on `PATH` -- `--show-toplevel` replies in MSYS form,
 * `/c/workspace/calc-readiness`, because MSYS mounts each drive at a single-letter directory
 * under `/`. Native Node on Windows has never heard of that mount table. It reads a leading
 * `/` as "root of the current drive", so `/c/workspace` means `C:\c\workspace`, which does
 * not exist.
 *
 * The damage is concentrated and it is not proportional to how obscure the cause sounds.
 * Three of the five invariants read a file or a directory under the root at MODULE SCOPE, so
 * they throw `ENOENT ... scandir '/c/workspace/...'` before vitest has collected a single
 * `it()` -- their bodies never register, and the run reports them as one import error each
 * rather than as the 251 assertions they hold. The other two pass the root as `cwd` to a
 * second git and get `spawnSync git ENOENT`. Measured on a Windows box: **7 of 258 tests
 * collected**, and putting a native-form git first on `PATH` restores all 258.
 *
 * That count is reproducible without Windows, and was reproduced before this helper was
 * trusted: feed `resolveRepoRoot` an MSYS-form root a Linux box also cannot open and the
 * run collapses to the identical shape, 7 collected, three files dead at `scandir` and two
 * at `spawnSync`. See the sweep beside this file.
 *
 * CI is `ubuntu-latest` and cannot see any of this. What makes it worth a shared helper
 * rather than a note in a README is that this project gates locally: a worker reporting a
 * green `test:unit` from a Windows box has run 7 of these 258 assertions, and five loudly
 * red files are easy to wave through as "that git thing on Windows" while the coverage they
 * were supposed to provide is simply absent.
 *
 * ## Why not just fix `PATH`
 *
 * Ordering a native-form git ahead of the MSYS build does restore all 258, and is still the
 * wrong fix: it has to be done again on every machine, by every developer, none of whom
 * will be told. Normalising the one string git hands back costs a regex and cannot be
 * forgotten.
 *
 * ## The boundary, which is the whole of the risk
 *
 * `/c/workspace/x` is MSYS for `C:\workspace\x`. It is ALSO a perfectly ordinary POSIX path
 * on Linux, naming a directory called `c` at the filesystem root. Nothing in the string
 * itself distinguishes the two readings, so no regex, however tight, can tell them apart.
 * The platform is what disambiguates, and it disambiguates completely:
 *
 *  - on `win32` there is no competing reading. A leading `/c/` cannot name anything a
 *    Windows program would recognise, so treating it as a drive spec loses nothing;
 *  - anywhere else `/c/...` is a real path and must survive untouched, so the transform is
 *    not applied at all. WSL is on the "anywhere else" side and belongs there: its git
 *    reports `/home/...` or `/mnt/c/...`, both already native to the kernel Node is running
 *    on.
 *
 * The platform test is therefore the guard, and the pattern is kept as narrow as the shape
 * allows rather than being asked to carry any of that weight: one lowercase letter between
 * two slashes, anchored. `/usr/local` keeps its `/usr`, `/cc/x` is not a drive, `/mnt/c/x`
 * is not touched at its second segment, and an uppercase `/C/x` is left alone because MSYS
 * spells its mount points in lower case, so widening the class would only enlarge the
 * surface the platform gate has to protect.
 *
 * `toNativeRepoPath` takes the platform as an argument rather than reading
 * `process.platform` inside itself precisely so both sides of that branch can be exercised
 * from a Linux runner, where the `win32` branch is otherwise unreachable and an untested
 * branch is how this would have shipped broken in the other direction.
 */

import { execFileSync } from "node:child_process";

/**
 * An MSYS mount-table path -- one lowercase drive letter between two slashes, anchored at
 * the very start of the string. Deliberately not case-insensitive and deliberately
 * requiring the trailing slash: see the header for why widening either would be a cost
 * with no matching benefit.
 *
 * Exported only so the sweep beside this file can census its `.source` across `test/` and
 * fail if a second copy of it appears. Nothing should call it directly.
 */
export const MSYS_DRIVE_PREFIX = /^\/([a-z])\//;

/**
 * `rawPath` as the platform's own filesystem spells it.
 *
 * Only an MSYS drive prefix on Windows is rewritten (`/c/x` becomes `c:/x`). Everything
 * else -- a native Windows path, a POSIX path, a POSIX path whose first segment happens to
 * be a single letter -- is returned byte-for-byte unchanged.
 *
 * @param platform Defaults to the running platform. Passed explicitly by the tests so the
 *   Windows branch can be exercised from Linux, where it is otherwise unreachable.
 */
export function toNativeRepoPath(
  rawPath: string,
  platform: string = process.platform,
): string {
  if (platform !== "win32") {
    return rawPath;
  }
  return rawPath.replace(MSYS_DRIVE_PREFIX, (_match, drive: string) => `${drive}:/`);
}

/**
 * The absolute path of the repository this file is checked out in, normalised so that
 * `node:fs` and a child process's `cwd` can both accept it.
 *
 * Forward slashes are left as git wrote them. Node accepts them on Windows, and `node:path`
 * `join`/`posix.join` both cope, so the five call sites need no other change.
 */
export function resolveRepoRoot(): string {
  const raw = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  return toNativeRepoPath(raw);
}
