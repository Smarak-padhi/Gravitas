/**
 * GRAVITAS 2.0 — Knowledge Hub, Spaced Repetition & Engineering Projects Engine (Phase 05)
 *
 * Provides:
 * - Active-recall spaced repetition flashcard decks with KaTeX math rendering
 * - Bidirectional linking between study notes and engineering tasks
 * - Obsidian-compatible Markdown export and import with YAML frontmatter
 * - Engineering project tracker models and status metrics
 */

import type { StudyNoteItem } from './FloatingPanels.js'

export interface StudyFlashcard {
  readonly id: string
  readonly subject: string
  readonly topic: string
  readonly question: string
  readonly solution: string
  easeFactor: number
  intervalDays: number
  reviewCount: number
  lastReviewed?: string
}

export interface EngineeringProject {
  readonly id: string
  readonly name: string
  readonly status: 'IN_PROGRESS' | 'DONE' | 'PLANNING'
  readonly progressPercent: number
  readonly description: string
  readonly techStack: readonly string[]
  readonly linkedNoteId?: string
}

export const DEFAULT_FLASHCARDS: Record<string, StudyFlashcard[]> = {
  Algorithms: [
    {
      id: 'fc_algo_1',
      subject: 'Algorithms',
      topic: 'Divide & Conquer',
      question: 'What is the condition and asymptotic complexity for **Case 2** of the Master Theorem?',
      solution: 'For recurrence $T(n) = aT(n/b) + f(n)$:\n\nIf $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$ where $k \\ge 0$, then:\n$$T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$$\n\n*Example*: MergeSort has $a=2, b=2, k=0 \\implies T(n) = \\Theta(n \\log n)$.',
      easeFactor: 2.5,
      intervalDays: 3,
      reviewCount: 2,
    },
    {
      id: 'fc_algo_2',
      subject: 'Algorithms',
      topic: 'Graph Algorithms',
      question: 'What is the tight asymptotic time complexity of **Dijkstra\'s Algorithm** using a binary Min-Heap vs an adjacency matrix?',
      solution: '- **Min-Heap**: $\\mathcal{O}((V + E) \\log V)$\n- **Fibonacci Heap**: $\\mathcal{O}(E + V \\log V)$\n- **Adjacency Matrix**: $\\mathcal{O}(V^2)$ (optimal for dense graphs where $E = \\Theta(V^2)$).',
      easeFactor: 2.5,
      intervalDays: 1,
      reviewCount: 1,
    },
    {
      id: 'fc_algo_3',
      subject: 'Algorithms',
      topic: 'Dynamic Programming',
      question: 'In Floyd-Warshall all-pairs shortest paths, what is the recurrence relation for $D^{(k)}_{ij}$?',
      solution: '$$D^{(k)}_{ij} = \\min\\left( D^{(k-1)}_{ij},\\; D^{(k-1)}_{ik} + D^{(k-1)}_{kj} \\right)$$\nwhere $D^{(0)}_{ij}$ is the edge weight matrix with $D^{(0)}_{ii} = 0$. Total running time is $\\mathcal{O}(V^3)$ with $\\mathcal{O}(V^2)$ memory.',
      easeFactor: 2.5,
      intervalDays: 7,
      reviewCount: 3,
    },
  ],
  'Operating Systems': [
    {
      id: 'fc_os_1',
      subject: 'Operating Systems',
      topic: 'Virtual Memory',
      question: 'How does the **Clock Algorithm (Second Chance)** approximate LRU, and what is its space overhead?',
      solution: 'Maintains a circular list of page frames with a single **reference bit** ($R \\in \\{0, 1\\}$):\n1. When examining a frame, if $R = 1$, set $R \\leftarrow 0$ and advance the clock hand.\n2. If $R = 0$, select this frame for eviction.\n\n**Overhead**: Only **1 bit per page frame**, compared to timestamping or pointer chains in exact LRU.',
      easeFactor: 2.5,
      intervalDays: 4,
      reviewCount: 2,
    },
    {
      id: 'fc_os_2',
      subject: 'Operating Systems',
      topic: 'Memory Management',
      question: 'What is the formula for calculating the **Virtual Page Number (VPN)** and **Offset** given virtual address $VA$ and page size $P = 2^p$?',
      solution: '$$\\text{VPN} = \\lfloor VA / P \\rfloor = VA \\gg p$$\n$$\\text{Offset} = VA \\pmod P = VA \\,\\&\\, (P - 1)$$\nPhysical Address = $(\\text{PFN} \\ll p) \\mid \\text{Offset}$.',
      easeFactor: 2.5,
      intervalDays: 2,
      reviewCount: 1,
    },
  ],
  Databases: [
    {
      id: 'fc_db_1',
      subject: 'Databases',
      topic: 'Storage & Indexing',
      question: 'What is the maximum height of a **B+ Tree** of order $M$ containing $N$ key values?',
      solution: 'Internal nodes have minimum fanout $\\lceil M/2 \\rceil$. Maximum height:\n$$\\text{Height} \\le \\lceil \\log_{\\lceil M/2 \\rceil} ((N+1)/2) \\rceil$$\nSearch I/O cost is bounded by $\\mathcal{O}(\\log_M N)$ disk page reads.',
      easeFactor: 2.5,
      intervalDays: 5,
      reviewCount: 3,
    },
    {
      id: 'fc_db_2',
      subject: 'Databases',
      topic: 'WAL Protocol',
      question: 'State the fundamental invariant of the **Write-Ahead Logging (WAL)** protocol.',
      solution: '**WAL Invariant**:\nAny modification to a database page must be flushed to non-volatile log storage **before** the dirty page itself is written to disk.\n\nA transaction commits only after its `COMMIT` log record reaches durable storage.',
      easeFactor: 2.5,
      intervalDays: 6,
      reviewCount: 4,
    },
  ],
}

