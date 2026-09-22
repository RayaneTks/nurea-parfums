/**
 * Client PostgreSQL minimal (protocole v3, requêtes simples uniquement) pour lire la SOURCE d'une
 * répétition — la production — sans rien y envoyer d'autre que les requêtes de l'extraction.
 *
 * Pourquoi pas Prisma : son moteur ouvre chaque connexion par des instructions de session (`SET …`)
 * et enveloppe les transactions à sa façon. Ici, les seuls messages envoyés sont : la demande TLS
 * éventuelle, le message de démarrage (utilisateur, base, `client_encoding=UTF8`, `application_name`),
 * l'authentification, les requêtes passées à `requete()` — rien d'autre — puis la fin de session.
 * Chaque requête est journalisée dans `journal` : le test d'extraction vérifie la liste exacte.
 *
 * Authentification : SCRAM-SHA-256 (Supabase, PostgreSQL ≥ 14), MD5, mot de passe en clair.
 * TLS : `sslmode` de l'URL — `disable` ; `prefer` (défaut, comme libpq) ; `require` (chiffré, certificat
 * non vérifié, comme libpq) ; `verify-ca`/`verify-full` (certificat vérifié par les autorités système).
 */
import crypto from "node:crypto";
import net from "node:net";
import tls from "node:tls";

export class ErreurPostgres extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
  ) {
    super(message);
    this.name = "ErreurPostgres";
  }
}

interface Message {
  type: string;
  corps: Buffer;
}

function cstring(texte: string): Buffer {
  return Buffer.concat([Buffer.from(texte, "utf8"), Buffer.from([0])]);
}

function message(type: string, corps: Buffer): Buffer {
  const entete = Buffer.alloc(5);
  entete.write(type, 0, "ascii");
  entete.writeInt32BE(corps.length + 4, 1);
  return Buffer.concat([entete, corps]);
}

function champsErreur(corps: Buffer): Record<string, string> {
  const champs: Record<string, string> = {};
  let i = 0;
  while (i < corps.length && corps[i] !== 0) {
    const code = String.fromCharCode(corps[i] as number);
    const fin = corps.indexOf(0, i + 1);
    champs[code] = corps.toString("utf8", i + 1, fin);
    i = fin + 1;
  }
  return champs;
}

export class ConnexionLectureSeule {
  readonly journal: string[] = [];
  private socket: net.Socket | tls.TLSSocket | null = null;
  private tampon = Buffer.alloc(0);
  private attente: ((m: Message) => void) | null = null;
  private file: Message[] = [];
  private erreurSocket: Error | null = null;

  private constructor() {}

  static async ouvrir(urlTexte: string, delaiMs = 15_000): Promise<ConnexionLectureSeule> {
    const url = new URL(urlTexte);
    const connexion = new ConnexionLectureSeule();
    const hote = url.hostname.replace(/^\[|\]$/g, "");
    const port = Number(url.port || "5432");
    const utilisateur = decodeURIComponent(url.username);
    const motDePasse = decodeURIComponent(url.password);
    const base = decodeURIComponent(url.pathname.replace(/^\//, "")) || utilisateur;
    const sslmode = url.searchParams.get("sslmode") ?? "prefer";
    if (!["disable", "allow", "prefer", "require", "verify-ca", "verify-full", "no-verify"].includes(sslmode)) {
      throw new Error(`sslmode « ${sslmode} » non pris en charge.`);
    }

    const brut = await new Promise<net.Socket>((resolve, reject) => {
      const s = net.connect({ host: hote, port });
      const minuterie = setTimeout(() => {
        s.destroy();
        reject(new Error(`Connexion à ${hote}:${port} : délai dépassé.`));
      }, delaiMs);
      s.once("connect", () => {
        clearTimeout(minuterie);
        resolve(s);
      });
      s.once("error", (e) => {
        clearTimeout(minuterie);
        reject(e);
      });
    });

    let socket: net.Socket | tls.TLSSocket = brut;
    if (sslmode !== "disable" && sslmode !== "allow") {
      const demande = Buffer.alloc(8);
      demande.writeInt32BE(8, 0);
      demande.writeInt32BE(80877103, 4);
      const reponse = await new Promise<string>((resolve, reject) => {
        brut.once("data", (d) => resolve(d.toString("ascii", 0, 1)));
        brut.once("error", reject);
        brut.write(demande);
      });
      if (reponse === "S") {
        const verifier = sslmode === "verify-ca" || sslmode === "verify-full";
        socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
          const t = tls.connect({ socket: brut, servername: net.isIP(hote) ? undefined : hote, rejectUnauthorized: verifier });
          t.once("secureConnect", () => resolve(t));
          t.once("error", reject);
        });
      } else if (sslmode === "require" || sslmode === "verify-ca" || sslmode === "verify-full") {
        brut.destroy();
        throw new Error(`Le serveur ${hote} refuse TLS alors que sslmode=${sslmode}.`);
      }
    }

    connexion.brancher(socket);
    const parametres = Buffer.concat([
      cstring("user"),
      cstring(utilisateur),
      cstring("database"),
      cstring(base),
      cstring("client_encoding"),
      cstring("UTF8"),
      cstring("application_name"),
      cstring("nurea-repetition-extraction"),
      Buffer.from([0]),
    ]);
    const version = Buffer.alloc(4);
    version.writeInt32BE(196608, 0);
    const longueur = Buffer.alloc(4);
    longueur.writeInt32BE(4 + version.length + parametres.length, 0);
    socket.write(Buffer.concat([longueur, version, parametres]));

    await connexion.authentifier(utilisateur, motDePasse);
    return connexion;
  }

