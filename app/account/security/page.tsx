import { EntryTopNav } from "@/components/entry-top-nav"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SecuritySettings } from "@/features/account/security-settings"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return (
    <main className="h-svh overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <EntryTopNav current="account" />
      <div className="h-full pt-16">
        <ScrollArea className="h-full">
          <SecuritySettings apiUrl={apiUrl} />
        </ScrollArea>
      </div>
    </main>
  )
}
