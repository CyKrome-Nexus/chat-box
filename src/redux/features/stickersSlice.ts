import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ISticker, IStickerPack } from "@/src/interfaces/sticker-interface";

interface StickersState {
    packs: IStickerPack[];
    stickers: Record<string, ISticker>;
    installedPackIds: string[];
    favoriteStickerIds: string[];
    recentStickerIds: string[];
}

const MAX_RECENTS = 24;

const classicStickers: ISticker[] = [
    { id: "classic-bounce", packId: "classic", type: "lottie", source: require("../../../assets/stickers/bounce-ball.tgs"), emoji: "⚽️" },
    { id: "classic-spin", packId: "classic", type: "lottie", source: require("../../../assets/stickers/spin-star.tgs"), emoji: "⭐️" },
    { id: "classic-pulse", packId: "classic", type: "lottie", source: require("../../../assets/stickers/pulse-heart.tgs"), emoji: "❤️" },
    { id: "classic-square", packId: "classic", type: "lottie", source: require("../../../assets/stickers/spin-square.tgs"), emoji: "🟢" },
];

const initialState: StickersState = {
    packs: [
        {
            id: "classic",
            name: "Classic Pack",
            thumbnailSticker: "classic-bounce",
            stickerIds: classicStickers.map((s) => s.id),
        },
        {
            id: "my-stickers",
            name: "My Stickers",
            thumbnailSticker: "",
            stickerIds: [],
            isCustom: true,
        },
    ],
    stickers: Object.fromEntries(classicStickers.map((s) => [s.id, s])),
    installedPackIds: ["classic", "my-stickers"],
    favoriteStickerIds: [],
    recentStickerIds: [],
};

export const stickersSlice = createSlice({
    name: "stickers",
    initialState,
    reducers: {
        installPack: (state, action: PayloadAction<string>) => {
            if (!state.installedPackIds.includes(action.payload)) {
                state.installedPackIds.push(action.payload);
            }
        },
        uninstallPack: (state, action: PayloadAction<string>) => {
            state.installedPackIds = state.installedPackIds.filter((id) => id !== action.payload);
        },
        /** Simplified reorder: move one pack up/down by one position — see stickers.md for why this isn't drag-and-drop. */
        movePack: (state, action: PayloadAction<{ packId: string; direction: "up" | "down" }>) => {
            const index = state.installedPackIds.indexOf(action.payload.packId);
            if (index === -1) return;
            const swapWith = action.payload.direction === "up" ? index - 1 : index + 1;
            if (swapWith < 0 || swapWith >= state.installedPackIds.length) return;
            [state.installedPackIds[index], state.installedPackIds[swapWith]] = [
                state.installedPackIds[swapWith],
                state.installedPackIds[index],
            ];
        },
        toggleFavoriteSticker: (state, action: PayloadAction<string>) => {
            state.favoriteStickerIds = state.favoriteStickerIds.includes(action.payload)
                ? state.favoriteStickerIds.filter((id) => id !== action.payload)
                : [...state.favoriteStickerIds, action.payload];
        },
        addRecentSticker: (state, action: PayloadAction<string>) => {
            state.recentStickerIds = [action.payload, ...state.recentStickerIds.filter((id) => id !== action.payload)].slice(
                0,
                MAX_RECENTS
            );
        },
        addCustomSticker: (state, action: PayloadAction<ISticker>) => {
            state.stickers[action.payload.id] = action.payload;
            const myPack = state.packs.find((p) => p.id === "my-stickers");
            if (myPack) {
                myPack.stickerIds.push(action.payload.id);
                if (!myPack.thumbnailSticker) myPack.thumbnailSticker = action.payload.id;
            }
        },
        /** Installs a shared pack (from a chatbox.app/addstickers/[pack_id] deep link) that isn't already known locally. */
        registerAndInstallPack: (
            state,
            action: PayloadAction<{ pack: IStickerPack; stickers: ISticker[] }>
        ) => {
            if (!state.packs.some((p) => p.id === action.payload.pack.id)) {
                state.packs.push(action.payload.pack);
            }
            for (const sticker of action.payload.stickers) {
                state.stickers[sticker.id] = sticker;
            }
            if (!state.installedPackIds.includes(action.payload.pack.id)) {
                state.installedPackIds.push(action.payload.pack.id);
            }
        },
    },
});

export const {
    installPack,
    uninstallPack,
    movePack,
    toggleFavoriteSticker,
    addRecentSticker,
    addCustomSticker,
    registerAndInstallPack,
} = stickersSlice.actions;
export default stickersSlice.reducer;
