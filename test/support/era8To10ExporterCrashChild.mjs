import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  acquireDestinationLock,
  deriveExportJobs,
  prepareManifestLastPromotion,
  promoteManifestLast,
  releaseDestinationLock,
  validateProductionManifest,
} from "../../scripts/export-era8-10-building-models.mjs";

const [, , mode, repositoryRoot, fixtureRoot, countText, ownerPath] = process.argv;

const io = {
  ...fs,
  async fsyncDirectory(path) {
    const handle = await fs.open(path, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  },
};

const metadataRelative =
  "apps/web/src/city/art/building-sources/era-08-10-gridwork-export-metadata.json";
const destinationRelative = "apps/web/src/city/art";
const lockBasename = ".era8-10-export.lock";
const stageOwnerBasename = ".era8-10-stage-owner.json";
const noncePattern = /^[a-f0-9]{32}$/;

function exactKeys(value, expected, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())
  ) {
    throw new Error(`${label} keys are invalid`);
  }
}

function bigintEquals(value, expected, label) {
  if (typeof value !== "string" || BigInt(value) !== expected) {
    throw new Error(`${label} identity changed`);
  }
}

async function validateStageOwnership(owner) {
  if (
    typeof owner.stageRoot !== "string" ||
    typeof owner.stageNonce !== "string" ||
    !noncePattern.test(owner.stageNonce)
  ) {
    throw new Error("interruption stage ownership record is malformed");
  }
  const temporaryRoot = await fs.realpath(tmpdir());
  const stageRoot = resolve(owner.stageRoot);
  const physicalStage = await fs.realpath(stageRoot);
  const fromTemporaryRoot = relative(temporaryRoot, physicalStage);
  if (
    fromTemporaryRoot === "" ||
    fromTemporaryRoot === ".." ||
    fromTemporaryRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromTemporaryRoot)
  ) {
    throw new Error("interruption stage is outside the OS temporary directory");
  }
  const expectedName = new RegExp(`^era8-10-stage-${owner.stageNonce}-[A-Za-z0-9]{6}$`);
  if (
    !expectedName.test(basename(stageRoot)) ||
    physicalStage !== (await fs.realpath(stageRoot))
  ) {
    throw new Error("interruption stage prefix/realpath is invalid");
  }
  const stageStat = await fs.lstat(stageRoot, { bigint: true });
  if (!stageStat.isDirectory() || stageStat.isSymbolicLink()) {
    throw new Error("interruption stage is not an owned real directory");
  }
  bigintEquals(owner.stageDevice, stageStat.dev, "interruption stage device");
  bigintEquals(owner.stageInode, stageStat.ino, "interruption stage inode");
  const markerPath = join(stageRoot, stageOwnerBasename);
  const markerStat = await fs.lstat(markerPath, { bigint: true });
  if (!markerStat.isFile() || markerStat.isSymbolicLink()) {
    throw new Error("interruption stage owner marker is not a regular file");
  }
  bigintEquals(owner.stageMarkerDevice, markerStat.dev, "stage marker device");
  bigintEquals(owner.stageMarkerInode, markerStat.ino, "stage marker inode");
  const marker = JSON.parse(await fs.readFile(markerPath, "utf8"));
  exactKeys(marker, ["schema", "nonce", "mode"], "stage owner marker");
  if (
    marker.schema !== 1 ||
    marker.nonce !== owner.stageNonce ||
    marker.mode !== "interruption-stage"
  ) {
    throw new Error("interruption stage owner marker payload changed");
  }
  return stageRoot;
}

if (mode === "validate") {
  await validateProductionManifest(repositoryRoot, io);
  process.exit(0);
}

if (mode === "release") {
  if (dirname(resolve(ownerPath)) !== resolve(repositoryRoot)) {
    throw new Error("interruption owner record must be a direct repository-root child");
  }
  const owner = JSON.parse(await fs.readFile(ownerPath, "utf8"));
  exactKeys(
    owner,
    [
      "schema",
      "mode",
      "lockPath",
      "nonce",
      "lockDevice",
      "lockInode",
      "lockOwnerDevice",
      "lockOwnerInode",
      "stageRoot",
      "stageNonce",
      "stageDevice",
      "stageInode",
      "stageMarkerDevice",
      "stageMarkerInode",
    ],
    "interruption owner record",
  );
  const canonicalLockPath = join(
    resolve(repositoryRoot),
    destinationRelative,
    lockBasename,
  );
  if (
    owner.schema !== 1 ||
    owner.mode !== "interruption-owner" ||
    resolve(owner.lockPath) !== canonicalLockPath ||
    !noncePattern.test(owner.nonce)
  ) {
    throw new Error("interruption owner lock path/payload is not canonical");
  }
  const ownedStage = await validateStageOwnership(owner);
  await releaseDestinationLock(
    {
      path: canonicalLockPath,
      ownerPath: join(canonicalLockPath, "owner.json"),
      nonce: owner.nonce,
      mode: "promotion",
      device: BigInt(owner.lockDevice),
      inode: BigInt(owner.lockInode),
      ownerDevice: BigInt(owner.lockOwnerDevice),
      ownerInode: BigInt(owner.lockOwnerInode),
    },
    io,
  );
  await validateStageOwnership(owner);
  await fs.rm(ownedStage, { recursive: true, force: true });
  await fs.rm(ownerPath, { force: true });
  process.exit(0);
}

