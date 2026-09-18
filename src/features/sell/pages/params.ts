/** Paramètres d'URL du composeur (06 §1.2, E11) tels que la page les lit : bruts, bornés, à usage unique. */
export type SellParams = {
  mode: "vente" | "commande" | null;
  client: string | null;
  parfum: string | null;
  depuis: string | null;
};

const clip = (value: string | undefined) => {
  const text = (value ?? "").trim().slice(0, 64);
  return text === "" ? null : text;
};

/** `?mode=commande&client=…&parfum=12&depuis=…` → paramètres ; une valeur inconnue de `mode` est ignorée. */
export function parseSellParams(params: { mode?: string; client?: string; parfum?: string; depuis?: string }): SellParams {
  return {
    mode: params.mode === "vente" || params.mode === "commande" ? params.mode : null,
    client: clip(params.client),
    parfum: clip(params.parfum),
    depuis: clip(params.depuis),
  };
}
