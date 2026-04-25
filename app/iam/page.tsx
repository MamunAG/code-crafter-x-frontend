import { ScrollArea } from "@/components/ui/scroll-area"
import { IamOverview } from "@/features/iam/iam-overview"

export default function Page() {
  return (
    <div className="h-full min-h-0">
      <ScrollArea className="h-full">
        <IamOverview />
      </ScrollArea>
    </div>
  )
}