if (mode !== "publish") throw new Error(`unsupported crash-child mode ${mode}`);
const invalidStage = countText === "invalid-stage";
const interruptAfter = invalidStage ? null : Number(countText);
if (
  !invalidStage &&
  (!Number.isSafeInteger(interruptAfter) || interruptAfter < 0 || interruptAfter > 88)
) {
  throw new Error(`invalid promoted-count boundary ${countText}`);
}

const jobs = deriveExportJobs();
const relativeFiles = [...jobs.map((job) => job.relativeFile), metadataRelative];
const stageNonce = randomBytes(16).toString("hex");
const stageRoot = await fs.mkdtemp(join(tmpdir(), `era8-10-stage-${stageNonce}-`));
let lock = null;
try {
  const stageStat = await fs.lstat(stageRoot, { bigint: true });
  const stageMarkerPath = join(stageRoot, stageOwnerBasename);
  await fs.writeFile(
    stageMarkerPath,
    `${JSON.stringify({
      schema: 1,
      nonce: stageNonce,
      mode: "interruption-stage",
    })}\n`,
    { flag: "wx", mode: 0o600 },
  );
  const stageMarkerStat = await fs.lstat(stageMarkerPath, { bigint: true });
  for (const relativeFile of relativeFiles) {
    const stagedPath = join(stageRoot, relativeFile);
    await fs.mkdir(dirname(stagedPath), { recursive: true });
    const sourcePath = join(fixtureRoot, relativeFile);
    const sourceStat = await fs.lstat(sourcePath);
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
      throw new Error(`fixture source is not a regular file: ${relativeFile}`);
    }
    await fs.copyFile(sourcePath, stagedPath, constants.COPYFILE_EXCL);
  }

  const metadata = JSON.parse(await fs.readFile(join(stageRoot, metadataRelative), "utf8"));
  const rows = new Map(metadata.outputs.map((row) => [row.file, row]));
  const entries = jobs.map((job) => {
    const row = rows.get(job.relativeFile);
    if (!row) throw new Error(`fixture metadata is missing ${job.relativeFile}`);
    return {
      relativeFile: job.relativeFile,
      stagedPath: join(stageRoot, job.relativeFile),
      finalPath: join(repositoryRoot, job.relativeFile),
      sha256: row.sha256,
      bytes: row.bytes,
    };
  });
  const metadataBytes = await fs.readFile(join(stageRoot, metadataRelative));
  const metadataEntry = {
    relativeFile: metadataRelative,
    stagedPath: join(stageRoot, metadataRelative),
    finalPath: join(repositoryRoot, metadataRelative),
    sha256: (await import("node:crypto"))
      .createHash("sha256")
      .update(metadataBytes)
      .digest("hex"),
    bytes: metadataBytes.byteLength,
  };

  const destinationRoot = join(repositoryRoot, "apps/web/src/city/art");
  if (invalidStage) {
    await fs.writeFile(join(stageRoot, jobs[0].relativeFile), "invalid after staging");
  }
  const preparedPlan = await prepareManifestLastPromotion(
    { mode: "production", entries, metadata: metadataEntry },
    destinationRoot,
    io,
  );
  lock = await acquireDestinationLock({ destinationRoot, mode: "promotion", io });
  try {
    await fs.writeFile(
      ownerPath,
      JSON.stringify({
        schema: 1,
        mode: "interruption-owner",
        lockPath: join(resolve(repositoryRoot), destinationRelative, lockBasename),
        nonce: lock.nonce,
        lockDevice: lock.device.toString(),
        lockInode: lock.inode.toString(),
        lockOwnerDevice: lock.ownerDevice.toString(),
        lockOwnerInode: lock.ownerInode.toString(),
        stageRoot,
        stageNonce,
        stageDevice: stageStat.dev.toString(),
        stageInode: stageStat.ino.toString(),
        stageMarkerDevice: stageMarkerStat.dev.toString(),
        stageMarkerInode: stageMarkerStat.ino.toString(),
      }),
      { flag: "wx", mode: 0o600 },
    );
    await promoteManifestLast(preparedPlan, lock, {
      io,
      boundary: async (name) => {
        if (
          interruptAfter !== null &&
          interruptAfter < 88 &&
          name === `after-promoted-${interruptAfter}`
        ) {
          process.exit(75);
        }
      },
    });
  } finally {
    await releaseDestinationLock(lock, io);
    lock = null;
  }
  await fs.rm(ownerPath, { force: true });
} finally {
  await fs.rm(stageRoot, { recursive: true, force: true });
}
