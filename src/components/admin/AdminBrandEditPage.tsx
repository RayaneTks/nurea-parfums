"use client";

import { use } from "react";
import { AdminBrandForm } from "./AdminBrandForm";

export function AdminBrandEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AdminBrandForm brandId={id} />;
}
