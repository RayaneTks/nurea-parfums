# Incruste une capture réelle dans l'écran VERT (chroma #00FF00) d'une photo : masque doux, coins par droites ajustées,
# haut repéré par l'encoche, lumière, reflet de vitre, grain, ombre sous le cadre. Méthode : docs/refonte-vitrine/annexes/photos-editoriales.md (main).
# Incrustation d'une capture réelle dans un écran vert (chroma) d'une photo.
# python incruste2.py photo_verte.png ecran.png sortie.png [lumiere sombre|clair] [flou_y0 flou_y1]
import sys, cv2, numpy as np
photo, ecran, sortie = sys.argv[1:4]
lumiere = sys.argv[4] if len(sys.argv) > 4 else "sombre"
flou = (float(sys.argv[5]), float(sys.argv[6])) if len(sys.argv) > 6 else None
P = cv2.imread(photo).astype(np.float32); H, W = P.shape[:2]
B, G, R = cv2.split(P)
g = G - np.maximum(R, B)                      # « verdeur »
alpha = np.clip((g - 40) / (140 - 40), 0, 1)  # masque doux
dur = (alpha > 0.5).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(dur)
k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); dur = (lab == k).astype(np.uint8)
cs, _ = cv2.findContours(dur, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)
hull = cv2.convexHull(c)
for eps in np.linspace(0.01, 0.1, 50):
    a = cv2.approxPolyDP(hull, eps * cv2.arcLength(hull, True), True)
    if len(a) == 4: break
q = a.reshape(-1, 2).astype(np.float64); pts = hull.reshape(-1, 2).astype(np.float64)
# droites ajustées sur la partie centrale de chaque bord (hors coins arrondis)
def dseg(Pp, A, Bb):
    AB = Bb - A; t = np.clip(((Pp - A) @ AB) / (AB @ AB), 0, 1); return np.linalg.norm(Pp - (A + t[:, None] * AB), axis=1)
ptsC = c.reshape(-1, 2).astype(np.float64)
D = np.stack([dseg(ptsC, q[i], q[(i + 1) % 4]) for i in range(4)], 1); kk = D.argmin(1)
lignes = []
for i in range(4):
    A, Bb = q[i], q[(i + 1) % 4]; L = np.linalg.norm(Bb - A); u = (Bb - A) / L
    S = ptsC[(kk == i) & (D.min(1) < 20)]; t = (S - A) @ u; S = S[(t > 0.2 * L) & (t < 0.8 * L)]
    lignes.append(cv2.fitLine(S.astype(np.float32), cv2.DIST_HUBER, 0, 0.01, 0.01).ravel())
def inter(l1, l2):
    vx1, vy1, x1, y1 = l1; vx2, vy2, x2, y2 = l2
    t = np.linalg.solve(np.array([[vx1, -vx2], [vy1, -vy2]]), [x2 - x1, y2 - y1]); return np.array([x1 + vx1 * t[0], y1 + vy1 * t[0]])
