import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import SettingsScreenHeader from "@/src/components/settings/SettingsScreenHeader";
import Colors from "@/src/constants/Colors";

const FAQS = [
	{
		question: "How do I start a new chat?",
		answer: 'Go to the Contacts tab and tap a contact, or tap "Add Contact" to add someone new.',
	},
	{
		question: "How do I mute a conversation?",
		answer: "Swipe a chat left in the Home tab and tap the bell icon.",
	},
	{
		question: "Are my messages encrypted?",
		answer: "End-to-end encryption is planned but not yet implemented in this build.",
	},
	{
		question: "How do I change my profile photo?",
		answer: "Open your profile from Settings and tap your avatar to take or choose a new photo.",
	},
];

const SettingsHelp = () => {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<SettingsScreenHeader title="Help" />

			<Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
			{FAQS.map((faq, index) => {
				const expanded = expandedIndex === index;
				return (
					<TouchableOpacity
						key={faq.question}
						style={styles.faqItem}
						onPress={() => setExpandedIndex(expanded ? null : index)}
					>
						<View style={styles.faqQuestionRow}>
							<Text style={styles.faqQuestion}>{faq.question}</Text>
							<Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#797C7B" />
						</View>
						{expanded && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
					</TouchableOpacity>
				);
			})}

			<Text style={styles.sectionTitle}>Contact Us</Text>
			<TouchableOpacity
				style={styles.linkRow}
				onPress={() =>
					Alert.alert(
						"Contact Support",
						"In-app support and feedback submission isn't wired up to a real support system yet in this build."
					)
				}
			>
				<Text style={styles.linkText}>Contact Support / Feedback</Text>
			</TouchableOpacity>

			<Text style={styles.sectionTitle}>Legal</Text>
			<TouchableOpacity
				style={styles.linkRow}
				onPress={() => Alert.alert("Terms of Service", "Placeholder — Terms of Service content goes here.")}
			>
				<Text style={styles.linkText}>Terms of Service</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={styles.linkRow}
				onPress={() => Alert.alert("Privacy Policy", "Placeholder — Privacy Policy content goes here.")}
			>
				<Text style={styles.linkText}>Privacy Policy</Text>
			</TouchableOpacity>
		</ScrollView>
	);
};

export default SettingsHelp;

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: "#fff",
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "700",
		color: "#797C7B",
		textTransform: "uppercase",
		marginTop: 20,
		marginBottom: 4,
	},
	faqItem: {
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: "#F0F0F0",
	},
	faqQuestionRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	faqQuestion: {
		fontSize: 15,
		fontWeight: "600",
		flex: 1,
		paddingRight: 10,
	},
	faqAnswer: {
		fontSize: 13,
		color: "#797C7B",
		marginTop: 8,
		lineHeight: 18,
	},
	linkRow: {
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: "#F0F0F0",
	},
	linkText: {
		fontSize: 16,
		fontWeight: "600",
		color: Colors.focused,
	},
});