  private brancher(socket: net.Socket | tls.TLSSocket): void {
    this.socket = socket;
    socket.on("data", (d: Buffer) => {
      this.tampon = Buffer.concat([this.tampon, d]);
      while (this.tampon.length >= 5) {
        const longueur = this.tampon.readInt32BE(1);
        if (this.tampon.length < longueur + 1) break;
        const m: Message = { type: this.tampon.toString("ascii", 0, 1), corps: this.tampon.subarray(5, longueur + 1) };
        this.tampon = this.tampon.subarray(longueur + 1);
        if (this.attente) {
          const suite = this.attente;
          this.attente = null;
          suite(m);
        } else {
          this.file.push(m);
        }
      }
    });
    const echec = (e: Error) => {
      this.erreurSocket = e;
      if (this.attente) {
        const suite = this.attente;
        this.attente = null;
        suite({ type: "!", corps: Buffer.alloc(0) });
      }
    };
    socket.on("error", echec);
    socket.on("close", () => echec(this.erreurSocket ?? new Error("Connexion fermée par le serveur.")));
  }

  private suivant(): Promise<Message> {
    const pret = this.file.shift();
    if (pret) return Promise.resolve(pret);
    if (this.erreurSocket) return Promise.reject(this.erreurSocket);
    return new Promise((resolve, reject) => {
      this.attente = (m) => (m.type === "!" ? reject(this.erreurSocket) : resolve(m));
    });
  }

  private ecrire(tampon: Buffer): void {
    if (!this.socket) throw new Error("Connexion fermée.");
    this.socket.write(tampon);
  }

