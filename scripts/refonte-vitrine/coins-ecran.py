# Coins de l'écran (clair) d'un téléphone dans une photo : python coins-ecran.py photo.png x y seuil (x,y dans l'écran).
import sys, cv2, numpy as np
photo, cx, cy, seuil = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
p = cv2.imread(photo); g = cv2.cvtColor(p, cv2.COLOR_BGR2GRAY)
b = (g > seuil).astype(np.uint8)
b = cv2.morphologyEx(b, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
n, lab = cv2.connectedComponents(b)
comp = (lab == lab[cy, cx]).astype(np.uint8)*255
comp = cv2.morphologyEx(comp, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
cs, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c = max(cs, key=cv2.contourArea)
hull = cv2.convexHull(c)
for eps in np.linspace(0.005, 0.08, 60):
    a = cv2.approxPolyDP(hull, eps*cv2.arcLength(hull, True), True)
    if len(a) == 4: break
print(len(a), cv2.contourArea(c), a.reshape(-1, 2).tolist())
q = a.reshape(-1, 2).astype(np.float64); pts = c.reshape(-1, 2).astype(np.float64)
def dseg(P, A, B):
    AB = B-A; t = np.clip(((P-A)@AB)/(AB@AB), 0, 1); return np.linalg.norm(P-(A+t[:, None]*AB), axis=1)
D = np.stack([dseg(pts, q[i], q[(i+1) % 4]) for i in range(4)], 1); k = D.argmin(1)
lignes = []
for i in range(4):
    P = pts[(k == i) & (D.min(1) < 15)]
    L = np.linalg.norm(q[(i+1) % 4]-q[i]); A = q[i]; u = (q[(i+1) % 4]-A)/L
    t = (P-A)@u; P = P[(t > 0.15*L) & (t < 0.85*L)]  # hors coins arrondis
    vx, vy, x0, y0 = cv2.fitLine(P.astype(np.float32), cv2.DIST_HUBER, 0, 0.01, 0.01).ravel(); lignes.append((x0, y0, vx, vy))
def inter(l1, l2):
    x1, y1, a1, b1 = l1; x2, y2, a2, b2 = l2
    M = np.array([[a1, -a2], [b1, -b2]]); t = np.linalg.solve(M, [x2-x1, y2-y1]); return [round(float(x1+a1*t[0]), 1), round(float(y1+b1*t[0]), 1)]
print("coins", [inter(lignes[i-1], lignes[i]) for i in range(4)])
