import { useCallback } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";

import { IAttachment } from "@/src/interfaces/message-interface";
import { TAttachmentOption } from "@/src/components/messages/AttachmentSheet";

/**
 * Wraps the device integrations (camera/gallery via expo-image-picker,
 * files via expo-document-picker, GPS via expo-location) behind a single
 * `pickAttachment` call that handles permission prompts and returns a
 * ready-to-send IAttachment, or null if the user cancelled/denied.
 */
export const useAttachmentPicker = () => {
	const pickAttachment = useCallback(
		async (option: TAttachmentOption): Promise<IAttachment | null> => {
			switch (option) {
				// "camera" is handled by Chat.tsx before this is ever called — it
				// opens the in-app camera/editor flow (see media-editor.md)
				// instead of the system camera app.
				case "gallery": {
					const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
					if (!permission.granted) {
						Alert.alert("Photos access needed", "Enable photo library access in Settings to share media.");
						return null;
					}

					const result = await ImagePicker.launchImageLibraryAsync({
						mediaTypes: ["images", "videos"],
						quality: 0.8,
					});
					return toAttachment(result);
				}

				case "document": {
					const result = await DocumentPicker.getDocumentAsync({
						type: "*/*",
						copyToCacheDirectory: true,
					});
					if (result.canceled || !result.assets?.[0]) return null;

					const file = result.assets[0];
					return {
						type: "document",
						uri: file.uri,
						name: file.name,
						size: file.size,
						mimeType: file.mimeType,
						uploadProgress: 0,
					};
				}

				case "location": {
					const permission = await Location.requestForegroundPermissionsAsync();
					if (!permission.granted) {
						Alert.alert("Location access needed", "Enable location access in Settings to share your location.");
						return null;
					}

					const position = await Location.getCurrentPositionAsync({});
					return {
						type: "location",
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
					};
				}

				default:
					return null;
			}
		},
		[]
	);

	return { pickAttachment };
};

const toAttachment = (result: ImagePicker.ImagePickerResult): IAttachment | null => {
	if (result.canceled || !result.assets?.[0]) return null;

	const asset = result.assets[0];
	return {
		type: asset.type === "video" ? "video" : "image",
		uri: asset.uri,
		mimeType: asset.mimeType,
		size: asset.fileSize,
		uploadProgress: 0,
	};
};