export const DEFAULT_ENGINEERING_PROJECTS: EngineeringProject[] = [
  {
    id: 'proj_gravitas_studio',
    name: 'GRAVITAS 2.0 Living Studio',
    status: 'IN_PROGRESS',
    progressPercent: 88,
    description: 'Private desktop engineering studio with illustrated spatial environment, 2D mascots, and SQLite WAL persistence.',
    techStack: ['Electron', 'React', 'TypeScript', 'KaTeX', 'SQLite WAL', 'Three.js'],
    linkedNoteId: 'note_algorithms_core',
  },
  {
    id: 'proj_wal_storage_engine',
    name: 'Distributed WAL Storage Engine',
    status: 'IN_PROGRESS',
    progressPercent: 94,
    description: 'High-throughput transactional append-only log with BEGIN IMMEDIATE transactions and checkpointing.',
    techStack: ['C++', 'SQLite', 'POSIX AIO', 'Zero-Copy Ring Buffer'],
    linkedNoteId: 'note_databases_wal',
  },
  {
    id: 'proj_virtual_memory_sim',
    name: 'Virtual Memory & Page Replacement Simulator',
    status: 'PLANNING',
    progressPercent: 45,
    description: 'Benchmark harness comparing LRU, Clock algorithm, and optimal MIN under memory pressure traces.',
    techStack: ['Rust', 'SimPy', 'Linux cgroups v2'],
    linkedNoteId: 'note_os_virtual_memory',
  },
]

/**
 * Generate Obsidian-compatible Markdown with YAML Frontmatter and WikiLinks.
 */
export function exportToObsidianMarkdown(note: StudyNoteItem, linkedTaskTitles: readonly string[] = []): string {
  const dateStr = new Date().toISOString().slice(0, 10)
  const yamlFrontmatter = [
    '---',
    `title: "${note.title.replace(/"/g, '\\"')}"`,
    `subject: "${note.subject}"`,
    `id: "${note.id}"`,
    `created: "${dateStr}"`,
    `updated: "${dateStr}"`,
    'tags:',
    `  - study`,
    `  - ${note.subject.toLowerCase().replace(/\s+/g, '-')}`,
    'vault: "gravitas-knowledge-hub"',
    'generator: "GRAVITAS 2.0 Living Studio"',
    '---',
    '',
  ].join('\n')

  let content = yamlFrontmatter + note.content

  if (linkedTaskTitles.length > 0) {
    content += '\n\n## Linked Engineering Tasks\n'
    for (const title of linkedTaskTitles) {
      content += `- [[${title}]]\n`
    }
  }

  return content
}

/**
 * Parse an imported Markdown file with Obsidian-compatible YAML frontmatter.
 */
export function parseObsidianMarkdown(rawMarkdown: string): {
  title: string
  subject: string
  content: string
  tags: string[]
} {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/
  const match = rawMarkdown.match(frontmatterRegex)

  let title = 'Untitled Note'
  let subject = 'General'
  const tags: string[] = []
  let bodyContent = rawMarkdown

  if (match) {
    const yamlBlock = match[1]
    bodyContent = rawMarkdown.slice(match[0].length)

    const titleMatch = yamlBlock.match(/title:\s*["']?([^"'\n\r]+)["']?/)
    if (titleMatch) title = titleMatch[1].trim()

    const subjectMatch = yamlBlock.match(/subject:\s*["']?([^"'\n\r]+)["']?/)
    if (subjectMatch) subject = subjectMatch[1].trim()

    const tagMatches = yamlBlock.match(/-\s*([a-zA-Z0-9_-]+)/g)
    if (tagMatches) {
      for (const t of tagMatches) {
        tags.push(t.replace(/^-\s*/, '').trim())
      }
    }
  } else {
    // If no frontmatter, extract first h1 as title
    const h1Match = rawMarkdown.match(/^#\s+(.+)$/m)
    if (h1Match) title = h1Match[1].trim()
  }

  return {
    title,
    subject,
    content: bodyContent.trim(),
    tags,
  }
}
