import { z } from "zod";

const sources = ["BRAND_OFFICIAL", "PERFUMER_OFFICIAL", "SUPPLIER", "LICENSED_DATA_PROVIDER"] as const;

const note = z.string().trim().min(1).max(80).refine((value) => !/[<>]/.test(value), "Note invalide.");

const sourceUrl = z
  .string()
  .trim()
  .url("Indique une URL source valide.")
  .max(500)
  .refine((value) => {
    try {
      const url = new URL(value);
      const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
      const blockedDomains = ["fimgs.net", "fraguru.com"];
      const isFragrantica = hostname === "fragrantica.com" || hostname.startsWith("fragrantica.") || hostname.includes(".fragrantica.");
      const isBlockedMedia = blockedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
      return url.protocol === "https:" && !url.username && !url.password && !isFragrantica && !isBlockedMedia;
    } catch {
      return false;
    }
  }, "Source refusée : URL HTTPS autorisée requise.");

const researchRecord = z
  .object({
    brandName: z.string().trim().min(1).max(120),
    perfumeName: z.string().trim().min(1).max(160),
    line: z.string().trim().max(120).optional(),
    sourceType: z.enum(sources),
    sourceUrl,
    /** Référence vérifiable à l'autorisation de réutiliser la donnée. Obligatoire avant staging. */
    rightsEvidence: z.string().trim().min(8).max(1000),
    retrievedAt: z.string().datetime({ offset: true }),
    topNotes: z.array(note).max(30),
    heartNotes: z.array(note).max(30),
    baseNotes: z.array(note).max(30),
    universeCorrection: z.string().trim().max(1200).optional(),
  })
  .strict();

export const stagePerfumeResearchInput = z
  .object({ records: z.array(researchRecord).min(1).max(100) })
  .strict()
  .superRefine(({ records }, ctx) => {
    const seen = new Set<string>();
    records.forEach((record, index) => {
      const key = `${record.brandName.toLocaleLowerCase()}|${record.perfumeName.toLocaleLowerCase()}|${record.sourceUrl}|${record.retrievedAt}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["records", index], message: "Cette fiche est répétée dans le lot." });
      }
      seen.add(key);
    });
  });

export const reviewPerfumeResearchInput = z
  .object({
    id: z.string().cuid(),
    status: z.enum(["VERIFIED", "REJECTED"]),
    rightsConfirmed: z.boolean(),
    reviewNotes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(({ status, rightsConfirmed }) => (status === "VERIFIED" ? rightsConfirmed : !rightsConfirmed), {
    path: ["rightsConfirmed"],
    message: "Confirme les droits de réutilisation avant de valider la fiche.",
  });

export const perfumeResearchLookupInput = z
  .object({
    brand: z.string().trim().min(1).max(120),
    perfume: z.string().trim().min(1).max(160),
    status: z.enum(["PENDING", "VERIFIED"]).default("VERIFIED"),
  })
  .strict();

export type StagePerfumeResearchData = z.output<typeof stagePerfumeResearchInput>;
export type ReviewPerfumeResearchData = z.output<typeof reviewPerfumeResearchInput>;
export type PerfumeResearchLookup = z.output<typeof perfumeResearchLookupInput>;
