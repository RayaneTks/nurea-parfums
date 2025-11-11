import snapchatIcon from "@/assets/snapchat-icon.png";

interface SnapchatIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SnapchatIcon = ({ className, style }: SnapchatIconProps) => {
  return (
    <img
      src={snapchatIcon}
      alt="Snapchat"
      className={className}
      style={style}
    />
  );
};
