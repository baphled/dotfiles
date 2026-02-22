import { detectCodebaseLanguages } from '../codebase-detector'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, it, expect, afterEach } from 'bun:test'

/**
 * Test helper: create a temporary project directory with marker files.
 */
function createTempProjectDir(markerFiles: string[]): string {
  const dir = join(tmpdir(), `codebase-detect-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })

  for (const file of markerFiles) {
    writeFileSync(join(dir, file), '', 'utf-8')
  }

  return dir
}

function cleanupDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}

describe('detectCodebaseLanguages — Single Language Detection', () => {
  let tempDir: string

  afterEach(() => {
    if (tempDir) cleanupDir(tempDir)
  })

  it('detects Go when go.mod is present', async () => {
    tempDir = createTempProjectDir(['go.mod'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.skills).toEqual(['golang'])
  })

  it('detects JavaScript when package.json is present', async () => {
    tempDir = createTempProjectDir(['package.json'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.skills).toEqual(['javascript'])
  })

  it('detects Ruby when Gemfile is present', async () => {
    tempDir = createTempProjectDir(['Gemfile'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.skills).toEqual(['ruby'])
  })

  it('detects C++ and PlatformIO when platformio.ini is present', async () => {
    tempDir = createTempProjectDir(['platformio.ini'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.skills).toEqual(['cpp', 'platformio'])
  })

  it('detects Nix when flake.nix is present', async () => {
    tempDir = createTempProjectDir(['flake.nix'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.skills).toEqual(['nix'])
  })

  it('detects Nix when shell.nix is present', async () => {
    tempDir = createTempProjectDir(['shell.nix'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.skills).toEqual(['nix'])
  })
})

describe('detectCodebaseLanguages — Multi-Language Detection', () => {
  let tempDir: string

  afterEach(() => {
    if (tempDir) cleanupDir(tempDir)
  })

  it('detects multiple languages when go.mod and package.json are present', async () => {
    tempDir = createTempProjectDir(['go.mod', 'package.json'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.skills).toContain('golang')
    expect(result.skills).toContain('javascript')
    expect(result.skills).toHaveLength(2)
  })

  it('deduplicates skills when flake.nix and shell.nix are both present', async () => {
    tempDir = createTempProjectDir(['flake.nix', 'shell.nix'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.skills).toEqual(['nix'])
  })
})

describe('detectCodebaseLanguages — Empty and Error Cases', () => {
  let tempDir: string

  afterEach(() => {
    if (tempDir) cleanupDir(tempDir)
  })

  it('returns empty skills when no marker files are present', async () => {
    tempDir = createTempProjectDir([])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.skills).toEqual([])
  })

  it('returns empty skills for a nonexistent path (no throw)', async () => {
    const result = await detectCodebaseLanguages('/nonexistent/path/that/does/not/exist')

    expect(result.skills).toEqual([])
  })

  it('returns empty skills for an empty string path (no throw)', async () => {
    const result = await detectCodebaseLanguages('')

    expect(result.skills).toEqual([])
  })
})

describe('detectCodebaseLanguages — Languages Field', () => {
  let tempDir: string

  afterEach(() => {
    if (tempDir) cleanupDir(tempDir)
  })

  it('populates languages field matching skills', async () => {
    tempDir = createTempProjectDir(['go.mod', 'package.json'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.languages).toContain('golang')
    expect(result.languages).toContain('javascript')
    expect(result.languages).toHaveLength(2)
  })

  it('returns empty languages when no marker files are present', async () => {
    tempDir = createTempProjectDir([])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.languages).toEqual([])
  })

  it('deduplicates languages when multiple markers map to the same language', async () => {
    tempDir = createTempProjectDir(['flake.nix', 'shell.nix'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.languages).toEqual(['nix'])
  })
})

describe('Codebase Detection — must use project directory, not process.cwd()', () => {
  let tempDir: string

  afterEach(() => {
    if (tempDir) cleanupDir(tempDir)
  })

  it('must not detect languages from directories other than the provided project path', async () => {
    // The detector must only check the provided projectRoot, never process.cwd().
    // This test verifies that a Go-only project does not pick up javascript
    // from ~/.config/opencode/package.json (the CWD bug).
    tempDir = createTempProjectDir(['go.mod'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.skills).toContain('golang')
    expect(result.skills).not.toContain('javascript')
  })

  it('calling with a Go project directory detects only golang', async () => {
    // The detector itself works correctly when given the right path.
    // This proves the fix: pass _input.directory instead of process.cwd().
    tempDir = createTempProjectDir(['go.mod'])

    const result = await detectCodebaseLanguages(tempDir)

    expect(result.skills).toEqual(['golang'])
    expect(result.skills).not.toContain('javascript')
  })
})
