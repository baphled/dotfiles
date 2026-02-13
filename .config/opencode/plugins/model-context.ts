import type { Plugin } from "@opencode-ai/plugin"
import { existsSync, readFileSync } from "fs"

const CACHE_DIR = `${process.env.HOME}/.cache/opencode`
const MODELS_CACHE = `${CACHE_DIR}/models.json`
const MODELS_DIFF = `${CACHE_DIR}/models-diff.json`

export const ModelContextPlugin: Plugin = async () => {
  return {
    "shell.env": async (input, output) => {
      // Inject cache paths for scripts to access programmatically
      output.env.OPENCODE_MODELS_CACHE = MODELS_CACHE
      output.env.OPENCODE_MODELS_DIFF = MODELS_DIFF
      
      // Inject model count if cache exists
      if (existsSync(MODELS_CACHE)) {
        try {
          const cache = JSON.parse(readFileSync(MODELS_CACHE, "utf-8"))
          output.env.OPENCODE_MODEL_COUNT = String(cache.total_count || 0)
        } catch {
          // If cache is malformed, set count to 0
          output.env.OPENCODE_MODEL_COUNT = "0"
        }
      } else {
        // If cache doesn't exist yet, set count to 0
        output.env.OPENCODE_MODEL_COUNT = "0"
      }
      
      // Check sync status from diff file
      if (existsSync(MODELS_DIFF)) {
        try {
          const diff = JSON.parse(readFileSync(MODELS_DIFF, "utf-8"))
          // Status is "pending" if changes detected, "current" if up-to-date
          output.env.OPENCODE_SYNC_STATUS = diff.has_changes ? "pending" : "current"
          output.env.OPENCODE_LAST_SYNC = diff.timestamp || "unknown"
        } catch {
          // If diff file is malformed, status is unknown
          output.env.OPENCODE_SYNC_STATUS = "unknown"
        }
      } else {
        // If diff file doesn't exist, status is unknown
        output.env.OPENCODE_SYNC_STATUS = "unknown"
      }
    }
  }
}
