import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";

import { isPdf } from "@/src/lib/media/documentIcon";

/**
 * In-app document viewer. PDFs render inline via WebView (WKWebView on iOS
 * renders local file:// PDFs natively; recent Chromium-based Android WebView
 * builds bundle PDFium and generally do too, but this isn't guaranteed on
 * every OEM/Android version) — "Open Externally" is always offered as a
 * fallback. Non-PDF documents (docx/xlsx/zip) skip the WebView entirely and
 * go straight to that fallback, since there's no in-app renderer for them.
 */
const DocumentPreviewScreen = () => {
	const params = useLocalSearchParams<{ uri: string; name?: string; mimeType?: string }>();
	const [loadFailed, setLoadFailed] = useState(false);
	const canPreview = isPdf(params.name, params.mimeType) && !loadFailed;

	const openExternally = async () => {
		if (await Sharing.isAvailableAsync()) {
			await Sharing.shareAsync(params.uri, { mimeType: params.mimeType });
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.topBar}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="close" size={26} color="#fff" />
				</TouchableOpacity>
				<Text style={styles.title} numberOfLines={1}>
					{params.name || "Document"}
				</Text>
				<TouchableOpacity onPress={openExternally}>
					<Ionicons name="open-outline" size={22} color="#fff" />
				</TouchableOpacity>
			</View>

			{canPreview ? (
				<WebView
					source={{ uri: params.uri }}
					style={styles.webview}
					originWhitelist={["*"]}
					startInLoadingState
					renderLoading={() => (
						<View style={styles.loading}>
							<ActivityIndicator color="#fff" />
						</View>
					)}
					onError={() => setLoadFailed(true)}
				/>
			) : (
				<View style={styles.fallback}>
					<Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.4)" />
					<Text style={styles.fallbackText}>
						This file type can't be previewed in-app.
					</Text>
					<TouchableOpacity style={styles.openButton} onPress={openExternally}>
						<Text style={styles.openButtonText}>Open Externally</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
};

export default DocumentPreviewScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#111",
	},
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 56,
		paddingHorizontal: 20,
		paddingBottom: 12,
		gap: 12,
	},
	title: {
		flex: 1,
		color: "#fff",
		fontSize: 15,
		fontWeight: "600",
		textAlign: "center",
	},
	webview: {
		flex: 1,
		backgroundColor: "#111",
	},
	loading: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
	},
	fallback: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: 16,
		paddingHorizontal: 40,
	},
	fallbackText: {
		color: "rgba(255,255,255,0.7)",
		textAlign: "center",
	},
	openButton: {
		backgroundColor: "#11BC6B",
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 24,
	},
	openButtonText: {
		color: "#fff",
		fontWeight: "600",
	},
});
