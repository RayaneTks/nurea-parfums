import { SignJWT } from "jose";
import fs from "node:fs";

const envRaw = fs.readFileSync(".env", "utf8");
const m = envRaw.match(/^ADMIN_JWT_SECRET\s*=\s*"?([^"\r\n]+)"?/m);
if (!m) { console.error("ADMIN_JWT_SECRET introuvable dans .env"); process.exit(1); }
const secret = new TextEncoder().encode(m[1].trim());

const token = await new SignJWT({ username: "audit", role: "OWNER" })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("audit")
  .setIssuedAt()
  .setExpirationTime("7d")
  .sign(secret);

fs.mkdirSync("/tmp", { recursive: true });
fs.writeFileSync("/tmp/admin_token.txt", token);
console.log("token written, len:", token.length);
