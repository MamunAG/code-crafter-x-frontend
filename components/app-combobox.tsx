"use client"

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
  type WheelEvent,
} from "react"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils"

export type AppComboboxOption = {
  label: string
  value: string
}

export type AppComboboxLoadParams = {
  query: string
  page: number
  limit: number
}

export type AppComboboxLoadResult<T extends AppComboboxOption> =
  | T[]
  | {
    items: T[]
    hasNextPage?: boolean
  }

type AppComboboxProps<T extends AppComboboxOption> = {
  items?: T[]
  value: T | null
  onValueChange: (value: T | null) => void
  loadItems?: (params: AppComboboxLoadParams) => Promise<AppComboboxLoadResult<T>>
  initialPage?: number
  initialLimit?: number
  searchLimit?: number
  searchDebounceMs?: number
  placeholder?: string
  loading?: boolean
  loadingMessage?: string
  emptyMessage?: string
  header?: ReactNode
  footer?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  showClear?: boolean
  className?: string
  inputClassName?: string
  contentClassName?: string
  listClassName?: string
  itemClassName?: string
  inputProps?: Omit<React.ComponentProps<typeof ComboboxInput>, "placeholder" | "className" | "disabled" | "showClear">
  isItemEqualToValue?: (item: T, value: T) => boolean
  renderItem?: (item: T) => ReactNode
}

