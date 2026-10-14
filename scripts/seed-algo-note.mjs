import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'

const dbPath = path.join(process.env.APPDATA, 'gravitas', 'ideas-vault.db')
const db = new DatabaseSync(dbPath)

const existing = db.prepare(
  "SELECT id FROM ideas_vault WHERE collection = 'STUDY_NOTE' AND (subject LIKE '%Algo%' OR title LIKE '%Algo%') LIMIT 1"
).get()

if (!existing) {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO ideas_vault (
      id, collection, title, original_text, summary, created_at, updated_at,
      category, tags_json, persistence_status, subject, topic, completed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'note_algorithms_core',
    'STUDY_NOTE',
    'Algorithms: Divide-and-Conquer & Master Theorem Notes',
    `# Divide and Conquer Analysis

## Master Theorem Form
For recurrence relations of the form:
$$T(n) = aT(n/b) + f(n)$$
where $a \\ge 1$, $b > 1$:

1. **Case 1**: If $f(n) = O(n^{\\log_b a - \\epsilon})$ for some constant $\\epsilon > 0$, then $T(n) = \\Theta(n^{\\log_b a})$.
2. **Case 2**: If $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$ where $k \\ge 0$, then $T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$.
3. **Case 3**: If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$ for some constant $\\epsilon > 0$, and regularity condition $af(n/b) \\le cf(n)$ holds, then $T(n) = \\Theta(f(n))$.

## Key Design Paradigms
- **Divide and Conquer**: MergeSort ($O(n \\log n)$), QuickSort ($O(n \\log n)$ average), Karatsuba ($O(n^{1.585})$)
- **Dynamic Programming**: Memoization vs Tabulation, optimal substructure, overlapping subproblems.
- **Greedy Strategy**: Local optimal choice leads to global optimum (Dijkstra, Kruskal, Prim).`,
    'Comprehensive engineering study notes for Algorithms: Master theorem, recurrence asymptotic bounds, Divide & Conquer algorithms, and complexity proofs.',
    now,
    now,
    'study',
    '["algorithms","divide-and-conquer","complexity","study-notes"]',
    'PERSISTED',
    'Algorithms',
    'Divide and Conquer',
    0
  )
  console.log('Seeded Algorithms note into real AppData DB')
} else {
  console.log('Algorithms note already present:', existing.id)
}
