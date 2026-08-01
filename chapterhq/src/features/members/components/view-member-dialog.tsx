"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

type MemberStatus = "ACTIVE" | "PENDING" | "LEFT" | "BLOCKED";

interface Member {
  id: string;
  status: MemberStatus;
  joinedAt: string;
  user: { id: string; name: string | null; email: string | null; image: string | null };
}

interface ViewMemberDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_STYLES: Record<MemberStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  LEFT: "bg-secondary text-secondary-foreground",
  BLOCKED: "bg-destructive/10 text-destructive",
};

export function ViewMemberDialog({ member, open, onOpenChange }: ViewMemberDialogProps) {
  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Member Details</DialogTitle>
          </div>
          <DialogDescription>
            Detailed information for member {member.user.name ?? member.user.email}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-secondary/50">
            {member.user.image ? (
              <img
                src={member.user.image}
                alt={member.user.name ?? ""}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {(member.user.name ?? member.user.email ?? "?")[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground text-base">
                {member.user.name ?? "Unnamed Member"}
              </p>
              <p className="text-xs text-secondary-foreground">{member.user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-2xl border border-border">
              <p className="text-xs text-secondary-foreground font-medium uppercase tracking-wider mb-1">
                Status
              </p>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  STATUS_STYLES[member.status]
                }`}
              >
                {member.status.charAt(0) + member.status.slice(1).toLowerCase()}
              </span>
            </div>

            <div className="p-3 rounded-2xl border border-border">
              <p className="text-xs text-secondary-foreground font-medium uppercase tracking-wider mb-1">
                Joined Date
              </p>
              <p className="font-semibold text-foreground">
                {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
