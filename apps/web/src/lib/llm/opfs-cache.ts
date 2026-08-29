/**
 * OPFS (Origin Private File System) cache for model weights + a tiny sidecar
 * that records the last successful load timestamp. We use OPFS rather than
 * IndexedDB / Cache API because Safari's behaviour with large binary blobs is
 * materially better on OPFS, and WebLLM ships with an `OPFS` model_list option
 * that consumes exactly this layout.
 *
 * cavetail: this is a deliberate thin wrapper. The shape of stored files
 * matches the MLC WebLLM `OPFS` model_list convention — one file per weight
 * shard plus a JSON metadata sidecar. If you change the layout, update both
 * the read and write paths in lockstep.
 */
import type { ModelId } from "./types";

const ROOT_DIR = "webllm";
const MODELS_DIR = "models";
const META_FILE = "meta.json";
const STAMP_FILE = "last-loaded.json";

export type OpfsMeta = {
  modelId: ModelId;
  /** SHA-256 hex of every weight file concatenated in shard order. */
  contentHash: string;
  /** Total bytes of the cached weights. */
  totalBytes: number;
  /** ISO timestamp the model was first cached. */
  cachedAt: number;
};

export type OpfsStamp = { lastLoadedAt: number };

async function getRoot(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(ROOT_DIR, { create: true });
  return dir;
}

async function getModelsDir(create: boolean): Promise<FileSystemDirectoryHandle> {
  const root = await getRoot();
  return root.getDirectoryHandle(MODELS_DIR, { create });
}

async function getModelDir(
  modelId: ModelId,
  create: boolean,
): Promise<FileSystemDirectoryHandle> {
  const models = await getModelsDir(create);
  return models.getDirectoryHandle(modelId, { create });
}

export async function isModelCached(modelId: ModelId): Promise<boolean> {
  try {
    const dir = await getModelDir(modelId, false);
    await dir.getFileHandle(META_FILE);
    return true;
  } catch {
    return false;
  }
}

export async function readMeta(modelId: ModelId): Promise<OpfsMeta | null> {
  try {
    const dir = await getModelDir(modelId, false);
    const fh = await dir.getFileHandle(META_FILE);
    const file = await fh.getFile();
    return (await file.text()) as unknown as OpfsMeta;
  } catch {
    return null;
  }
}

export async function writeMeta(modelId: ModelId, meta: OpfsMeta): Promise<void> {
  const dir = await getModelDir(modelId, true);
  const fh = await dir.getFileHandle(META_FILE, { create: true });
  const w = await fh.createWritable();
  await w.write(JSON.stringify(meta));
  await w.close();
}

export async function readStamp(modelId: ModelId): Promise<OpfsStamp | null> {
  try {
    const dir = await getModelDir(modelId, false);
    const fh = await dir.getFileHandle(STAMP_FILE);
    const file = await fh.getFile();
    return JSON.parse(await file.text()) as OpfsStamp;
  } catch {
    return null;
  }
}

export async function writeStamp(modelId: ModelId, stamp: OpfsStamp): Promise<void> {
  const dir = await getModelDir(modelId, true);
  const fh = await dir.getFileHandle(STAMP_FILE, { create: true });
  const w = await fh.createWritable();
  await w.write(JSON.stringify(stamp));
  await w.close();
}

export async function clearModel(modelId: ModelId): Promise<void> {
  try {
    const models = await getModelsDir(false);
    await models.removeEntry(modelId, { recursive: true });
  } catch {
    // entry didn't exist; nothing to clear
  }
}
