import { useState } from "react";
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import EmojiPicker from "@/src/components/messages/EmojiPicker";
import { publishStory } from "@/src/lib/sync/storiesSync";

const GRADIENTS: [string, string][] = [
	["#24786D", "#11BC6B"],
	["#F04A4C", "#F5A623"],
	["#5B2C6F", "#8E44AD"],
	["#1B4F72", "#2E86C1"],
	["#000000", "#434343"],
	["#C0392B", "#E74C3C"],
];

const StoryTextEditorScreen = () => {
	const [text, setText] = useState("");
	const [gradientIndex, setGradientIndex] = useState(0);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [posting, setPosting] = useState(false);

	const handlePost = async () => {
		if (!text.trim() || posting) return;
		setPosting(true);
		try {
			await publishStory({ type: "text", text: text.trim(), backgroundColor: GRADIENTS[gradientIndex][0] });
			router.back();
		} catch (error) {
			Alert.alert("Couldn't post your status", error instanceof Error ? error.message : "Please try again.");
		} finally {
			setPosting(false);
		}
	};

	return (
		<LinearGradient colors={GRADIENTS[gradientIndex]} style={styles.container}>
			<View style={styles.topBar}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="close" size={26} color="#fff" />
				</TouchableOpacity>
				<TouchableOpacity onPress={() => void handlePost()} disabled={!text.trim()}>
					<Text style={[styles.postText, !text.trim() && styles.postTextDisabled]}>Post</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.textArea}>
				<TextInput
					style={styles.textInput}
					placeholder="Type a status…"
					placeholderTextColor="rgba(255,255,255,0.7)"
					value={text}
					onChangeText={setText}
					multiline
					autoFocus
					textAlign="center"
				/>
			</View>

			<View style={styles.bottomBar}>
				<View style={styles.gradientRow}>
					{GRADIENTS.map((gradient, index) => (
						<TouchableOpacity key={index} onPress={() => setGradientIndex(index)}>
							<LinearGradient
								colors={gradient}
								style={[styles.gradientSwatch, gradientIndex === index && styles.gradientSwatchActive]}
							/>
						</TouchableOpacity>
					))}
				</View>
				<TouchableOpacity onPress={() => setShowEmojiPicker((prev) => !prev)}>
					<Ionicons name="happy-outline" size={26} color="#fff" />
				</TouchableOpacity>
			</View>

			<Modal visible={showEmojiPicker} transparent animationType="slide" onRequestClose={() => setShowEmojiPicker(false)}>
				<View style={styles.emojiModalBackdrop}>
					<View style={styles.emojiModalSheet}>
						<EmojiPicker onSelectEmoji={(emoji) => setText((prev) => prev + emoji)} />
					</View>
				</View>
			</Modal>
		</LinearGradient>
	);
};

export default StoryTextEditorScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	topBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingTop: 56,
		paddingHorizontal: 20,
	},
	postText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "700",
	},
	postTextDisabled: {
		opacity: 0.4,
	},
	textArea: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 24,
	},
	textInput: {
		color: "#fff",
		fontSize: 26,
		fontWeight: "600",
		textAlign: "center",
	},
	bottomBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	gradientRow: {
		flexDirection: "row",
		gap: 10,
	},
	gradientSwatch: {
		width: 28,
		height: 28,
		borderRadius: 14,
		borderWidth: 2,
		borderColor: "transparent",
	},
	gradientSwatchActive: {
		borderColor: "#fff",
	},
	emojiModalBackdrop: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.3)",
	},
	emojiModalSheet: {
		backgroundColor: "#fff",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		overflow: "hidden",
	},
});
