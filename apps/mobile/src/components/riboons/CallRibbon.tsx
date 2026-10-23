import { memo } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { CallLog } from "@chatbox/shared";

import Avatar from "../images/Avatar";
import { AppText, CircleButton, palette } from "@/src/components/ui";
import { callEngineManager } from "@/src/lib/calling/callEngineManager";
import { formatCallTime } from "@/src/lib/format/time";
import type { RootState } from "@/src/redux/store/store";

const DIRECTION_ICON = {
	incoming: { name: "arrow-down-outline", color: palette.brand },
	outgoing: { name: "arrow-up-outline", color: "#7E5BEF" },
	missed: { name: "arrow-down-outline", color: palette.danger },
} as const;

// One row of the call log; tapping the phone/video icons calls the same conversation back.
const CallRibbon = ({ call }: { call: CallLog }) => {
	const chat = useSelector((state: RootState) => state.chats.chats.find((item) => item.id === call.conversationId));
	const missed = call.status === "missed" || (call.direction === "incoming" && call.status === "declined");
	const icon = missed ? DIRECTION_ICON.missed : DIRECTION_ICON[call.direction];
	const title = chat?.name ?? (call.participants.length === 1 ? call.participants[0]?.name : call.participants.map((p) => p.name.split(" ")[0]).join(", "));
	const avatarUrl = chat?.avatar?.url || call.participants[0]?.avatarUrl || undefined;

	const callBack = (type: "audio" | "video") => {
		if (!chat) return Alert.alert("Chat unavailable", "You're no longer part of this conversation.");
		callEngineManager.startOutgoing(chat, type).catch((error: Error) => Alert.alert("Call failed", error.message));
	};

	return (
		<View style={styles.row}>
			<Avatar data={{ url: avatarUrl }} size={52} />
			<View style={styles.main}>
				<AppText variant="heading" numberOfLines={1}>
					{title}
				</AppText>
				<View style={styles.meta}>
					<Ionicons name={call.type === "video" ? "videocam" : "call"} size={12} color={icon.color} />
					<Ionicons name={icon.name} size={12} color={icon.color} style={styles.arrow} />
					<AppText variant="caption" tone={missed ? "danger" : "muted"}>
						{formatCallTime(Date.parse(call.startedAt))}
					</AppText>
				</View>
			</View>
			<CircleButton icon="call-outline" label={`Voice call ${title}`} variant="plain" size={36} iconSize={22} iconColor={palette.muted} onPress={() => callBack("audio")} />
			<CircleButton icon="videocam-outline" label={`Video call ${title}`} variant="plain" size={36} iconSize={22} iconColor={palette.muted} onPress={() => callBack("video")} />
		</View>
	);
};

const styles = StyleSheet.create({
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingVertical: 12 },
	main: { flex: 1, gap: 6 },
	meta: { flexDirection: "row", alignItems: "center", gap: 4 },
	arrow: { marginLeft: -4, marginRight: 2 },
});

export default memo(CallRibbon);
