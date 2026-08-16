"use client";

import type { Metadata } from "next";
import { FormEditor } from "@/features/forms/components/form-editor";

export default function EditFormPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <FormEditor formId={params.id} />
    </div>
  );
}
