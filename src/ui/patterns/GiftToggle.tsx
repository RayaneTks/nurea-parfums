import { Gift } from "lucide-react";
import { Chip } from "../primitives/Chip";

type GiftToggleProps = {
  checked: boolean;
  /**
   * Coché : la ligne est offerte, son prix passe à 0 (le coût reste compté).
   * Décoché : le dernier prix saisi est restauré. Ces deux effets sur le prix
   * sont à la charge de l'appelant, qui détient la ligne.
   */
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/** Bascule « Offert » d'une ligne de vente ou de commande (05 §3.2). */
export function GiftToggle({ checked, onChange, disabled, className }: GiftToggleProps) {
  return (
    <Chip
      active={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      icon={<Gift size={14} />}
      className={className}
    >
      Offert
    </Chip>
  );
}
