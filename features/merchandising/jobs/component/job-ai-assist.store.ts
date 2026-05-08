import { create } from "zustand"

import type { AppComboboxOption } from "@/components/app-combobox"

import type { JobAiAssistRow } from "../job.types"

type SelectOption = AppComboboxOption

export type AiAssistMasterDataMatches = {
  styleOption: SelectOption | null
  sizeOption: SelectOption | null
  colorOption: SelectOption | null
}

export type AiAssistFocusColumn = "poNumber" | "styleNo" | "styleName" | "color" | "size" | "quantity" | "fob" | "deliveryDate"

export type AiAssistFocusedCell = {
  rowIndex: number
  column: AiAssistFocusColumn
}

type JobAiAssistState = {
  open: boolean
  file: File | null
  fileName: string
  uploadCollapsed: boolean
  rows: JobAiAssistRow[]
  error: string
  working: boolean
  addingRowIndex: number | null
  addedRowKeys: string[]
  focusedCell: AiAssistFocusedCell | null
  setOpen: (open: boolean) => void
  setUploadCollapsed: (collapsed: boolean) => void
  selectFile: (file: File | null) => void
  setRows: (rows: JobAiAssistRow[]) => void
  setError: (error: string) => void
  setWorking: (working: boolean) => void
  setAddingRowIndex: (index: number | null) => void
  setFocusedCell: (focusedCell: AiAssistFocusedCell | null) => void
  updateRow: (index: number, patch: Partial<JobAiAssistRow>) => void
  fillColumnDown: (cell: AiAssistFocusedCell, value: JobAiAssistRow[AiAssistFocusColumn]) => void
  markRowAdded: (row: JobAiAssistRow, index: number) => void
  resetRowsForAnalyze: () => void
  completeAnalyze: (rows: JobAiAssistRow[]) => void
}

export function getAiAssistRowKey(row: JobAiAssistRow, index: number) {
  return [row.poNumber, row.styleNo, row.styleName, row.color, row.size, row.quantity, row.fob ?? "", row.deliveryDate ?? "", index].join(":")
}

export const useJobAiAssistStore = create<JobAiAssistState>((set) => ({
  open: false,
  file: null,
  fileName: "",
  uploadCollapsed: false,
  rows: [],
  error: "",
  working: false,
  addingRowIndex: null,
  addedRowKeys: [],
  focusedCell: null,
  setOpen: (open) => set({ open }),
  setUploadCollapsed: (uploadCollapsed) => set({ uploadCollapsed }),
  selectFile: (file) =>
    set({
      file,
      fileName: file?.name ?? "",
      rows: [],
      error: "",
      addedRowKeys: [],
      focusedCell: null,
      uploadCollapsed: false,
    }),
  setRows: (rows) => set({ rows }),
  setError: (error) => set({ error }),
  setWorking: (working) => set({ working }),
  setAddingRowIndex: (addingRowIndex) => set({ addingRowIndex }),
  setFocusedCell: (focusedCell) => set({ focusedCell }),
  updateRow: (index, patch) =>
    set((state) => ({
      rows: state.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    })),
  fillColumnDown: (cell, value) =>
    set((state) => ({
      rows: state.rows.map((row, rowIndex) => (rowIndex > cell.rowIndex ? { ...row, [cell.column]: value } : row)),
    })),
  markRowAdded: (row, index) =>
    set((state) => ({
      addedRowKeys: [...state.addedRowKeys, getAiAssistRowKey(row, index)],
    })),
  resetRowsForAnalyze: () => set({ rows: [], addedRowKeys: [], focusedCell: null }),
  completeAnalyze: (rows) => set({ rows, addedRowKeys: [], focusedCell: null, uploadCollapsed: Boolean(rows.length) }),
}))
