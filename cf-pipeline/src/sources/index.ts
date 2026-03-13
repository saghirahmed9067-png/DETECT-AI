import type { Source } from '../types'
import { TEXT_SOURCES  } from './text'
import { IMAGE_SOURCES } from './image'
import { AUDIO_SOURCES } from './audio'
import { VIDEO_SOURCES } from './video'

export { TEXT_SOURCES, IMAGE_SOURCES, AUDIO_SOURCES, VIDEO_SOURCES }

/**
 * All 57 sources in flat list — workers 1-19 each handle a consecutive slice.
 * Order matters: text(0-25) → image(26-36) → audio(37-48) → video(49-56)
 */
export const ALL_SOURCES: Source[] = [
  ...TEXT_SOURCES,    // indices 0–25  (26 sources)
  ...IMAGE_SOURCES,   // indices 26–36 (11 sources)
  ...AUDIO_SOURCES,   // indices 37–48 (12 sources)
  ...VIDEO_SOURCES,   // indices 49–56 (8 sources)
]

/**
 * Return the sources assigned to a given worker number (1–19).
 * Uses ceil division so all sources are covered with no gaps.
 */
export function getWorkerSources(workerNum: number, totalWorkers = 19): Source[] {
  const perWorker = Math.ceil(ALL_SOURCES.length / totalWorkers)
  const start     = (workerNum - 1) * perWorker
  return ALL_SOURCES.slice(start, start + perWorker)
}
