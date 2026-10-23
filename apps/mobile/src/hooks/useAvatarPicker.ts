import { useCallback } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

/**
 * Camera/gallery picker specifically for profile photos: unlike the chat
 * attachment picker (useAttachmentPicker), this always crops to a square so
 * avatars render consistently everywhere they're shown.
 */
export const useAvatarPicker = () => {
	const pickAvatar = useCallback(async (source: "camera" | "gallery"): Promise<string | null> => {
		const permission =
			source === "camera"
				? await ImagePicker.requestCameraPermissionsAsync()
				: await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (!permission.granted) {
			Alert.alert(
				source === "camera" ? "Camera access needed" : "Photos access needed",
				"Enable access in Settings to update your profile photo."
			);
			return null;
		}

		const options: ImagePicker.ImagePickerOptions = {
			mediaTypes: ["images"],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		};

		const result =
			source === "camera"
				? await ImagePicker.launchCameraAsync(options)
				: await ImagePicker.launchImageLibraryAsync(options);

		if (result.canceled || !result.assets?.[0]) return null;
		return result.assets[0].uri;
	}, []);

	return { pickAvatar };
};
