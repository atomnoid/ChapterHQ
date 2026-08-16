"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit2, Trash2, Eye } from "lucide-react";
import Link from "next/link";

interface CustomForm {
  id: string;
  name: string;
}

interface FormActionsMenuProps {
  form: CustomForm;
  onDeleted: (formId: string) => void;
}

export function FormActionsMenu({ form, onDeleted }: FormActionsMenuProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete form "${form.name}"? This action cannot be undone.`)) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/forms/${form.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete form");
      onDeleted(form.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete form");
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="inline-flex items-center justify-center p-2 hover:bg-secondary/50 rounded"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
          <Link href={`/forms/${form.id}/submissions`}>
            <button className="w-full text-left px-4 py-2 hover:bg-secondary/50 flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4" />
              View Submissions
            </button>
          </Link>
          <Link href={`/forms/${form.id}/edit`}>
            <button className="w-full text-left px-4 py-2 hover:bg-secondary/50 flex items-center gap-2 text-sm">
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full text-left px-4 py-2 hover:bg-destructive/10 flex items-center gap-2 text-sm text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}