  private async authentifier(utilisateur: string, motDePasse: string): Promise<void> {
    let scram: { nonceClient: string; premierNu: string; signatureServeur?: Buffer } | null = null;
    for (;;) {
      const m = await this.suivant();
      if (m.type === "E") {
        const champs = champsErreur(m.corps);
        throw new ErreurPostgres(champs.M ?? "Authentification refusée.", champs.C);
      }
      if (m.type === "Z") return;
      if (m.type !== "R") continue;
      const code = m.corps.readInt32BE(0);
      if (code === 0) continue;
      if (code === 3) {
        this.ecrire(message("p", cstring(motDePasse)));
      } else if (code === 5) {
        const sel = m.corps.subarray(4, 8);
        const interne = crypto.createHash("md5").update(motDePasse + utilisateur).digest("hex");
        const externe = crypto.createHash("md5").update(Buffer.concat([Buffer.from(interne), sel])).digest("hex");
        this.ecrire(message("p", cstring(`md5${externe}`)));
      } else if (code === 10) {
        const mecanismes = m.corps.toString("utf8", 4).split("\0").filter(Boolean);
        if (!mecanismes.includes("SCRAM-SHA-256")) throw new Error(`Mécanismes SASL non pris en charge : ${mecanismes.join(", ")}`);
        const nonceClient = crypto.randomBytes(18).toString("base64");
        const premierNu = `n=,r=${nonceClient}`;
        const donnees = Buffer.from(`n,,${premierNu}`, "utf8");
        const taille = Buffer.alloc(4);
        taille.writeInt32BE(donnees.length, 0);
        this.ecrire(message("p", Buffer.concat([cstring("SCRAM-SHA-256"), taille, donnees])));
        scram = { nonceClient, premierNu };
      } else if (code === 11) {
        if (!scram) throw new Error("SCRAM : réponse inattendue.");
        const premierServeur = m.corps.toString("utf8", 4);
        const attributs = Object.fromEntries(premierServeur.split(",").map((p) => [p.slice(0, 1), p.slice(2)]));
        const nonce = attributs.r as string;
        if (!nonce?.startsWith(scram.nonceClient)) throw new Error("SCRAM : nonce du serveur invalide.");
        const sel = Buffer.from(attributs.s as string, "base64");
        const iterations = Number(attributs.i);
        const sale = crypto.pbkdf2Sync(motDePasse.normalize("NFKC"), sel, iterations, 32, "sha256");
        const hmac = (cle: Buffer, texte: string) => crypto.createHmac("sha256", cle).update(texte).digest();
        const cleClient = hmac(sale, "Client Key");
        const cleStockee = crypto.createHash("sha256").update(cleClient).digest();
        const finalSansPreuve = `c=biws,r=${nonce}`;
        const messageAuth = `${scram.premierNu},${premierServeur},${finalSansPreuve}`;
        const signature = hmac(cleStockee, messageAuth);
        const preuve = Buffer.from(cleClient.map((octet, i) => octet ^ (signature[i] as number)));
        scram.signatureServeur = hmac(hmac(sale, "Server Key"), messageAuth);
        this.ecrire(message("p", Buffer.from(`${finalSansPreuve},p=${preuve.toString("base64")}`, "utf8")));
      } else if (code === 12) {
        const final = m.corps.toString("utf8", 4);
        const verif = /(?:^|,)v=([^,]+)/.exec(final)?.[1];
        if (!scram?.signatureServeur || !verif || !crypto.timingSafeEqual(Buffer.from(verif, "base64"), scram.signatureServeur)) {
          throw new Error("SCRAM : signature du serveur invalide.");
        }
      } else {
        throw new Error(`Méthode d'authentification ${code} non prise en charge.`);
      }
    }
  }

  /**
   * Requête simple. `surLigne` reçoit chaque ligne (colonnes en texte UTF-8, NULL → null) sans tout
   * garder en mémoire. Rejette avec le code SQLSTATE si le serveur répond une erreur.
   */
  async requete(sql: string, surLigne: (colonnes: (string | null)[]) => void = () => {}): Promise<void> {
    this.journal.push(sql);
    this.ecrire(message("Q", cstring(sql)));
    let erreur: ErreurPostgres | null = null;
    for (;;) {
      const m = await this.suivant();
      if (m.type === "D") {
        if (erreur) continue;
        const n = m.corps.readInt16BE(0);
        const colonnes: (string | null)[] = [];
        let i = 2;
        for (let c = 0; c < n; c += 1) {
          const taille = m.corps.readInt32BE(i);
          i += 4;
          if (taille < 0) {
            colonnes.push(null);
          } else {
            colonnes.push(m.corps.toString("utf8", i, i + taille));
            i += taille;
          }
        }
        surLigne(colonnes);
      } else if (m.type === "E") {
        const champs = champsErreur(m.corps);
        erreur = new ErreurPostgres(champs.M ?? "Erreur PostgreSQL.", champs.C);
      } else if (m.type === "Z") {
        if (erreur) throw erreur;
        return;
      }
    }
  }

  async fermer(): Promise<void> {
    if (!this.socket) return;
    const socket = this.socket;
    this.socket = null;
    await new Promise<void>((resolve) => {
      socket.once("close", () => resolve());
      socket.end(message("X", Buffer.alloc(0)));
      setTimeout(() => {
        socket.destroy();
        resolve();
      }, 2_000).unref();
    });
  }
}