coins = np.array([inter(lignes[i - 1], lignes[i]) for i in range(4)])
# ordre horaire (y vers le bas : atan2 croissant = horaire à l'écran)
cen = coins.mean(0); coins = coins[np.argsort(np.arctan2(coins[:, 1] - cen[1], coins[:, 0] - cen[0]))]
# le haut = bord court le plus proche de l'encoche (trou noir dans la coque convexe du vert)
plein = np.zeros_like(dur); cv2.fillPoly(plein, [np.int32(coins)], 1)
trou = ((plein == 1) & (alpha < 0.2)).astype(np.uint8)
trou = cv2.morphologyEx(trou, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
court = min(np.linalg.norm(coins[(i + 1) % 4] - coins[i]) for i in range(4))
for co in coins: cv2.circle(trou, tuple(np.int32(co)), int(0.15 * court), 0, -1)  # coins arrondis ≠ encoche
n2, lab2, st2, cen2 = cv2.connectedComponentsWithStats(trou)
if n2 > 1:
    j = 1 + np.argmax(st2[1:, cv2.CC_STAT_AREA]); encoche = cen2[j]
else:
    encoche = None
cotes = [(i, (i + 1) % 4) for i in range(4)]
longs = [np.linalg.norm(coins[b] - coins[a]) for a, b in cotes]
courts = sorted(range(4), key=lambda i: longs[i])[:2]
if encoche is not None:
    haut = min(courts, key=lambda i: np.linalg.norm((coins[cotes[i][0]] + coins[cotes[i][1]]) / 2 - encoche))
else:
    haut = min(courts, key=lambda i: ((coins[cotes[i][0]] + coins[cotes[i][1]]) / 2)[1])
coins = np.roll(coins, -haut, axis=0)  # HG, HD, BD, BG
print("coins", np.round(coins, 1).tolist(), "encoche", None if encoche is None else np.round(encoche).tolist())
# écran : capture, flou éventuel (prix), perspective
E = cv2.imread(ecran).astype(np.float32); h, w = E.shape[:2]
if flou:
    # flou en fondu : plein entre y0 et y1, rampe de 3 % de part et d'autre (pas de bord franc)
    Eb = cv2.GaussianBlur(E, (0, 0), 30); yv = np.arange(h, dtype=np.float32)[:, None, None] / h; r = 0.03
    m = np.clip(np.minimum((yv - (flou[0] - r)) / r, ((flou[1] + r) - yv) / r), 0, 1); E = E * (1 - m) + Eb * m
# agrandi de 1 % autour du centre : la capture couvre aussi les coins arrondis du masque
cc = coins.mean(0); dst = cc + (coins - cc) * 1.01
M = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), np.float32(dst))
Ew = cv2.warpPerspective(E, M, (W, H), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)
# coordonnées locales de l'écran (u gauche→droite, v haut→bas) pour reflet et bord
Minv = np.linalg.inv(M); yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
den = Minv[2, 0] * xx + Minv[2, 1] * yy + Minv[2, 2]
U = (Minv[0, 0] * xx + Minv[0, 1] * yy + Minv[0, 2]) / den / w; V = (Minv[1, 0] * xx + Minv[1, 1] * yy + Minv[1, 2]) / den / h
# lumière : écran émissif, un peu moins vif dans la pénombre
Ew *= 0.9 if lumiere == "sombre" else 1.0
# flou de profondeur léger + grain du cliché
Ew = cv2.GaussianBlur(Ew, (0, 0), 0.7)
rng = np.random.default_rng(7); Ew += rng.normal(0, 2.2, Ew.shape).astype(np.float32)
# reflet de vitre : bande diagonale douce venue de la fenêtre (haut-gauche) + voile ambiant
diag = (U * 0.8 + V * 0.6)
bande = np.exp(-((diag - 0.45) / 0.18) ** 2)
reflet = (0.07 if lumiere == "sombre" else 0.10) * bande + (0.02 if lumiere == "sombre" else 0.04)
Ew = Ew * (1 - reflet[..., None]) + 255 * reflet[..., None]
# ombre intérieure : l'écran passe sous le cadre
bord = np.minimum.reduce([U, 1 - U, V * h / w, (1 - V) * h / w])
Ew *= (0.82 + 0.18 * np.clip(bord / 0.025, 0, 1))[..., None]
# retrait du liseré vert de la photo, puis mélange par le masque doux
P2 = P.copy(); P2[..., 1] = np.minimum(P[..., 1], np.maximum(P[..., 0], P[..., 2]) * 1.05)
A = cv2.GaussianBlur(alpha, (0, 0), 0.6)[..., None]
out = P2 * (1 - A) + Ew * A
cv2.imwrite(sortie, np.clip(out, 0, 255).astype(np.uint8))
x0, y0 = np.int32(coins.min(0)) - 30; x1, y1 = np.int32(coins.max(0)) + 30
cv2.imwrite(sortie.replace(".png", "-zoom.png"), np.clip(out, 0, 255).astype(np.uint8)[max(0, y0):y1, max(0, x0):x1])
