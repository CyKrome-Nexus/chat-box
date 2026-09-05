import { useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";

import Avatar from "@/src/components/images/Avatar";
import Colors from "@/src/constants/Colors";
import {
	regenerateInviteCode,
	removeGroupParticipant,
	setGroupSetting,
	setParticipantRole,
} from "@/src/redux/features/chatsSlice";
import { IChatRibbon, IGroupParticipant } from "@/src/interfaces/list-interface";
import { buildGroupInviteDeepLink, buildGroupInviteDisplayLink } from "@/src/lib/groups/inviteLink";
import { rotateSenderKey } from "@/src/lib/crypto/senderKeys";

const CURRENT_USER_ID = "me";

/** Group Info: participants, admin roles/permissions, invite link/QR. See docs/architecture/groups.md. */
const GroupInfoScreen = () => {
	const dispatch = useDispatch();
	const params = useLocalSearchParams<{ chatId: string; name?: string }>();
	const chat = useSelector((state: any) =>
		(state.chats.chats as IChatRibbon[]).find((c) => c.id === params.chatId)
	);
	const [showQr, setShowQr] = useState(false);

	if (!chat) return null;

	const participants = chat.participants || [];
	const me = participants.find((p) => p.id === CURRENT_USER_ID);
	const isAdmin = me?.role === "admin";

	const canEditInfo = isAdmin || chat.groupSettings?.whoCanEditInfo === "all";

	const handleParticipantPress = (participant: IGroupParticipant) => {
		if (!isAdmin || participant.id === CURRENT_USER_ID) return;
		Alert.alert(participant.name, undefined, [
			{ text: "Cancel", style: "cancel" },
			{
				text: participant.role === "admin" ? "Dismiss as Admin" : "Make Group Admin",
				onPress: () =>
					dispatch(
						setParticipantRole({
							chatId: chat.id,
							participantId: participant.id,
							role: participant.role === "admin" ? "member" : "admin",
						})
					),
			},
			{
				text: "Remove from Group",
				style: "destructive",
				onPress: () => {
					dispatch(removeGroupParticipant({ chatId: chat.id, participantId: participant.id }));
					// Forward secrecy at the membership level: a removed
					// member's cached sender key chain must not be able to
					// decrypt anything sent afterward. See e2ee-crypto.md.
					const remaining = participants
						.filter((p) => p.id !== participant.id && p.id !== CURRENT_USER_ID)
						.map((p) => p.id);
					rotateSenderKey(chat.id, CURRENT_USER_ID, remaining);
				},
			},
		]);
	};

	const handleAddParticipants = () => {
		router.push({
			pathname: "/contact-picker",
			params: { mode: "group" },
		});
		// Selection continues through /group-create-details, which is built
		// for creating a new group — adding to an *existing* group re-uses the
		// same picker but the result would need its own details step. Kept
		// simple: this repo doesn't have a dedicated add-to-existing-group
		// details screen, so this action is limited to demonstrating the
		// reducer (addGroupParticipants) rather than a full add-members flow.
	};

	const handleToggleSetting = (key: "whoCanSendMessages", enabledLabel: boolean) => {
		if (!isAdmin) return;
		dispatch(setGroupSetting({ chatId: chat.id, key, value: enabledLabel ? "admins" : "all" }));
	};

	const handleResetInviteLink = () => {
		if (!isAdmin) return;
		Alert.alert("Reset invite link?", "The old link will stop working.", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Reset", style: "destructive", onPress: () => dispatch(regenerateInviteCode(chat.id)) },
		]);
	};

	const handleShareInvite = async () => {
		if (!chat.inviteCode) return;
		try {
			await Share.share({
				message: `Join "${chat.name}" on Chatbox: ${buildGroupInviteDisplayLink(chat.inviteCode)}`,
			});
		} catch {}
	};

	const handleCopyInvite = async () => {
		if (!chat.inviteCode) return;
		await Clipboard.setStringAsync(buildGroupInviteDisplayLink(chat.inviteCode));
		Alert.alert("Copied", "Invite link copied to clipboard.");
	};

	return (
		<ScrollView style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={24} color="#000E08" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Group Info</Text>
				<View style={{ width: 24 }} />
			</View>

			<View style={styles.profileSection}>
				<Avatar data={chat.avatar} size={96} />
				<Text style={styles.name}>{chat.name}</Text>
				{!!chat.groupDescription && <Text style={styles.description}>{chat.groupDescription}</Text>}
			</View>

			{chat.inviteCode && (
				<View style={styles.inviteCard}>
					<Text style={styles.sectionTitle}>Invite via Link</Text>
					<Text style={styles.inviteLink} numberOfLines={1}>
						{buildGroupInviteDisplayLink(chat.inviteCode)}
					</Text>
					<View style={styles.inviteActions}>
						<TouchableOpacity style={styles.inviteButton} onPress={handleShareInvite}>
							<Ionicons name="share-outline" size={16} color={Colors.focused} />
							<Text style={styles.inviteButtonText}>Share</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inviteButton} onPress={handleCopyInvite}>
							<Ionicons name="copy-outline" size={16} color={Colors.focused} />
							<Text style={styles.inviteButtonText}>Copy</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inviteButton} onPress={() => setShowQr((v) => !v)}>
							<Ionicons name="qr-code-outline" size={16} color={Colors.focused} />
							<Text style={styles.inviteButtonText}>QR</Text>
						</TouchableOpacity>
						{isAdmin && (
							<TouchableOpacity style={styles.inviteButton} onPress={handleResetInviteLink}>
								<Ionicons name="refresh-outline" size={16} color="#F04A4C" />
								<Text style={[styles.inviteButtonText, { color: "#F04A4C" }]}>Reset</Text>
							</TouchableOpacity>
						)}
					</View>
					{showQr && (
						<View style={styles.qrWrapper}>
							<QRCode value={buildGroupInviteDeepLink(chat.inviteCode)} size={160} />
						</View>
					)}
				</View>
			)}

			{isAdmin && (
				<View style={styles.settingsCard}>
					<Text style={styles.sectionTitle}>Group Settings</Text>
					<TouchableOpacity
						style={styles.settingRow}
						onPress={() => handleToggleSetting("whoCanSendMessages", chat.groupSettings?.whoCanSendMessages !== "admins")}
					>
						<Text style={styles.settingLabel}>Only Admins Can Send Messages</Text>
						<Ionicons
							name={chat.groupSettings?.whoCanSendMessages === "admins" ? "checkbox" : "square-outline"}
							size={20}
							color={Colors.focused}
						/>
					</TouchableOpacity>
				</View>
			)}

			<View style={styles.participantsHeader}>
				<Text style={styles.sectionTitle}>{participants.length} Participants</Text>
				{canEditInfo && (
					<TouchableOpacity onPress={handleAddParticipants}>
						<Ionicons name="person-add-outline" size={20} color={Colors.focused} />
					</TouchableOpacity>
				)}
			</View>
			{participants.map((participant) => (
				<TouchableOpacity
					key={participant.id}
					style={styles.participantRow}
					onPress={() => handleParticipantPress(participant)}
				>
					<Avatar data={participant.avatar} size={40} />
					<Text style={styles.participantName}>
						{participant.id === CURRENT_USER_ID ? "You" : participant.name}
					</Text>
					{participant.role === "admin" && <Text style={styles.adminBadge}>Admin</Text>}
				</TouchableOpacity>
			))}
		</ScrollView>
	);
};

