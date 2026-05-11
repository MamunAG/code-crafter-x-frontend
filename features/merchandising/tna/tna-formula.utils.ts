import type { TnaDetailFormValues } from "./tna.types"

type FormulaValue =
  | { type: "number"; value: number }
  | { type: "date"; value: Date }

type FormulaToken =
  | { type: "number"; value: number }
  | { type: "task"; taskId: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" }

type FormulaDetail = Pick<TnaDetailFormValues, "taskId" | "executionDate" | "relationFormula">

const TASK_TOKEN_PATTERN = /\{\{task:([^}]+)\}\}/g
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function createTaskFormulaToken(taskId: string) {
  return `{{task:${taskId}}}`
}

export function renderTnaRelationFormula(formula: string, taskLabelsById: Record<string, string>) {
  return formula.replace(TASK_TOKEN_PATTERN, (_token, taskId: string) => taskLabelsById[taskId]?.trim() || "Task")
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return date
}

function formatDateOnly(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  if (!Number.isInteger(days)) return null
  const nextDate = new Date(date.getTime())
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return nextDate
}

function tokenizeFormula(formula: string) {
  const tokens: FormulaToken[] = []
  let index = 0

  while (index < formula.length) {
    const char = formula[index]

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (formula.startsWith("{{task:", index)) {
      const endIndex = formula.indexOf("}}", index)
      if (endIndex < 0) return null
      const taskId = formula.slice(index + "{{task:".length, endIndex).trim()
      if (!taskId) return null
      tokens.push({ type: "task", taskId })
      index = endIndex + 2
      continue
    }

    if (/\d/.test(char)) {
      let endIndex = index + 1
      while (endIndex < formula.length && /[\d.]/.test(formula[endIndex])) endIndex += 1
      const value = Number(formula.slice(index, endIndex))
      if (!Number.isFinite(value)) return null
      tokens.push({ type: "number", value })
      index = endIndex
      continue
    }

    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ type: "operator", value: char })
      index += 1
      continue
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char })
      index += 1
      continue
    }

    return null
  }

  return tokens
}

function applyOperator(left: FormulaValue, operator: "+" | "-" | "*" | "/", right: FormulaValue): FormulaValue | null {
  if (operator === "+" && left.type === "number" && right.type === "number") {
    return { type: "number", value: left.value + right.value }
  }

  if (operator === "+" && left.type === "date" && right.type === "number") {
    const date = addDays(left.value, right.value)
    return date ? { type: "date", value: date } : null
  }

  if (operator === "+" && left.type === "number" && right.type === "date") {
    const date = addDays(right.value, left.value)
    return date ? { type: "date", value: date } : null
  }

  if (operator === "-" && left.type === "number" && right.type === "number") {
    return { type: "number", value: left.value - right.value }
  }

  if (operator === "-" && left.type === "date" && right.type === "number") {
    const date = addDays(left.value, -right.value)
    return date ? { type: "date", value: date } : null
  }

  if (operator === "-" && left.type === "date" && right.type === "date") {
    return { type: "number", value: Math.round((left.value.getTime() - right.value.getTime()) / MS_PER_DAY) }
  }

  if (operator === "*" && left.type === "number" && right.type === "number") {
    return { type: "number", value: left.value * right.value }
  }

  if (operator === "/" && left.type === "number" && right.type === "number" && right.value !== 0) {
    return { type: "number", value: left.value / right.value }
  }

  return null
}

function evaluateTokens(tokens: FormulaToken[], resolveTaskDate: (taskId: string) => Date | null) {
  let cursor = 0

  function parseExpression(): FormulaValue | null {
    let left = parseTerm()

    while (left && cursor < tokens.length) {
      const token = tokens[cursor]
      if (token.type !== "operator" || (token.value !== "+" && token.value !== "-")) break
      cursor += 1
      const right = parseTerm()
      if (!right) return null
      left = applyOperator(left, token.value, right)
    }

    return left
  }

  function parseTerm(): FormulaValue | null {
    let left = parseFactor()

    while (left && cursor < tokens.length) {
      const token = tokens[cursor]
      if (token.type !== "operator" || (token.value !== "*" && token.value !== "/")) break
      cursor += 1
      const right = parseFactor()
      if (!right) return null
      left = applyOperator(left, token.value, right)
    }

    return left
  }

  function parseFactor(): FormulaValue | null {
    const token = tokens[cursor]
    if (!token) return null

    if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
      cursor += 1
      const value = parseFactor()
      if (!value || value.type !== "number") return null
      return { type: "number", value: token.value === "-" ? -value.value : value.value }
    }

    if (token.type === "number") {
      cursor += 1
      return { type: "number", value: token.value }
    }

    if (token.type === "task") {
      cursor += 1
      const date = resolveTaskDate(token.taskId)
      return date ? { type: "date", value: date } : null
    }

    if (token.type === "paren" && token.value === "(") {
      cursor += 1
      const value = parseExpression()
      const closing = tokens[cursor]
      if (!value || closing?.type !== "paren" || closing.value !== ")") return null
      cursor += 1
      return value
    }

    return null
  }

  const value = parseExpression()
  return value && cursor === tokens.length ? value : null
}

export function evaluateTnaRelationFormula({
  details,
  targetIndex,
}: {
  details: FormulaDetail[]
  targetIndex: number
}) {
  function evaluateRowDate(rowIndex: number, visiting: Set<number>): Date | null {
    const detail = details[rowIndex]
    if (!detail) return null

    const formula = detail.relationFormula.trim()
    if (!formula) return parseDateOnly(detail.executionDate)

    if (visiting.has(rowIndex)) return null
    visiting.add(rowIndex)

    const tokens = tokenizeFormula(formula)
    const value = tokens
      ? evaluateTokens(tokens, (taskId) => {
          const referencedIndex = details.findIndex((candidate) => candidate.taskId === taskId)
          if (referencedIndex < 0 || referencedIndex === rowIndex) return null
          return evaluateRowDate(referencedIndex, visiting)
        })
      : null

    visiting.delete(rowIndex)
    return value?.type === "date" ? value.value : null
  }

  const date = evaluateRowDate(targetIndex, new Set())
  return date ? formatDateOnly(date) : null
}
