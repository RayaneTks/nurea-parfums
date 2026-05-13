/** Types alignés sur les `select` Prisma de `/admin/catalogue` et `/api/admin/catalogue`. */

export type AdminSessionUser = { username: string; role: string };

export type AdminBrandRow = {
  id: string;
  name: string;
  slug: string;
  catalogMode: "CURATED" | "COMPLETE";
  status: "PUBLISHED" | "DRAFT";
  image: string | null;
  imageLight: string | null;
  _count: { perfumes: number };
};

export type AdminPerfumeRow = {
  id: number;
  image: string;
  imageLight: string | null;
  name: string;
  status: string;
  isFeatured?: boolean;
  brand: {
    id: string;
    name: string;
    image: string | null;
    catalogMode: "CURATED" | "COMPLETE";
    status: "PUBLISHED" | "DRAFT";
  };
};

export type AdminCataloguePayload = {
  user?: AdminSessionUser;
  brands: AdminBrandRow[];
  perfumes: AdminPerfumeRow[];
};

export type AdminCatalogueCache = {
  user: AdminSessionUser | null;
  brands: AdminBrandRow[];
  perfumes: AdminPerfumeRow[];
};
