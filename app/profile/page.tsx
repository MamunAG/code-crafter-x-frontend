import { EntryTopNav } from "@/components/entry-top-nav"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ProfileEditor } from "@/features/profile/profile-editor"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return (
    <main className="h-svh overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_#f0fdf4_0%,_#f8fafc_48%,_#ffffff_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.22),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_48%,_#020617_100%)] dark:text-slate-100">
      <EntryTopNav current="profile" />
      <div className="h-full pt-16">
        <ScrollArea className="h-full">
          <div className="mx-auto w-full max-w-7xl px-3 pb-12 sm:px-4">
            <ProfileEditor apiUrl={apiUrl} />
          </div>
        </ScrollArea>
      </div>
    </main>
  )
}
