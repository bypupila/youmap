import { mkdir, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";
import type { ChannelAnalytics } from "@/lib/analytics";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

export interface PreviewSessionData {
  id: string;
  created_at: string;
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
  analytics: ChannelAnalytics;
  importedVideos: number;
  mappedVideos: number;
  skippedVideos: number;
}

const PREVIEW_DIR = path.join(tmpdir(), "travelyourmap-preview-sessions");

export async function createPreviewSession(
  input: Omit<PreviewSessionData, "id" | "created_at">
): Promise<PreviewSessionData> {
  const session: PreviewSessionData = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    ...input,
  };

  await mkdir(PREVIEW_DIR, { recursive: true });
  await writeFile(path.join(PREVIEW_DIR, `${session.id}.json`), JSON.stringify(session), "utf8");

  return session;
}

export async function readPreviewSession(id: string): Promise<PreviewSessionData | null> {
  if (!id) return null;

  try {
    const raw = await readFile(path.join(PREVIEW_DIR, `${id}.json`), "utf8");
    return JSON.parse(raw) as PreviewSessionData;
  } catch {
    return null;
  }
}
