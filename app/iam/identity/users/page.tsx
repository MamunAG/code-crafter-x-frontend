import { ScrollArea } from "@/components/ui/scroll-area"
import { UserDirectoryPage } from "@/features/iam/user-directory-page"

export default function Page() {
  return (
    <div className="h-full min-h-0">
      <ScrollArea className="h-full">
        <UserDirectoryPage />
      </ScrollArea>
    </div>
  )
}
