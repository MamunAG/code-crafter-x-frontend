import { EntryTopNav } from "@/components/entry-top-nav"
import { ProfileDashboard } from "@/features/profile/profile-dashboard"

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3050"

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_#f0fdf4_0%,_#f8fafc_48%,_#ffffff_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.22),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_48%,_#020617_100%)] dark:text-slate-100">
      <EntryTopNav current="profile" />
      <div className="mx-auto w-full max-w-7xl px-3 pb-12 pt-16 sm:px-4 sm:pt-20">
        <ProfileDashboard apiUrl={apiUrl} />
      </div>
    </main>
  )
}
