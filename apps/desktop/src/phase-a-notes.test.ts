/**
 * GRAVITAS Phase A — Knowledge Hub Note Workflow Verification Tests (Gate 1)
 *
 * Verifies:
 * 1. Opening, reading, and editing SQLite-backed note content (originalText)
 * 2. Saving note edits and verifying persistence
 * 3. Store restart / reopen verification (content survives restart)
 * 4. Subject association and tags support
 * 5. Markdown export and import compatibility
 * 6. Companion-created notes appear in the same Knowledge Hub
 * 7. Preservation of existing multiple notes with identical titles (separate records)
 * 8. Safe Markdown renderer behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { IdeasVaultStore } from './assistant/ideasVault.js'
import { renderMarkdownSafe } from './renderer/renderer.js'

describe('GRAVITAS Phase A — Knowledge Hub Note Workflow', () => {
  let tempDir: string
  let vault: IdeasVaultStore

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-phase-a-'))
    vault = new IdeasVaultStore(tempDir)
  })

  afterEach(async () => {
    try {
      vault.getDatabase().close()
    } catch {}
    await rm(tempDir, { recursive: true, force: true })
  })

  it('1. Reads, creates, edits, and saves SQLite-backed Markdown note content', () => {
    // 1. Create a note
    const created = vault.saveIdea({
      collection: 'IDEA',
      title: 'Distributed Systems Architecture',
      originalText: '# Distributed Systems\n\nInitial draft of consensus algorithms.',
      subject: 'Computer Science',
      tags: ['systems', 'distributed'],
    })

    expect(created.id).toBeDefined()
    expect(created.title).toBe('Distributed Systems Architecture')
    expect(created.originalText).toContain('Initial draft')
    expect(created.subject).toBe('Computer Science')
    expect(created.tags).toContain('systems')

    // 2. Edit note content (Markdown body, title, subject, tags)
    const updatedContent = `# Distributed Systems Architecture\n\n## Consensus Algorithms\n- Paxos\n- Raft\n- PBFT\n\n\`\`\`typescript\ninterface Node {\n  id: string;\n  term: number;\n}\n\`\`\``
    const updated = vault.updateIdea({
      id: created.id,
      title: 'Distributed Systems Architecture (Revised)',
      originalText: updatedContent,
      subject: 'CS301 Advanced Systems',
      tags: ['systems', 'distributed', 'consensus', 'raft'],
    })

    expect(updated.id).toBe(created.id)
    expect(updated.title).toBe('Distributed Systems Architecture (Revised)')
    expect(updated.originalText).toBe(updatedContent)
    expect(updated.subject).toBe('CS301 Advanced Systems')
    expect(updated.tags).toContain('consensus')
    expect(updated.tags).toContain('raft')

    // 3. Verify getIdea returns the updated content
    const fetched = vault.getIdea(created.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.title).toBe('Distributed Systems Architecture (Revised)')
    expect(fetched!.originalText).toBe(updatedContent)
  })

  it('2. Persists note edits across store restart (close and reopen)', () => {
    // Create and edit note in first store instance
    const note = vault.saveIdea({
      collection: 'STUDY_NOTE',
      title: 'Quantum Computing Notes',
      originalText: 'Superposition and entanglement basics.',
      subject: 'Physics',
    })

    vault.updateIdea({
      id: note.id,
      title: 'Quantum Computing - Gate Models',
      originalText: '# Quantum Computing Notes\n\nBloch Sphere representation and Hadamard gates.',
      subject: 'PHY401',
      tags: ['quantum', 'physics', 'gates'],
    })

    // Close first store instance
    vault.getDatabase().close()

    // Open second store instance pointing to the exact same directory / database
    const restartedVault = new IdeasVaultStore(tempDir)
    try {
      const persistedNote = restartedVault.getIdea(note.id)
      expect(persistedNote).not.toBeNull()
      expect(persistedNote!.id).toBe(note.id)
      expect(persistedNote!.title).toBe('Quantum Computing - Gate Models')
      expect(persistedNote!.originalText).toBe('# Quantum Computing Notes\n\nBloch Sphere representation and Hadamard gates.')
      expect(persistedNote!.subject).toBe('PHY401')
      expect(persistedNote!.tags).toEqual(expect.arrayContaining(['quantum', 'physics', 'gates']))
      expect(persistedNote!.collection).toBe('STUDY_NOTE')
    } finally {
      restartedVault.getDatabase().close()
    }
  })

  it('3. Supports Markdown export and import roundtrip with metadata', () => {
    const note = vault.saveIdea({
      collection: 'STUDY_NOTE',
      title: 'Algorithms Revision',
      originalText: '# Big-O Complexity\n\n- O(1): Constant\n- O(log n): Binary Search\n- O(n log n): Merge Sort',
      subject: 'Data Structures',
      tags: ['algorithms', 'revision'],
    })

    // Export to markdown string
    const markdown = vault.exportItemToMarkdown(note.id)
    expect(markdown).toContain('title: "Algorithms Revision"')
    expect(markdown).toContain('subject: "Data Structures"')
    expect(markdown).toContain('collection: "STUDY_NOTE"')
    expect(markdown).toContain('O(log n): Binary Search')

    // Export to directory
    const exportDir = join(tempDir, 'export-out')
    const exportResult = vault.exportAllToMarkdownDirectory(exportDir)
    expect(exportResult.exportedCount).toBeGreaterThanOrEqual(1)

    // Import from markdown string
    const imported = vault.importFromMarkdown(markdown)
    expect(imported).toBeDefined()
    expect(imported.title).toBe('Algorithms Revision')
    expect(imported.originalText).toContain('Merge Sort')
  })

  it('4. Preserves multiple separate records with identical titles ("My first note in GRAVITAS")', () => {
    // User scenario: Two distinct records exist with identical title
    const note1 = vault.saveIdea({
      title: 'My first note in GRAVITAS',
      originalText: 'First note content from onboarding wizard.',
      collection: 'IDEA',
    })

    const note2 = vault.saveIdea({
      title: 'My first note in GRAVITAS',
      originalText: 'Second note content from manual creation or companion.',
      collection: 'IDEA',
    })

    expect(note1.id).not.toBe(note2.id)

    // Verify both exist in list
    const all = vault.listIdeas()
    const matching = all.filter((n) => n.title === 'My first note in GRAVITAS')
    expect(matching.length).toBe(2)

    // Verify editing one does not affect the other
    vault.updateIdea({
      id: note1.id,
      title: 'My first note in GRAVITAS (Updated)',
      originalText: 'Updated content of first note.',
    })

    const fetched1 = vault.getIdea(note1.id)
    const fetched2 = vault.getIdea(note2.id)

    expect(fetched1!.title).toBe('My first note in GRAVITAS (Updated)')
    expect(fetched1!.originalText).toBe('Updated content of first note.')

    expect(fetched2!.title).toBe('My first note in GRAVITAS')
    expect(fetched2!.originalText).toBe('Second note content from manual creation or companion.')
  })

  it('5. Companion-created notes appear in the same underlying Knowledge Hub', () => {
    // Note created as if from Floating Companion
    const companionNote = vault.saveIdea({
      collection: 'IDEA',
      title: 'Voice dictated idea from companion',
      originalText: 'Captured quickly while watching a lecture.',
      category: 'study',
      tags: ['companion', 'voice'],
    })

    // Listed in Knowledge Hub
    const allNotes = vault.listIdeas()
    const found = allNotes.find((n) => n.id === companionNote.id)
    expect(found).toBeDefined()
    expect(found!.title).toBe('Voice dictated idea from companion')
    expect(found!.tags).toContain('companion')

    // Can be edited in the Knowledge Hub workspace
    const editedInWorkspace = vault.updateIdea({
      id: companionNote.id,
      title: 'Refined lecture insight',
      originalText: '# Refined Insight\n\nFull notes with equations and diagram references.',
    })

    expect(editedInWorkspace.title).toBe('Refined lecture insight')
    expect(editedInWorkspace.originalText).toContain('diagram references')
  })

  it('6. Safe Markdown renderer renders headers, lists, code, and prevents raw HTML execution', () => {
    const rawMarkdown = `# Main Title\n## Subtitle\n\nParagraph with **bold** and *italic* and \`inline code\`.\n\n- Item 1\n- Item 2\n\n- [ ] Unchecked task\n- [x] Checked task\n\n> Blockquote text\n\n\`\`\`javascript\nconst x = 42;\n\`\`\`\n\n<script>alert("XSS")</script>`

    const html = renderMarkdownSafe(rawMarkdown)

    expect(html).toContain('<h1>Main Title</h1>')
    expect(html).toContain('<h2>Subtitle</h2>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<code>inline code</code>')
    expect(html).toContain('<li>Item 1</li>')
    expect(html).toContain('[ ]')
    expect(html).toContain('[✓]')
    expect(html).toContain('<blockquote>Blockquote text</blockquote>')
    expect(html).toContain('const x = 42;')
    // Raw script tag must be escaped, NEVER executed as HTML
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
