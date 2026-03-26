export type DiffType = 'equal' | 'add' | 'remove' | 'change'

export interface SideBySideDiffRow {
  type: DiffType
  originalLineNumber?: number
  currentLineNumber?: number
  originalText: string
  currentText: string
}

function buildLcsTable(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const table = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        table[i][j] = table[i + 1][j + 1] + 1
      } else {
        table[i][j] = Math.max(table[i + 1][j], table[i][j + 1])
      }
    }
  }

  return table
}

interface RawOp {
  op: 'equal' | 'add' | 'remove'
  text: string
}

function backtrackOps(a: string[], b: string[], lcs: number[][]): RawOp[] {
  const ops: RawOp[] = []
  let i = 0
  let j = 0

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ op: 'equal', text: a[i] })
      i++
      j++
      continue
    }

    if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ op: 'remove', text: a[i] })
      i++
    } else {
      ops.push({ op: 'add', text: b[j] })
      j++
    }
  }

  while (i < a.length) {
    ops.push({ op: 'remove', text: a[i++] })
  }
  while (j < b.length) {
    ops.push({ op: 'add', text: b[j++] })
  }

  return ops
}

export function buildSideBySideDiff(original: string, current: string): SideBySideDiffRow[] {
  const a = original.split(/\r?\n/)
  const b = current.split(/\r?\n/)
  const lcs = buildLcsTable(a, b)
  const ops = backtrackOps(a, b, lcs)

  const rows: SideBySideDiffRow[] = []
  let originalLine = 1
  let currentLine = 1

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    if (op.op === 'equal') {
      rows.push({
        type: 'equal',
        originalLineNumber: originalLine++,
        currentLineNumber: currentLine++,
        originalText: op.text,
        currentText: op.text,
      })
      continue
    }

    // Pair remove + add into a "change" row when adjacent.
    if (
      op.op === 'remove' &&
      i + 1 < ops.length &&
      ops[i + 1].op === 'add'
    ) {
      rows.push({
        type: 'change',
        originalLineNumber: originalLine++,
        currentLineNumber: currentLine++,
        originalText: op.text,
        currentText: ops[i + 1].text,
      })
      i++
      continue
    }

    if (op.op === 'remove') {
      rows.push({
        type: 'remove',
        originalLineNumber: originalLine++,
        originalText: op.text,
        currentText: '',
      })
    } else {
      rows.push({
        type: 'add',
        currentLineNumber: currentLine++,
        originalText: '',
        currentText: op.text,
      })
    }
  }

  return rows
}
