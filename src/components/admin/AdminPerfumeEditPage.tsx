"use client";

import { use } from "react";
import { AdminPerfumeForm } from "./AdminPerfumeForm";

export function AdminPerfumeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AdminPerfumeForm perfumeId={id} />;
}
