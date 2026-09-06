import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import Avatar from "@/src/components/images/Avatar";
import { useAppTheme } from "@/src/lib/theme/ThemeContext";
import { switchActiveAccount } from "@/src/lib/accounts/accountSwitcher";
import { getAccountsRegistry, saveAccountsRegistry } from "@/src/lib/accounts/accountsRegistry";
import { clearSession } from "@/src/lib/auth/session";
import { IAccountSummary, MAX_LINKED_ACCOUNTS, removeAccount } from "@/src/redux/features/accountsSlice";
import { logoutUser } from "@/src/lib/features";

/**
 * Telegram-style account switcher — a list of every linked account with its
 * avatar/name/unread badge, "Add Account", and a 1-tap switch. The <150ms
 * "smooth cross-fade" the ticket asks for is `FadeIn.duration(120)` on each
 * row plus this screen's own modal presentation transition, rather than a
 * custom full-screen crossfade animation library — see
 * docs/architecture/multi-account.md for why a heavier transition wasn't
 * worth building for a screen that's on/off screen for under a second.
 */
const AccountsScreen = () => {
	const dispatch = useDispatch();
	const theme = useAppTheme();
	const accounts = useSelector((state: any) => state.accounts.accounts as IAccountSummary[]);
	const activeAccountId = useSelector((state: any) => state.accounts.activeAccountId as string);
	const [switchingId, setSwitchingId] = useState<string | null>(null);

	const atLimit = accounts.length >= MAX_LINKED_ACCOUNTS;

	const handleSwitch = async (accountId: string) => {
		if (accountId === activeAccountId || switchingId) return;
		setSwitchingId(accountId);
		try {
			await switchActiveAccount(accountId, dispatch);
			router.replace("/(tabs)/messages");
		} finally {
			setSwitchingId(null);
		}
	};

	const handleRemove = (account: IAccountSummary) => {
		Alert.alert("Remove account", `Remove ${account.name} from this device? Its local data stays on-device but this app stops showing it.`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Remove",
				style: "destructive",
				onPress: async () => {
					if (account.id === activeAccountId) {
						await logoutUser(dispatch);
						return;
					}
					await clearSession(account.id);
					dispatch(removeAccount(account.id));
					const registry = await getAccountsRegistry();
					await saveAccountsRegistry({
						accounts: registry.accounts.filter((a) => a.id !== account.id),
						activeAccountId: registry.activeAccountId,
					});
				},
			},
		]);
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={26} color="#000" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Accounts</Text>
				<View style={{ width: 26 }} />
			</View>

			{accounts.map((account) => (
				<Animated.View key={account.id} entering={FadeIn.duration(120)}>
					<TouchableOpacity
						style={styles.accountRow}
						onPress={() => handleSwitch(account.id)}
						onLongPress={() => handleRemove(account)}
					>
						<Avatar data={{ url: account.avatarUrl }} size={52} />
						<View style={styles.accountInfo}>
							<Text style={styles.accountName}>{account.name}</Text>
							<Text style={styles.accountIdentifier} numberOfLines={1}>
								{account.handle ? `@${account.handle}` : account.identifier}
							</Text>
						</View>
						{switchingId === account.id ? (
							<ActivityIndicator color={theme.accent} />
						) : account.id === activeAccountId ? (
							<Ionicons name="checkmark-circle" size={24} color={theme.accent} />
						) : account.unreadCount > 0 ? (
							<View style={[styles.unreadBadge, { backgroundColor: theme.accent }]}>
								<Text style={styles.unreadBadgeText}>{account.unreadCount}</Text>
							</View>
						) : null}
					</TouchableOpacity>
				</Animated.View>
			))}

			<TouchableOpacity
				style={[styles.addAccountRow, atLimit && styles.addAccountRowDisabled]}
				disabled={atLimit}
				onPress={() => router.push("/add-account")}
			>
				<View style={[styles.addIconCircle, { borderColor: theme.accent }]}>
					<Ionicons name="add" size={24} color={theme.accent} />
				</View>
				<Text style={[styles.addAccountText, { color: theme.accent }]}>
					{atLimit ? `Limit reached (${MAX_LINKED_ACCOUNTS} accounts)` : "Add Account"}
				</Text>
			</TouchableOpacity>

			<Text style={styles.hint}>Long-press an account to remove it from this device.</Text>
		</View>
	);
};

export default AccountsScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		paddingHorizontal: 20,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 60,
		paddingBottom: 20,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "700",
	},
	accountRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#F0F0F0",
	},
	accountInfo: {
		flex: 1,
	},
	accountName: {
		fontSize: 16,
		fontWeight: "700",
		color: "#000E08",
	},
	accountIdentifier: {
		fontSize: 13,
		color: "#797C7B",
		marginTop: 2,
	},
	unreadBadge: {
		minWidth: 24,
		height: 24,
		borderRadius: 12,
		paddingHorizontal: 6,
		justifyContent: "center",
		alignItems: "center",
	},
	unreadBadgeText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "700",
	},
	addAccountRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		paddingVertical: 16,
	},
	addAccountRowDisabled: {
		opacity: 0.5,
	},
	addIconCircle: {
		width: 52,
		height: 52,
		borderRadius: 26,
		borderWidth: 1.5,
		borderStyle: "dashed",
		justifyContent: "center",
		alignItems: "center",
	},
	addAccountText: {
		fontSize: 16,
		fontWeight: "600",
	},
	hint: {
		fontSize: 12,
		color: "#797C7B",
		marginTop: 8,
	},
});
