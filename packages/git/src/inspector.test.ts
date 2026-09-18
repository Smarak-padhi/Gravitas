import { describe, it, expect } from 'vitest'
import { parseGitRemotes, parsePorcelainStatusV2 } from './inspector.js'

describe('Repository Inspector Parser Logic', () => {
  describe('parsePorcelainStatusV2', () => {
    it('returns zero counts for clean status output', () => {
      const output = [
        '# branch.oid 778a8a5270ece822f822f214e52db72bb8265a1d',
        '# branch.head main',
        '# branch.upstream origin/main',
        '# branch.ab +0 -0',
      ].join('\n')

      const counts = parsePorcelainStatusV2(output)
      expect(counts.stagedCount).toBe(0)
      expect(counts.unstagedCount).toBe(0)
      expect(counts.untrackedCount).toBe(0)
    })

    it('accurately counts staged, unstaged, and untracked entries', () => {
      const output = [
        '# branch.oid 1234567890abcdef',
        '# branch.head feature',
        '1 M. N... 100644 100644 100644 abc def src/staged-only.ts',
        '1 .M N... 100644 100644 100644 abc def src/unstaged-only.ts',
        '1 MM N... 100644 100644 100644 abc def src/both.ts',
        '2 R. N... 100644 100644 100644 abc def R100 src/new.ts\0src/old.ts',
        'u UU N... 100644 100644 100644 100644 abc def ghi src/conflict.ts',
        '? untracked-1.txt',
        '? untracked-2.log',
      ].join('\n')

      const counts = parsePorcelainStatusV2(output)
      // Staged entries:
      // '1 M.' -> +1
      // '1 MM' -> +1
      // '2 R.' -> +1
      // 'u UU' -> +1
      // Total staged: 4
      expect(counts.stagedCount).toBe(4)

      // Unstaged entries:
      // '1 .M' -> +1
      // '1 MM' -> +1
      // 'u UU' -> +1
      // Total unstaged: 3
      expect(counts.unstagedCount).toBe(3)

      // Untracked entries:
      // 2 untracked lines
      expect(counts.untrackedCount).toBe(2)
    })
  })

  describe('parseGitRemotes', () => {
    it('parses origin and upstream fetch and push URLs', () => {
      const output = [
        'origin\thttps://github.com/org/repo.git (fetch)',
        'origin\thttps://github.com/org/repo.git (push)',
        'upstream\thttps://github.com/upstream/repo.git (fetch)',
        'upstream\thttps://github.com/upstream/repo.git (push)',
      ].join('\n')

      const remotes = parseGitRemotes(output)
      expect(remotes).toHaveLength(2)

      const origin = remotes.find((r) => r.name === 'origin')
      expect(origin).toBeDefined()
      expect(origin?.fetchUrl).toBe('https://github.com/org/repo.git')
      expect(origin?.pushUrl).toBe('https://github.com/org/repo.git')

      const upstream = remotes.find((r) => r.name === 'upstream')
      expect(upstream).toBeDefined()
      expect(upstream?.fetchUrl).toBe('https://github.com/upstream/repo.git')
    })
  })
})
