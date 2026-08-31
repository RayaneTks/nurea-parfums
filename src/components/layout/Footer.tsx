import type { FC, ReactNode } from "react";
import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { CONTACT } from "@/lib/data";
import { SnapchatIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { SITE_NAME } from "@/lib/site";

const NAVIGATION = [
  { href: "/", label: "Le catalogue" },
  { href: "/marque", label: "La parfumerie" },
  { href: "/contact", label: "Contact & commande" },
] as const;

const LEGAL = [
  { href: "/legal", label: "Mentions légales" },
  { href: "/legal", label: "Politique de confidentialité" },
  { href: "/legal", label: "CGV / CGU" },
  { href: "/legal", label: "Livraison & retours" },
] as const;

const SOCIAL = [
  { href: CONTACT.snapchat, label: "Snapchat", Icon: SnapchatIcon },
  { href: CONTACT.whatsapp, label: "WhatsApp", Icon: WhatsAppIcon },
] as const;

/**
 * Pied de page.
 *
 * Composant serveur : l'année provient du rendu, et le logo est servi dans ses
 * deux variantes commutées en CSS. Ce bloc n'a donc plus besoin d'attendre
 * l'hydratation pour s'afficher entièrement.
 */
export const Footer: FC = () => (
  <footer className="border-t border-nurea-border">
    <div className="nurea-page grid gap-12 py-18 md:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-6">
        <Link href="/" aria-label={`${SITE_NAME} — accueil`} className="w-fit">
          <BrandLogo className="h-8" />
        </Link>

        <p className="nurea-caption max-w-xs">
          Une sélection tenue à la main, pour homme et pour femme, sans
          intermédiaire entre vous et le flacon.
        </p>

        <div className="flex gap-3">
          {SOCIAL.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center border border-nurea-border text-nurea-muted transition-colors duration-nurea ease-out hover:border-nurea-accent hover:text-nurea-accent"
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          ))}
        </div>
      </div>

      <FooterColumn title="Navigation">
        {NAVIGATION.map(({ href, label }) => (
          <li key={label}>
            <Link
              href={href}
              className="transition-colors duration-nurea ease-out hover:text-nurea-text"
            >
              {label}
            </Link>
          </li>
        ))}
      </FooterColumn>

      <FooterColumn title="Contact">
        <li className="flex items-start gap-3">
          <Mail size={16} strokeWidth={1.5} aria-hidden className="mt-1 shrink-0 text-nurea-accent" />
          <a
            href={`mailto:${CONTACT.email}`}
            className="min-w-0 break-words transition-colors duration-nurea ease-out hover:text-nurea-text"
          >
            {CONTACT.email}
          </a>
        </li>
        <li className="flex items-start gap-3">
          <MapPin size={16} strokeWidth={1.5} aria-hidden className="mt-1 shrink-0 text-nurea-accent" />
          <span>{CONTACT.location}. Envoi possible sur demande.</span>
        </li>
      </FooterColumn>

      <FooterColumn title="Légal">
        {LEGAL.map(({ href, label }) => (
          <li key={label}>
            <Link
              href={href}
              className="transition-colors duration-nurea ease-out hover:text-nurea-text"
            >
              {label}
            </Link>
          </li>
        ))}
      </FooterColumn>
    </div>

    <div className="nurea-page flex flex-col gap-3 border-t border-nurea-border py-8 sm:flex-row sm:items-center sm:justify-between">
      <p className="nurea-caption">
        © {new Date().getFullYear()} {SITE_NAME}. Tous droits réservés.
      </p>
      <p className="nurea-label text-nurea-subtle">Marseille</p>
    </div>
  </footer>
);

const FooterColumn: FC<{ title: string; children: ReactNode }> = ({
  title,
  children,
}) => (
  <div className="flex flex-col gap-6">
    <h2 className="nurea-label">{title}</h2>
    <ul className="flex flex-col gap-3 text-sm text-nurea-muted">{children}</ul>
  </div>
);
