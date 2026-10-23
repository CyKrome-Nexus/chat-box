export type TOverlayKind = "text" | "sticker";

export interface IOverlayItem {
    id: string;
    kind: TOverlayKind;
    content: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    color: string;
    fontFamily?: string;
}

export interface IDoodlePath {
    id: string;
    d: string;
    color: string;
}

export const TEXT_COLORS = ["#FFFFFF", "#000000", "#F04A4C", "#11BC6B", "#FFC542", "#24786D"];

export const TEXT_FONTS = [
    { key: "system", label: "Aa", fontFamily: undefined },
    { key: "carme", label: "Aa", fontFamily: "Carme Regular" },
    { key: "inter", label: "Aa", fontFamily: "Inter 18pt Bold" },
];
