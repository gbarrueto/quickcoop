import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { identityKey } from "@/lib/matching"
import type { FriendProfile } from "@/types"
import { PlatformBadge } from "./platform-badge"

type MatchingFriendGroupPanelProps = {
  selectedProfiles: FriendProfile[]
  onRemove: (profileId: string) => void
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function MatchingFriendGroupPanel({ selectedProfiles, onRemove }: MatchingFriendGroupPanelProps) {
  return (
    <Card className="border-border/70 bg-card/50">
      <CardHeader className="px-4 pb-3 pt-4">
        <CardTitle className="text-lg">Your friend group</CardTitle>
        <CardDescription className="text-xs">Friends currently used to filter the shared library.</CardDescription>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {selectedProfiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">Select friends from the list to build your group.</p>
        ) : (
          <div className="space-y-2">
            {selectedProfiles.map((profile, index) => (
              <div key={`group-${profile.profileId}`}>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[11px]">{getInitials(profile.identities[0]?.displayName ?? "P")}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{profile.identities[0]?.displayName}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {profile.identities.map((identity) => (
                          <PlatformBadge key={identityKey(identity)} platform={identity.platform} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-[10px]" onClick={() => onRemove(profile.profileId)}>
                    Remove
                  </Button>
                </div>

                {index < selectedProfiles.length - 1 && <Separator className="my-2 opacity-70" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
