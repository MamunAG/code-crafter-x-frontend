"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "@/features/notifications/notification.service"
import type { NotificationRecord } from "@/features/notifications/notification.types"

function safePath(link?: string | null) { if (!link) return "/"; try { const url = new URL(link, window.location.origin); return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/" } catch { return link.startsWith("/") && !link.startsWith("//") ? link : "/" } }
export default function NotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [unread, setUnread] = useState(0)
  const load = useCallback(async () => { const apiUrl = process.env.NEXT_PUBLIC_API_URL; const accessToken = localStorage.getItem("access_token"); if (!apiUrl || !accessToken) return; setLoading(true); try { const result = await fetchNotifications({ apiUrl, accessToken, page, limit: 20 }); setItems(result.items); setUnread(result.unreadCount); setTotalPages(result.meta.totalPages) } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load notifications.") } finally { setLoading(false) } }, [page])
  useEffect(() => { const pending = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(pending) }, [load])
  async function open(item: NotificationRecord) { const apiUrl = process.env.NEXT_PUBLIC_API_URL; const accessToken = localStorage.getItem("access_token"); if (!apiUrl || !accessToken) return; try { if (!item.isRead) await markNotificationRead({ apiUrl, accessToken, notificationId: item.id }); router.push(safePath(item.link)) } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to open notification.") } }
  async function markAll() { const apiUrl = process.env.NEXT_PUBLIC_API_URL; const accessToken = localStorage.getItem("access_token"); if (!apiUrl || !accessToken) return; try { await markAllNotificationsRead({ apiUrl, accessToken }); await load() } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update notifications.") } }
  return <main className="min-h-screen bg-muted/30 p-4 sm:p-8"><div className="mx-auto max-w-4xl space-y-4"><Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><Bell/>Notification center</CardTitle><CardDescription>Leave approvals, decisions, and other account activity.</CardDescription></div><Button variant="outline" disabled={!unread} onClick={() => void markAll()}>Mark all read</Button></div></CardHeader></Card>{loading ? <Card><CardContent className="flex justify-center py-20"><Loader2 className="animate-spin"/></CardContent></Card> : items.length ? items.map((item) => <button key={item.id} className="block w-full text-left" onClick={() => void open(item)}><Card className={item.isRead ? "opacity-75" : "ring-primary/30"}><CardContent className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><p className="font-semibold">{item.title}</p>{!item.isRead ? <Badge>Unread</Badge> : null}<Badge variant="outline">{item.type.replaceAll("_", " ")}</Badge></div><p className="mt-2 text-muted-foreground">{item.body}</p></div><time className="shrink-0 text-muted-foreground">{new Date(item.created_at).toLocaleString()}</time></CardContent></Card></button>) : <Card><CardContent className="py-20 text-center text-muted-foreground">You have no notifications.</CardContent></Card>}<div className="flex justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="self-center text-sm text-muted-foreground">Page {page} of {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div></main>
}