export default GroupInfoScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 56,
		paddingHorizontal: 16,
		paddingBottom: 12,
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#000E08",
	},
	profileSection: {
		alignItems: "center",
		paddingVertical: 24,
		gap: 6,
	},
	name: {
		fontSize: 20,
		fontWeight: "700",
		color: "#000E08",
	},
	description: {
		fontSize: 13,
		color: "#797C7B",
		textAlign: "center",
		paddingHorizontal: 30,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "700",
		color: "#797C7B",
		textTransform: "uppercase",
	},
	inviteCard: {
		marginHorizontal: 20,
		marginBottom: 16,
		padding: 14,
		backgroundColor: "#F2F8F7",
		borderRadius: 14,
		gap: 8,
	},
	inviteLink: {
		fontSize: 13,
		color: Colors.focused,
	},
	inviteActions: {
		flexDirection: "row",
		gap: 16,
		marginTop: 4,
	},
	inviteButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	inviteButtonText: {
		fontSize: 12,
		color: Colors.focused,
		fontWeight: "600",
	},
	qrWrapper: {
		alignItems: "center",
		paddingVertical: 12,
	},
	settingsCard: {
		marginHorizontal: 20,
		marginBottom: 16,
	},
	settingRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#f2f2f2",
	},
	settingLabel: {
		fontSize: 14,
		color: "#000E08",
		flex: 1,
	},
	participantsHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		marginBottom: 8,
	},
	participantRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 20,
		paddingVertical: 10,
	},
	participantName: {
		flex: 1,
		fontSize: 15,
		color: "#000E08",
	},
	adminBadge: {
		fontSize: 11,
		color: Colors.focused,
		fontWeight: "700",
	},
});
