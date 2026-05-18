"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

type FormulaTaskButton = {
  id: string
  label: string
  taskId: string
  token: string
  formulaLabel: string
}

type TnaFormulaDialogProps = {
  open: boolean
  activeTaskButtonId: string
  initialFormula: string
  taskButtons: FormulaTaskButton[]
  onOpenChange: (open: boolean) => void
  onSave: (formula: string) => void
}

type TnaFormulaDialogContentProps = Omit<TnaFormulaDialogProps, "open">

const KEYPAD_BUTTONS = ["(", ")", "/", "*", "7", "8", "9", "-", "4", "5", "6", "+", "1", "2", "3", "0"]
const TASK_TOKEN_PATTERN = /(\{\{task:[^}]+\}\})/g

function appendFormulaToken(current: string, token: string) {
  const trimmed = current.trimEnd()

  if (!token) {
    return trimmed
  }

  if (!trimmed) {
    return token
  }

  if (/^\d$/.test(token)) {
    return /\d$/.test(trimmed) || trimmed.endsWith("(") ? `${trimmed}${token}` : `${trimmed} ${token}`
  }

  if (token === "(") {
    return trimmed.endsWith("(") ? trimmed : `${trimmed} (`
  }

  if (token === ")") {
    return trimmed.endsWith(" ") ? `${trimmed.trimEnd()})` : `${trimmed})`
  }

  if (/^[+\-*/]$/.test(token)) {
    return `${trimmed} ${token} `
  }

  return trimmed.endsWith("(") ? `${trimmed}${token}` : `${trimmed} ${token}`
}

function FormulaSection({ formula, taskLabelsById }: { formula: string; taskLabelsById: Record<string, string> }) {
  const parts = formula.split(TASK_TOKEN_PATTERN).filter(Boolean)

  return (
    <div className="min-h-32 rounded-xl border border-slate-200/80 bg-white px-4 py-4 font-mono text-base leading-7 text-slate-900 shadow-sm dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100">
      <div className={`min-h-24 whitespace-pre-wrap break-words text-right ${formula ? "" : "text-slate-400 dark:text-slate-500"}`}>
        {formula ? (
          <span className="inline-flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1">
            {parts.map((part, index) => {
              const taskMatch = /^\{\{task:([^}]+)\}\}$/.exec(part)

              if (taskMatch) {
                return (
                  <Badge key={`${part}-${index}`} variant="secondary" className="h-6 rounded-md px-2 font-sans text-xs">
                    {taskLabelsById[taskMatch[1]] || "Task"}
                  </Badge>
                )
              }

              return <span key={`${part}-${index}`}>{part}</span>
            })}
          </span>
        ) : (
          "Formula will appear here"
        )}
      </div>
    </div>
  )
}

function TnaFormulaDialogContent({ activeTaskButtonId, initialFormula, taskButtons, onOpenChange, onSave }: TnaFormulaDialogContentProps) {
  const [formula, setFormula] = useState(initialFormula.trim())
  const taskLabelsById = useMemo(
    () =>
      taskButtons.reduce<Record<string, string>>((labels, task) => {
        if (task.taskId) labels[task.taskId] = task.formulaLabel
        return labels
      }, {}),
    [taskButtons],
  )

  function appendToken(token: string) {
    setFormula((current) => appendFormulaToken(current, token))
  }

  function handleClear() {
    setFormula("")
  }

  function handleSave() {
    onSave(formula.trim())
  }

  return (
    <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] translate-x-0 translate-y-0 overflow-hidden rounded-none p-0 sm:left-1/2 sm:top-1/2 sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:w-[min(980px,calc(100vw-2rem))] sm:max-w-[980px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-950">
          <div className="border-b border-slate-200/70 px-4 pb-4 pt-5 sm:px-6 sm:pt-6 dark:border-white/10">
            <DialogHeader>
              <DialogTitle>Formula Builder</DialogTitle>
              <DialogDescription>
                Click task, operator, and bracket buttons to build the relation formula for this TNA row.
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="min-h-0 flex-1" viewportClassName="px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex min-h-full flex-col gap-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/40">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Formula</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">This is the generated expression.</p>
                    </div>
                    <Button type="button" variant="outline" className="rounded-full" onClick={handleClear}>
                      Clear
                    </Button>
                  </div>
                  <FormulaSection formula={formula} taskLabelsById={taskLabelsById} />
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/40">
                  <p className="mb-3 text-sm font-semibold text-slate-950 dark:text-slate-50">Keypad</p>
                  <div className="grid grid-cols-4 gap-2">
                    {KEYPAD_BUTTONS.map((key) => {
                      const isOperator = /^[+\-*/]$/.test(key)
                      const isBracket = key === "(" || key === ")"

                      return (
                        <Button
                          key={key}
                          type="button"
                          variant={isOperator ? "default" : "outline"}
                          className={`h-12 rounded-xl text-base font-semibold ${isBracket ? "bg-white dark:bg-slate-950/70" : ""}`}
                          onClick={() => appendToken(key)}
                        >
                          {key}
                        </Button>
                      )
                    })}
                  </div>
                </section>
              </div>

              <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex flex-none items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Tasks</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Insert one of the added detail rows.</p>
                  </div>
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <div className="flex flex-wrap gap-2 pr-2">
                    {taskButtons.length > 0 ? (
                      taskButtons.map((task) => {
                        const isActiveTask = task.id === activeTaskButtonId

                        return (
                          <Button
                            key={task.id}
                            type="button"
                            variant={isActiveTask ? "default" : "outline"}
                            className={`h-9 rounded-full px-3 text-xs font-medium ${isActiveTask ? "border-primary bg-primary text-primary-foreground shadow-sm" : ""}`}
                            disabled={isActiveTask || !task.token}
                            title={isActiveTask ? "Current row task cannot be used in its own formula" : undefined}
                            onClick={() => appendToken(task.token)}
                          >
                            {task.label}
                          </Button>
                        )
                      })
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Add TNA detail rows first.</p>
                    )}
                  </div>
                </ScrollArea>
              </section>
            </div>
          </ScrollArea>

          <div className="border-t border-slate-200/70 px-4 py-4 sm:px-6 dark:border-white/10">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} className="rounded-xl">
                Save Formula
              </Button>
            </DialogFooter>
          </div>
        </div>
    </DialogContent>
  )
}

export function TnaFormulaDialog({ open, activeTaskButtonId, initialFormula, taskButtons, onOpenChange, onSave }: TnaFormulaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <TnaFormulaDialogContent
          activeTaskButtonId={activeTaskButtonId}
          initialFormula={initialFormula}
          taskButtons={taskButtons}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />
      ) : null}
    </Dialog>
  )
}
