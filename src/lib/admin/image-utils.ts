export async function convertToWebp(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/webp") return file;
  
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1200;
  const ratio = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86),
  );
  bitmap.close();
  
  if (!blob) return file;
  const safeName = file.name.replace(/\.[a-zA-Z0-9]+$/, "");
  return new File([blob], `${safeName}.webp`, { type: "image/webp" });
}

export async function uploadFile(file: File): Promise<string> {
  const prepared = await convertToWebp(file);
  
  const sign = await fetch("/api/admin/storage/sign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: prepared.name }),
  });
  
  const j = await sign.json();
  if (!sign.ok) throw new Error(j.error ?? "Signature refusée");

  const headers: Record<string, string> = {
    "Content-Type": prepared.type || "application/octet-stream",
  };
  if (j.token) headers.Authorization = `Bearer ${j.token}`;

  const put = await fetch(j.signedUrl!, { 
    method: "PUT", 
    body: prepared, 
    headers 
  });
  
  if (!put.ok) throw new Error(`Upload refusé (${put.status})`);
  return j.publicUrl ?? "";
}
