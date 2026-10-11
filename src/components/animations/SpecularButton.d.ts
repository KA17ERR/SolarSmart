import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export interface SpecularButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  idleIntensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  glow?: number;
  speed?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
  style?: CSSProperties;
}

declare function SpecularButton(props: SpecularButtonProps): JSX.Element;
export default SpecularButton;
