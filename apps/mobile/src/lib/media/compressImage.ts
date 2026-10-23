import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";

const TARGET_BYTES = 300 * 1024;
const MIN_QUALITY = 0.3;
const QUALITY_STEP = 0.15;

/**
 * Re-encodes an image to WEBP, stepping quality down until it's under the
 * ticket's 300KB target (or hits MIN_QUALITY, whichever comes first — chat
 * images are still sent past that floor rather than degraded further).
 */
export const compressImage = async (
    uri: string,
    actions: ImageManipulator.Action[] = []
): Promise<{ uri: string; size: number }> => {
    let quality = 0.8;
    let result = await ImageManipulator.manipulateAsync(uri, actions, {
        compress: quality,
        format: ImageManipulator.SaveFormat.WEBP,
    });
    let size = new File(result.uri).size;

    while (size > TARGET_BYTES && quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
        result = await ImageManipulator.manipulateAsync(uri, actions, {
            compress: quality,
            format: ImageManipulator.SaveFormat.WEBP,
        });
        size = new File(result.uri).size;
    }

    return { uri: result.uri, size };
};
