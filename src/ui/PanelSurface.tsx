import type { CSSProperties, ReactNode } from "react";
import { Feather } from "lucide-react";
import { Modal } from "./Modal";

export type PanelSurfaceKind = "paper" | "wood-cabinet" | "travel-bag" | "handbook";

export type PanelSurfaceProps = {
  kind: PanelSurfaceKind;
  title: string;
  onClose: () => void;
  children: ReactNode;
  backgroundImage?: string;
  textureImage?: string;
  edgeImage?: string;
  titleDecoration?: ReactNode;
  closeIcon?: ReactNode;
  itemSlotStyle?: string;
};

type PanelSurfaceStyle = CSSProperties & Record<`--panel-${string}`, string>;

const imageToken = (value?: string) => value ? `url("${value}")` : "none";

export function PanelSurface({
  kind,
  title,
  onClose,
  children,
  backgroundImage,
  textureImage,
  edgeImage,
  titleDecoration,
  closeIcon,
  itemSlotStyle
}: PanelSurfaceProps) {
  const style: PanelSurfaceStyle = {
    "--panel-background-image": imageToken(backgroundImage),
    "--panel-texture-image": imageToken(textureImage),
    "--panel-edge-image": imageToken(edgeImage)
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      className={`room-panel-surface room-panel-surface--${kind}`}
      style={style}
      itemSlotStyle={itemSlotStyle}
      titleDecoration={titleDecoration}
      closeIcon={closeIcon ?? <Feather size={19} strokeWidth={1.7} />}
      animateClose
    >
      {children}
    </Modal>
  );
}
