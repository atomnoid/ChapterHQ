"use client";

import { use } from "react";
import { FormEditor } from "@/features/forms/components/form-editor";

export default function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <div>
      <FormEditor formId={resolvedParams.id} />
    </div>
  );
}
