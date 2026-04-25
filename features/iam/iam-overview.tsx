import Link from "next/link"
import {
  ArrowRight,
  Fingerprint,
  KeyRound,
  Lock,
  ShieldCheck,
  ShieldHalf,
  UserCog,
  Users,
  ScrollText,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getModuleNavigation } from "@/lib/module-navigation"
import { cn } from "@/lib/utils"

type IamSection = {
  title: string
  href: string
  description: string
  icon: typeof Users
  accent: string
}

const focusAreas: IamSection[] = [
  {
    title: "Identity",
    href: "/iam/identity/users",
    description: "User profiles, teams, onboarding, and account visibility.",
    icon: Users,
    accent:
      "from-sky-500/20 via-sky-500/10 to-cyan-500/5 dark:from-sky-400/25 dark:via-sky-400/10 dark:to-cyan-300/5",
  },
  {
    title: "Access",
    href: "/iam/access/roles",
    description: "Roles, permissions, defaults, and authorization rules.",
    icon: KeyRound,
    accent:
      "from-violet-500/20 via-violet-500/10 to-fuchsia-500/5 dark:from-violet-400/25 dark:via-violet-400/10 dark:to-fuchsia-300/5",
  },
  {
    title: "Security",
    href: "/iam/security/sessions",
    description: "Sessions, devices, audit logs, and trust signals.",
    icon: Lock,
    accent:
      "from-emerald-500/20 via-emerald-500/10 to-teal-500/5 dark:from-emerald-400/25 dark:via-emerald-400/10 dark:to-teal-300/5",
  },
]

const operatingChecklist = [
  "Review users before granting elevated access.",
  "Map every role to a permission boundary.",
  "Check active sessions and revoke risky devices.",
  "Audit access changes before the next release.",
]

const quickActions = [
  {
    label: "User directory",
    href: "/iam/identity/users",
    icon: UserCog,
  },
  {
    label: "Role matrix",
    href: "/iam/access/roles/matrix",
    icon: ShieldHalf,
  },
  {
    label: "Audit events",
    href: "/iam/security/audit-logs/events",
    icon: ScrollText,
  },
  {
    label: "Active sessions",
    href: "/iam/security/sessions/active",
    icon: Fingerprint,
  },
]

export function IamOverview() {
  const module = getModuleNavigation("iam")

  if (!module) {
    return null
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-3 py-4 sm:px-4 sm:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.14),_transparent_35%)] blur-3xl dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.2),_transparent_35%)]" />

      <section className="relative grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <Card className="overflow-hidden border-slate-200/80 bg-white/85 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
          <CardContent className="p-0">
            <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,0.14),transparent_35%,rgba(168,85,247,0.12)),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,255,255,0.35))] dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.16),transparent_35%,rgba(168,85,247,0.18)),linear-gradient(180deg,rgba(2,6,23,0.55),rgba(15,23,42,0.28))]" />
                <div className="relative max-w-2xl">
                  <Badge
                    variant="outline"
                    className="border-slate-200/80 bg-white/80 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  >
                    IAM
                  </Badge>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl dark:text-white">
                    Identity, access, and trust controls in one place
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
                    Use this module to manage the people who can sign in, the roles they receive,
                    the permissions behind each action, and the sessions you need to keep an eye on.
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button asChild className="h-11 rounded-full px-5 text-sm font-medium">
                      <Link href="/iam/identity/users">
                        Open users
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 rounded-full border-slate-200 bg-white/80 px-5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                    >
                      <Link href="/iam/access/roles">Review roles</Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/70 bg-slate-50/70 px-6 py-7 sm:px-8 xl:border-l xl:border-t-0 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Control surface
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      A quick map of the IAM lanes we expect teams to use most often.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right shadow-sm dark:border-white/10 dark:bg-slate-950/60">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Zones
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">3</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon

                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-white/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition group-hover:bg-sky-600 dark:bg-white dark:text-slate-950">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {action.label}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Jump straight into the operational screen.
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700 dark:group-hover:text-white" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.1)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">
              Operating checklist
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
              Use these as a simple guardrail before access changes go live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {operatingChecklist.map((item, index) => (
              <div key={item} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-950">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item}</p>
              </div>
            ))}

            <Separator className="bg-slate-200 dark:bg-white/10" />

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Recommended workflow
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Start with people, map their role scope, then review the audit trail and any
                active sessions before closing the change.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="relative grid gap-4 md:grid-cols-3">
        {focusAreas.map((area) => {
          const Icon = area.icon

          return (
            <Card
              key={area.href}
              className="border-slate-200/80 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
            >
              <CardHeader>
                <div
                  className={cn(
                    "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-inset ring-slate-200 dark:ring-white/10",
                    area.accent,
                  )}
                >
                  <Icon className="h-5 w-5 text-slate-900 dark:text-white" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">
                  {area.title}
                </CardTitle>
                <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {area.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-5">
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-full border-slate-200 bg-white/70 px-4 text-sm font-medium text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                >
                  <Link href={area.href}>
                    Open {area.title.toLowerCase()}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="relative grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200/80 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">
              Navigation launchpad
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              These sections mirror the IAM navigation tree so it is easy to move from the
              overview into the next screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {module.groups.map((group) => (
              <div
                key={group.label}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {group.label}
                    </p>
                    {group.description ? (
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {group.description}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {group.items.length} items
                  </Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={item.href}
                      className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-slate-950/60"
                    >
                      <Link
                        href={item.href}
                        className="block rounded-lg px-1 py-1 transition hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.label}
                        </p>
                        {item.description ? (
                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {item.description}
                          </p>
                        ) : null}
                      </Link>

                      {item.children?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.children.map((child) => (
                            <Button
                              key={child.href}
                              asChild
                              variant="ghost"
                              className="h-8 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                              <Link href={child.href}>{child.label}</Link>
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/10">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-white">
                  Trust posture
                </CardTitle>
                <CardDescription className="text-sm leading-6 text-slate-300">
                  A compact summary of how the IAM space should feel to operators.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Signal
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Keep access decisions visible, keep session state current, and keep audit trails
                close to the workflow.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-sm text-slate-200">Identity review</span>
                <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Ready
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-sm text-slate-200">Permission coverage</span>
                <span className="rounded-full bg-sky-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Drafted
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-sm text-slate-200">Session hygiene</span>
                <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  Monitor
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
