import { Ionicons } from "@expo/vector-icons";

type TDocKind = "pdf" | "word" | "excel" | "zip" | "generic";

const EXT_MAP: Record<string, TDocKind> = {
    pdf: "pdf",
    doc: "word",
    docx: "word",
    xls: "excel",
    xlsx: "excel",
    zip: "zip",
    rar: "zip",
    "7z": "zip",
};

const ICONS: Record<TDocKind, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
    pdf: { name: "document-text", color: "#F04A4C" },
    word: { name: "document-text", color: "#2B579A" },
    excel: { name: "grid", color: "#217346" },
    zip: { name: "file-tray-full", color: "#B8860B" },
    generic: { name: "document-text", color: "#24786D" },
};

export const getDocumentIcon = (name?: string, mimeType?: string) => {
    const ext = name?.split(".").pop()?.toLowerCase();
    const kind = (ext && EXT_MAP[ext]) || (mimeType?.includes("pdf") ? "pdf" : "generic");
    return ICONS[kind];
};

export const isPdf = (name?: string, mimeType?: string) =>
    name?.toLowerCase().endsWith(".pdf") || mimeType === "application/pdf";
