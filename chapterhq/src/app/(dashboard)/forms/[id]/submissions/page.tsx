"use client";

import { SubmissionsViewer } from "@/features/forms/components/submissions-viewer";

export default function FormSubmissionsPage({ params }: { params: { id: string } }) {
  return <SubmissionsViewer formId={params.id} />;
}
