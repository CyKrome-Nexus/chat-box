import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import LottieView, { AnimationObject } from "lottie-react-native";
import { Image } from "expo-image";

import { loadTgsAnimationData } from "@/src/lib/stickers/tgsLoader";
import { ISticker } from "@/src/interfaces/sticker-interface";

/**
 * Renders one sticker — `.tgs` (gzipped Lottie) via `lottie-react-native`,
 * or animated WebP via `expo-image` (the only cross-platform RN `Image`
 * that actually animates WebP on both iOS and Android). Autoplays only
 * while `isVisible` (viewport-entry autoplay / pause-off-screen — see
 * stickers.md), pausing rather than unmounting so scrolling back into view
 * resumes instead of restarting.
 */
const StickerView = ({ sticker, size = 96, isVisible = true }: { sticker: ISticker; size?: number; isVisible?: boolean }) => {
	const [animationData, setAnimationData] = useState<AnimationObject | null>(null);
	const lottieRef = useRef<LottieView>(null);

	useEffect(() => {
		if (sticker.type !== "lottie" || typeof sticker.source !== "number") return;
		let cancelled = false;
		loadTgsAnimationData(sticker.source).then((data) => {
			if (!cancelled) setAnimationData(data as unknown as AnimationObject);
		});
		return () => {
			cancelled = true;
		};
	}, [sticker.source, sticker.type]);

	useEffect(() => {
		if (!lottieRef.current) return;
		if (isVisible) lottieRef.current.resume();
		else lottieRef.current.pause();
	}, [isVisible]);

	if (sticker.type === "webp") {
		return (
			<Image
				source={typeof sticker.source === "string" ? { uri: sticker.source } : sticker.source}
				style={{ width: size, height: size }}
				contentFit="contain"
				autoplay={isVisible}
			/>
		);
	}

	if (!animationData) return <View style={{ width: size, height: size }} />;

	return (
		<LottieView
			ref={lottieRef}
			source={animationData}
			style={{ width: size, height: size }}
			autoPlay={isVisible}
			loop
		/>
	);
};

export default StickerView;
