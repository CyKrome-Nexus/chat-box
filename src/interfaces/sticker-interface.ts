export type TStickerType = "lottie" | "webp";

export interface ISticker {
    id: string;
    packId: string;
    type: TStickerType;
    /** For "lottie" stickers: a Metro asset module id from `require(".../file.tgs")`. For "webp": a local/remote uri. */
    source: number | string;
    emoji?: string;
}

export interface IStickerPack {
    id: string;
    name: string;
    thumbnailSticker: string; // sticker id
    stickerIds: string[];
    /** "My Stickers" — built by the in-app sticker maker, always installed, can't be uninstalled. */
    isCustom?: boolean;
}
