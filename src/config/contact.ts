/**
 * Configuration des liens de contact
 * 
 * IMPORTANT: Remplacez les placeholders par vos vrais liens/identifiants avant la mise en production.
 * 
 * Pour Snapchat:
 * - Format web: "https://snapchat.com/add/VOTRE_USERNAME"
 * - Format app: "snapchat://add/VOTRE_USERNAME" (ouvre l'app directement)
 * 
 * Pour WhatsApp:
 * - Format: "https://wa.me/CODE_PAYS_NUMERO" (sans le +)
 * - Exemple France: "https://wa.me/33123456789" (33 = code pays, 123456789 = numéro)
 * - Exemple avec message: "https://wa.me/33123456789?text=Bonjour"
 */
export const contactConfig = {
  snapchat: {
    url: "https://snapchat.com/add/username", // À MODIFIER
    label: "Snapchat"
  },
  whatsapp: {
    url: "https://wa.me/33XXXXXXXXX", // À MODIFIER (remplacez 33XXXXXXXXX par votre numéro)
    label: "WhatsApp"
  }
};