export function AppCombobox<T extends AppComboboxOption>({
  items,
  value,
  onValueChange,
  loadItems,
  initialPage = 1,
  initialLimit = 10,
  searchLimit = 10,
  searchDebounceMs = 250,
  placeholder = "Search...",
  loading = false,
  loadingMessage = "Loading...",
  emptyMessage = "No results found.",
  header,
  footer,
  open,
  onOpenChange,
  disabled = false,
  showClear,
  className,
  inputClassName,
  contentClassName,
  listClassName,
  itemClassName,
  inputProps,
  isItemEqualToValue,
  renderItem,
}: AppComboboxProps<T>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const generatedInputName = useId().replaceAll(":", "")
  const [inputValue, setInputValue] = useState(value?.label ?? "")
  const [remoteItems, setRemoteItems] = useState<T[]>(items ?? [])
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const initialItemsRef = useRef<T[]>(items ?? [])
  const hasLoadedInitialRef = useRef(false)
  const requestIdRef = useRef(0)
  const ignoreNextInputChangeRef = useRef(false)
  const resolvedOpen = open ?? uncontrolledOpen
  const handleOpenChange = onOpenChange ?? setUncontrolledOpen
  const resolvedDisabled = disabled || loading || remoteLoading
  const resolvedShowClear = showClear ?? Boolean(value)
  const resolvedItems = loadItems ? remoteItems : items ?? []
  const resolvedLoading = loading || remoteLoading

  const runLoad = useCallback(
    async (query: string, page: number, limit: number, replace = true) => {
      if (!loadItems) {
        return
      }

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setRemoteLoading(true)
      setRemoteError("")

      try {
        const result = await loadItems({ query, page, limit })
        const nextItems = Array.isArray(result) ? result : result.items
        const nextHasNextPage = Array.isArray(result) ? false : Boolean(result.hasNextPage)

        if (requestId !== requestIdRef.current) {
          return
        }

        if (!query.trim() && page === initialPage && limit === initialLimit) {
          initialItemsRef.current = nextItems
          hasLoadedInitialRef.current = true
        }

        setCurrentPage(page)
        setHasMore(nextHasNextPage)
        setRemoteItems((currentItems) => (replace ? nextItems : [...currentItems, ...nextItems]))
      } catch (caughtError) {
        if (requestId !== requestIdRef.current) {
          return
        }

        setRemoteError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load combobox options right now.",
        )
        setRemoteItems([])
      } finally {
        if (requestId === requestIdRef.current) {
          setRemoteLoading(false)
        }
      }
    },
    [initialLimit, initialPage, loadItems],
  )

  useEffect(() => {
    if (!loadItems) {
      return
    }

    const timeout = window.setTimeout(() => {
      void runLoad("", initialPage, initialLimit, true)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [initialLimit, initialPage, loadItems, runLoad])

  useEffect(() => {
    if (!loadItems) {
      return
    }

    const trimmedQuery = searchQuery.trim()

    if (!trimmedQuery) {
      if (hasLoadedInitialRef.current) {
        const timeout = window.setTimeout(() => {
          setRemoteItems(initialItemsRef.current)
          setRemoteError("")
          setHasMore(false)
          setCurrentPage(initialPage)
        }, 0)

        return () => window.clearTimeout(timeout)
      }

      return
    }

    const timeout = window.setTimeout(() => {
      void runLoad(trimmedQuery, 1, searchLimit, true)
    }, searchDebounceMs)

    return () => window.clearTimeout(timeout)
  }, [initialLimit, initialPage, loadItems, runLoad, searchDebounceMs, searchLimit, searchQuery])

  const handleListScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!loadItems || remoteLoading || !hasMore) {
        return
      }

      const element = event.currentTarget
      const remaining = element.scrollHeight - element.scrollTop - element.clientHeight

      if (remaining > 24) {
        return
      }

      const trimmedQuery = searchQuery.trim()
      const nextPage = currentPage + 1
      void runLoad(trimmedQuery, nextPage, trimmedQuery ? searchLimit : initialLimit, false)
    },
    [currentPage, hasMore, initialLimit, loadItems, remoteLoading, runLoad, searchLimit, searchQuery],
  )

  const handleListWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const element = event.currentTarget

    if (element.scrollHeight <= element.clientHeight) {
      return
    }

    const previousScrollTop = element.scrollTop
    element.scrollTop += event.deltaY

    if (element.scrollTop !== previousScrollTop) {
      event.stopPropagation()
    }
  }, [])

  const handleInputValueChange = useCallback(
    (nextInputValue: string) => {
      if (ignoreNextInputChangeRef.current) {
        ignoreNextInputChangeRef.current = false
        return
      }

      setInputValue(nextInputValue)

      if (loadItems) {
        setSearchQuery(nextInputValue)
      }
    },
    [loadItems],
  )

  const handleValueChange = useCallback(
    (nextValue: T | null) => {
      onValueChange(nextValue)
      ignoreNextInputChangeRef.current = true
      window.setTimeout(() => {
        ignoreNextInputChangeRef.current = false
      }, 0)
      setInputValue(nextValue?.label ?? "")
      setSearchQuery("")
    },
    [onValueChange],
  )

  return (
    <Combobox
      open={resolvedOpen}
      onOpenChange={handleOpenChange}
      items={resolvedItems}
      value={value}
      inputValue={inputValue}
      onInputValueChange={handleInputValueChange}
      onValueChange={handleValueChange}
      isItemEqualToValue={isItemEqualToValue ?? ((item, currentValue) => item.value === currentValue.value)}
    >
      <ComboboxInput
        {...inputProps}
        placeholder={resolvedLoading ? loadingMessage : placeholder}
        name={inputProps?.name ?? `app-combobox-${generatedInputName}`}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        data-lpignore="true"
        className={cn("w-full", inputClassName, className)}
        disabled={resolvedDisabled}
        showClear={resolvedShowClear}
      />
      <ComboboxContent className={cn("flex max-h-80 flex-col overflow-hidden", contentClassName)}>
        {header}
        <ComboboxEmpty className="py-5 text-xs">{resolvedLoading ? loadingMessage : remoteError || emptyMessage}</ComboboxEmpty>
        <ComboboxList
          className={cn("min-h-0 max-h-56 flex-1 overflow-y-auto overscroll-contain", listClassName)}
          onScroll={handleListScroll}
          onWheel={handleListWheel}
        >
          {(item) => (
            <ComboboxItem
              key={item.value}
              value={item}
              className={cn("cursor-pointer px-3 py-2 text-xs font-medium", itemClassName)}
            >
              {renderItem ? renderItem(item) : item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
        {footer}
      </ComboboxContent>
    </Combobox>
  )
}
