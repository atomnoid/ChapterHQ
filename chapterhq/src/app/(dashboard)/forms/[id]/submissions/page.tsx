"use client";

import { use } from "react";
import { SubmissionsViewer } from "@/features/forms/components/submissions-viewer";

export default function FormSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <SubmissionsViewer formId={resolvedParams.id} />;
}
