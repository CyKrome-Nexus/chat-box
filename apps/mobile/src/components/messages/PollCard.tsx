import { StyleSheet, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import type { Poll } from "@chatbox/shared";

import Avatar from "@/src/components/images/Avatar";
import { AppText, ScalePressable, palette, radii, springs } from "@/src/components/ui";
import { messagesApi } from "@/src/lib/api/services";
import type { RootState } from "@/src/redux/store/store";
import { patchMessage } from "@/src/redux/features/messagesSlice";

const Bar = ({ share, tint }: { share: number; tint: string }) => {
	const style = useAnimatedStyle(() => ({ transform: [{ scaleX: withSpring(Math.max(share, 0.0001), springs.gentle) }] }));
	return <Animated.View style={[styles.bar, { backgroundColor: tint }, style]} />;
};

// Figma "Create poll" card: radio options with title/description, live tallies and voter avatars.
const PollCard = ({ messageId, conversationId, poll, isSender }: { messageId: string; conversationId: string; poll: Poll; isSender: boolean }) => {
	const dispatch = useDispatch();
	const myId = useSelector((state: RootState) => state.user?.id ?? "");
	const participants = useSelector((state: RootState) => state.chats.chats.find((chat) => chat.id === conversationId)?.participants ?? []);
	const voters = [...new Set(poll.options.flatMap((option) => option.voterIds))];
	const pending = messageId.startsWith("local-");

	const vote = (optionId: string) => {
		if (pending || poll.closedAt) return;
		const mine = poll.options.filter((option) => option.voterIds.includes(myId)).map((option) => option.id);
		const next = poll.allowMultiple
			? mine.includes(optionId)
				? mine.filter((id) => id !== optionId)
				: [...mine, optionId]
			: mine.includes(optionId)
				? []
				: [optionId];
		const optimistic: Poll = {
			...poll,
			options: poll.options.map((option) => ({
				...option,
				voterIds: next.includes(option.id) ? [...new Set([...option.voterIds, myId])] : option.voterIds.filter((id) => id !== myId),
			})),
		};
		dispatch(patchMessage({ conversationId, messageId, patch: { poll: optimistic } }));
		void messagesApi.vote(messageId, next).catch(() => dispatch(patchMessage({ conversationId, messageId, patch: { poll } })));
	};

	const textTone = isSender ? "inverse" : "default";
	const tint = isSender ? "rgba(255,255,255,0.18)" : "rgba(32,160,144,0.12)";

	return (
		<View style={styles.container}>
			<AppText variant="body" weight="semibold" tone={textTone}>
				{poll.question}
			</AppText>
			{poll.options.map((option) => {
				const chosen = option.voterIds.includes(myId);
				const share = voters.length ? option.voterIds.length / voters.length : 0;
				return (
					<ScalePressable
						key={option.id}
						accessibilityLabel={`Vote ${option.text}`}
						accessibilityState={{ selected: chosen }}
						haptic
						scaleTo={0.98}
						onPress={() => vote(option.id)}
						style={[styles.option, { borderColor: isSender ? "rgba(255,255,255,0.35)" : "#E4EAE9", opacity: 1 }]}
					>
						<Bar share={share} tint={tint} />
						<View style={[styles.radio, { borderColor: isSender ? palette.white : palette.brand }, chosen && { backgroundColor: isSender ? palette.white : palette.brand }]}>
							{chosen ? <Ionicons name="checkmark" size={14} color={isSender ? palette.brand : palette.white} /> : null}
						</View>
						<View style={styles.optionText}>
							<AppText variant="label" tone={textTone}>
								{option.text}
							</AppText>
							{option.description ? (
								<AppText variant="caption" tone={isSender ? "inverse" : "muted"} style={isSender ? styles.dim : undefined}>
									{option.description}
								</AppText>
							) : null}
						</View>
						<AppText variant="label" tone={textTone}>
							{option.voterIds.length}
						</AppText>
					</ScalePressable>
				);
			})}
			<View style={styles.footer}>
				<View style={styles.avatars}>
					{voters.slice(0, 5).map((id, index) => (
						<View key={id} style={[styles.avatar, { marginLeft: index ? -10 : 0 }]}>
							<Avatar data={participants.find((participant) => participant.id === (id === myId ? "me" : id))?.avatar} size={22} />
						</View>
					))}
				</View>
				<AppText variant="caption" tone={isSender ? "inverse" : "muted"} style={isSender ? styles.dim : undefined}>
					{voters.length} {voters.length === 1 ? "vote" : "votes"}
					{poll.allowMultiple ? " · multiple choice" : ""}
				</AppText>
			</View>
		</View>
	);
};

export default PollCard;

const styles = StyleSheet.create({
	container: { gap: 10, minWidth: 240 },
	option: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radii.lg, borderWidth: 1, overflow: "hidden" },
	bar: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, transformOrigin: "left" },
	radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
	optionText: { flex: 1, gap: 2 },
	footer: { flexDirection: "row", alignItems: "center", gap: 8 },
	avatars: { flexDirection: "row" },
	avatar: { borderRadius: 12, borderWidth: 1.5, borderColor: palette.white },
	dim: { opacity: 0.8 },
});
