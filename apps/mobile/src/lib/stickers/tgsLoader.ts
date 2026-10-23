import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { ungzip } from "pako";

/**
 * `.tgs` is Telegram's animated sticker format: a gzip-compressed Lottie/
 * Bodymovin JSON animation. `lottie-react-native` expects a plain JS object
 * (or a `.json` module), not a compressed asset, so bundled `.tgs` files
 * (Metro treats them as opaque binary assets — see metro.config.js) are
 * resolved to a local file via `expo-asset`, read as bytes, gunzipped with
 * `pako`, and parsed. Cached per asset module id so switching between
 * stickers repeatedly doesn't re-decompress every render.
 */
const cache = new Map<number, Promise<Record<string, unknown>>>();

export const loadTgsAnimationData = (assetModuleId: number): Promise<Record<string, unknown>> => {
    let promise = cache.get(assetModuleId);
    if (!promise) {
        promise = (async () => {
            const asset = Asset.fromModule(assetModuleId);
            await asset.downloadAsync();
            if (!asset.localUri) throw new Error("Failed to resolve .tgs asset to a local file.");

            const bytes = await new File(asset.localUri).bytes();
            const json = ungzip(bytes, { toText: true });
            return JSON.parse(json);
        })();
        cache.set(assetModuleId, promise);
    }
    return promise;
};
