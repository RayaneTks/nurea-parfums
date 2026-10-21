# Incruste une capture d'écran réelle dans l'écran d'un téléphone d'une photo (perspective, coins arrondis).
# Usage : python incruste-ecran.py '{"photo":…,"ecran":…,"coins":[[x,y]×4 HG,HD,BD,BG],"sortie":…,"flou_stories":[y0,y1]}'
# Méthode et réglages utilisés : docs/refonte-vitrine/annexes/photos-editoriales.md (main).
import sys, json, cv2, numpy as np
def charge_ecran(path, flou_stories=False, halo=0.0):
    s = cv2.imread(path)
    h, w = s.shape[:2]
    if flou_stories:  # Snapchat : stories (prix, flacons de marques) illisibles
        y0, y1 = int(h*flou_stories[0]), int(h*flou_stories[1])
        s[y0:y1] = cv2.GaussianBlur(s[y0:y1], (0, 0), 40)
    m = np.zeros((h, w), np.uint8)
    r = int(w*0.11)
    cv2.rectangle(m, (r, 0), (w-r, h), 255, -1); cv2.rectangle(m, (0, r), (w, h-r), 255, -1)
    for cx, cy in [(r, r), (w-r, r), (r, h-r), (w-r, h-r)]: cv2.circle(m, (cx, cy), r, 255, -1, cv2.LINE_AA)
    return s, m
def incruste(photo, ecran, coins, sortie, flou=1.2, lum=0.92, reflet=0.14, flou_stories=False, halo=0.0):
    p = cv2.imread(photo); H, W = p.shape[:2]
    s, m = charge_ecran(ecran, flou_stories)
    h, w = s.shape[:2]
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    M = cv2.getPerspectiveTransform(src, np.float32(coins))
    ws = cv2.warpPerspective(s, M, (W, H), flags=cv2.INTER_AREA)
    wm = cv2.warpPerspective(m, M, (W, H), flags=cv2.INTER_LINEAR).astype(np.float32)/255
    wm = cv2.GaussianBlur(cv2.erode(wm, np.ones((3, 3))), (0, 0), 0.8)
    if flou: ws = cv2.GaussianBlur(ws, (0, 0), flou)
    ws = ws.astype(np.float32)*lum
    # reflets de la photo d'origine : sa partie claire au-dessus de la moyenne locale
    pf = p.astype(np.float32)
    hl = np.clip(pf - cv2.GaussianBlur(pf, (0, 0), 25), 0, 255)
    comp = ws + hl*halo
    comp = comp*(1-reflet) + pf*reflet
    out = pf*(1-wm[..., None]) + comp*wm[..., None]
    cv2.imwrite(sortie, np.clip(out, 0, 255).astype(np.uint8))
    # contrôle : contour dessiné
    c = np.clip(out, 0, 255).astype(np.uint8).copy()
    cv2.polylines(c, [np.int32(coins)], True, (0, 255, 0), 1)
    return c
if __name__ == "__main__":
    a = json.loads(sys.argv[1])
    c = incruste(**a)
    x0 = int(min(q[0] for q in a["coins"]))-40; y0 = int(min(q[1] for q in a["coins"]))-40
    x1 = int(max(q[0] for q in a["coins"]))+40; y1 = int(max(q[1] for q in a["coins"]))+40
    cv2.imwrite(a["sortie"].replace(".png", "-controle.png"), c[max(0,y0):y1, max(0,x0):x1])
