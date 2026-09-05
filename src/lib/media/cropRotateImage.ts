import * as ImageManipulator from "expo-image-manipulator";

export type TCropAspect = "free" | "1:1" | "4:3" | "16:9";

const ASPECT_RATIOS: Record<Exclude<TCropAspect, "free">, number> = {
    "1:1": 1,
    "4:3": 4 / 3,
    "16:9": 16 / 9,
};

/** Rotates an image 90 degrees clockwise, returning the new uri + dimensions. */
export const rotateImage90 = (uri: string) =>
    ImageManipulator.manipulateAsync(uri, [{ rotate: 90 }], { format: ImageManipulator.SaveFormat.PNG });

/**
 * Applies a centered crop to the given aspect ratio preset. This is a
 * locked, centered crop rather than an interactive drag-to-reposition crop
 * box — see docs/architecture/media-editor.md for the scoping note.
 */
export const cropImageToAspect = (
    uri: string,
    width: number,
    height: number,
    aspect: TCropAspect
) => {
    if (aspect === "free") return Promise.resolve({ uri, width, height, base64: undefined });

    const targetRatio = ASPECT_RATIOS[aspect];
    const currentRatio = width / height;

    let cropWidth = width;
    let cropHeight = height;
    if (currentRatio > targetRatio) {
        cropWidth = height * targetRatio;
    } else {
        cropHeight = width / targetRatio;
    }

    const originX = Math.round((width - cropWidth) / 2);
    const originY = Math.round((height - cropHeight) / 2);

    return ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX, originY, width: Math.round(cropWidth), height: Math.round(cropHeight) } }],
        { format: ImageManipulator.SaveFormat.PNG }
    );
};
