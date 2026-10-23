import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { LIMITS, pollInputSchema } from "@chatbox/shared";

import { AppText, CircleButton, PrimaryButton, ScalePressable, fonts, palette, radii } from "@/src/components/ui";
import { sendMessage } from "@/src/lib/sync/chatSync";

interface IDraftOption {
	key: number;
	text: string;
	description: string;
}

let nextKey = 3;

const CreatePoll = () => {
	const insets = useSafeAreaInsets();
	const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
	const [question, setQuestion] = useState("");
	const [options, setOptions] = useState<IDraftOption[]>([
		{ key: 1, text: "", description: "" },
		{ key: 2, text: "", description: "" },
	]);
	const [allowMultiple, setAllowMultiple] = useState(false);
	const [sending, setSending] = useState(false);

	const filled = options.filter((option) => option.text.trim());
	const parsed = pollInputSchema.safeParse({
		question,
		allowMultiple,
		options: filled.map((option) => ({ text: option.text, description: option.description.trim() || undefined })),
	});

	const update = (key: number, patch: Partial<IDraftOption>) => setOptions((current) => current.map((option) => (option.key === key ? { ...option, ...patch } : option)));

	const submit = async () => {
		if (!parsed.success || !conversationId) return;
		setSending(true);
		const message = await sendMessage({ conversationId, kind: "poll", poll: parsed.data });
		setSending(false);
		if (message) router.back();
		else Alert.alert("Couldn't send poll", "Check your connection and try again.");
	};

	return (
		<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<View style={[styles.root, { paddingTop: insets.top + 12 }]}>
				<View style={styles.header}>
					<AppText variant="title" weight="semibold">
						Create Poll
					</AppText>
					<CircleButton icon="close" label="Close" variant="soft" onPress={() => router.back()} />
				</View>
				<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
					<TextInput
						value={question}
						onChangeText={setQuestion}
						placeholder="What would you like to ask?"
						placeholderTextColor="#B9C1BE"
						maxLength={LIMITS.pollQuestionMax}
						multiline
						style={styles.question}
					/>
					{options.map((option, index) => (
						<Animated.View key={option.key} layout={LinearTransition.springify().damping(20)} entering={FadeInDown.springify().damping(18)} exiting={FadeOut.duration(150)} style={styles.option}>
							<View style={[styles.radio, option.text.trim() ? styles.radioActive : null]}>
								<AppText variant="caption" weight="semibold" tone={option.text.trim() ? "inverse" : "muted"}>
									{index + 1}
								</AppText>
							</View>
							<View style={styles.flex}>
								<TextInput
									value={option.text}
									onChangeText={(text) => update(option.key, { text })}
									placeholder={`Option ${index + 1}`}
									placeholderTextColor={palette.muted}
									maxLength={LIMITS.pollOptionMax}
									style={styles.optionTitle}
								/>
								<TextInput
									value={option.description}
									onChangeText={(description) => update(option.key, { description })}
									placeholder="Add a description (optional)"
									placeholderTextColor="#B9C1BE"
									maxLength={LIMITS.pollOptionMax}
									style={styles.optionDescription}
								/>
							</View>
							{options.length > LIMITS.pollOptionsMin ? (
								<CircleButton icon="remove" label={`Remove option ${index + 1}`} variant="plain" size={30} iconSize={18} iconColor={palette.muted} onPress={() => setOptions((current) => current.filter((item) => item.key !== option.key))} />
							) : null}
						</Animated.View>
					))}
					{options.length < LIMITS.pollOptionsMax ? (
						<ScalePressable accessibilityLabel="Add option" onPress={() => setOptions((current) => [...current, { key: nextKey++, text: "", description: "" }])} style={styles.addOption}>
							<Ionicons name="add-circle-outline" size={22} color={palette.brand} />
							<AppText variant="label" style={{ color: palette.brand }}>
								Add option
							</AppText>
						</ScalePressable>
					) : null}
					<View style={styles.toggle}>
						<View style={styles.flex}>
							<AppText variant="body" weight="medium">
								Allow multiple answers
							</AppText>
							<AppText variant="caption" tone="muted">
								Members can pick more than one option
							</AppText>
						</View>
						<Switch value={allowMultiple} onValueChange={setAllowMultiple} trackColor={{ true: palette.brand, false: "#E4EAE9" }} />
					</View>
				</ScrollView>
				<View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
					<PrimaryButton title="Send poll" onPress={() => void submit()} disabled={!parsed.success} loading={sending} />
				</View>
			</View>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	flex: { flex: 1 },
	root: { flex: 1, backgroundColor: palette.white },
	header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 16 },
	content: { paddingHorizontal: 24, gap: 16, paddingBottom: 24 },
	question: { fontFamily: fonts.medium, fontSize: 28, lineHeight: 36, color: palette.ink, paddingVertical: 12, minHeight: 100 },
	option: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radii.lg, borderWidth: 1, borderColor: "#E4EAE9" },
	radio: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#CDD1D0", alignItems: "center", justifyContent: "center" },
	radioActive: { backgroundColor: palette.brand, borderColor: palette.brand },
	optionTitle: { fontFamily: fonts.medium, fontSize: 14, color: palette.ink, paddingVertical: 2 },
	optionDescription: { fontFamily: fonts.regular, fontSize: 12, color: palette.muted, paddingVertical: 2 },
	addOption: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 6 },
	toggle: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
	footer: { paddingHorizontal: 24, paddingTop: 8 },
});

export default CreatePoll;
