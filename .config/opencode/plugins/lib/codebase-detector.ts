/**
 * Codebase Language Detector
 *
 * Detects project languages by checking for marker files (go.mod, package.json,
 * Gemfile, platformio.ini, flake.nix, shell.nix) in the project root directory.
 * Returns deduplicated skill names for use in skill selection.
 *
 * Design: existence checks only — no recursion, no file content parsing.
 */

import { existsSync } from 'fs'
import { join } from 'path'

export interface CodebaseDetectionResult {
  languages: string[]
  skills: string[]
}

interface FileMarker {
  file: string
  skills: string[]
}

const FILE_MARKERS: FileMarker[] = [
  { file: 'go.mod', skills: ['golang'] },
  { file: 'package.json', skills: ['javascript'] },
  { file: 'Gemfile', skills: ['ruby'] },
  { file: 'platformio.ini', skills: ['cpp', 'platformio'] },
  { file: 'flake.nix', skills: ['nix'] },
  { file: 'shell.nix', skills: ['nix'] },
]

/**
 * Detect codebase languages from marker files in the project root.
 *
 * Checks for known marker files (go.mod, package.json, etc.) and returns
 * the corresponding skill names, deduplicated. Never throws — returns
 * an empty result on any error or invalid path.
 */
export async function detectCodebaseLanguages(
  projectRoot: string
): Promise<CodebaseDetectionResult> {
  const emptyResult: CodebaseDetectionResult = { languages: [], skills: [] }

  if (!projectRoot) {
    return emptyResult
  }

  try {
    if (!existsSync(projectRoot)) {
      return emptyResult
    }

    const detectedSkills = new Set<string>()

    for (const marker of FILE_MARKERS) {
      const markerPath = join(projectRoot, marker.file)

      if (existsSync(markerPath)) {
        for (const skill of marker.skills) {
          detectedSkills.add(skill)
        }
      }
    }

    const skills = Array.from(detectedSkills)

    return {
      languages: skills,
      skills,
    }
  } catch {
    return emptyResult
  }
}
