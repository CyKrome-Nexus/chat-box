import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

import TextInput from "@/src/components/inputs/TextInput";
import CountryCodePicker, { COUNTRY_CODES, ICountryCode } from "@/src/components/inputs/CountryCodePicker";
import Colors from "@/src/constants/Colors";
import { AuthError, login, signUp } from "@/src/lib/auth/authService";
import { isEmailOrPhone, isPhone, isStrongPassword, passwordsMatch } from "@/src/lib/auth/validators";
import { saveSession } from "@/src/lib/auth/session";
import { generateAccountId, getAccountsRegistry, saveAccountsRegistry } from "@/src/lib/accounts/accountsRegistry";
import { switchActiveAccount } from "@/src/lib/accounts/accountSwitcher";
import { MAX_LINKED_ACCOUNTS } from "@/src/redux/features/accountsSlice";

type TMode = "login" | "signup";

/**
 * A deliberately separate, minimal screen from `(root)/auth.tsx` — that
 * screen's parent layout redirects away the instant `state.user` is truthy
 * (see `(root)/_layout.tsx`), which is exactly right for "log in when
 * signed out" but would make it impossible to reach while already signed
 * into another account. This screen never touches that redirect: it logs
 * into/creates a *second* local account (via the same `authService.ts`
 * simulation every other auth screen uses) and links it alongside whichever
 * account is already active, without replacing it. See
 * docs/architecture/multi-account.md.
 */
const AddAccountScreen = () => {
	const dispatch = useDispatch();
	const linkedCount = useSelector((state: any) => state.accounts.accounts.length as number);
	const [mode, setMode] = useState<TMode>("login");

	const [identifier, setIdentifier] = useState("");
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [countryCode, setCountryCode] = useState<ICountryCode>(COUNTRY_CODES[0]);
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [submitError, setSubmitError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const atLimit = linkedCount >= MAX_LINKED_ACCOUNTS;

	const isFormValid = useMemo(() => {
		if (mode === "login") return isEmailOrPhone(identifier) && password.length > 0;
		return name.trim().length >= 2 && isPhone(phone) && isStrongPassword(password) && passwordsMatch(password, confirmPassword);
	}, [mode, identifier, password, name, phone, confirmPassword]);

	const linkAccount = async (stored: { name: string; identifier: string; avatarUrl?: string; about?: string }) => {
		const registry = await getAccountsRegistry();
		if (registry.accounts.some((a) => a.identifier === stored.identifier)) {
			throw new Error("This account is already linked on this device.");
		}

		const accountId = generateAccountId();
		await saveSession(
			{ name: stored.name, username: stored.identifier, avatar: stored.avatarUrl ? { url: stored.avatarUrl } : undefined, about: stored.about },
			accountId
		);

		const nextAccounts = registry.accounts.concat([
			{ id: accountId, name: stored.name, avatarUrl: stored.avatarUrl, identifier: stored.identifier, unreadCount: 0 },
		]);
		await saveAccountsRegistry({ accounts: nextAccounts, activeAccountId: accountId });
		await switchActiveAccount(accountId, dispatch);
	};

	const onPressSubmit = async () => {
		setSubmitError("");
		if (!isFormValid || isSubmitting || atLimit) return;

		setIsSubmitting(true);
		try {
			if (mode === "login") {
				const stored = await login({ identifier, password });
				await linkAccount({ name: stored.name, identifier: stored.identifier, avatarUrl: stored.avatarUrl, about: stored.about });
			} else {
				const fullPhone = `${countryCode.code}${phone.trim()}`;
				const stored = await signUp({ name: name.trim(), identifier: fullPhone, password });
				await linkAccount({ name: stored.name, identifier: stored.identifier });
			}
			router.replace("/(tabs)/messages");
		} catch (e) {
			setSubmitError(e instanceof AuthError || e instanceof Error ? e.message : "Something went wrong. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
			<View style={styles.container}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={26} color="#000" />
				</TouchableOpacity>

				<ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
					<Text style={styles.title}>Add Account</Text>
					<Text style={styles.subtitle}>
						{atLimit
							? `You've reached the limit of ${MAX_LINKED_ACCOUNTS} linked accounts on this device.`
							: "Log in or create a second Chatbox account — you can switch between them anytime."}
					</Text>

					{!atLimit && (
						<>
							<View style={styles.modeRow}>
								<TouchableOpacity style={[styles.modeTab, mode === "login" && styles.modeTabActive]} onPress={() => setMode("login")}>
									<Text style={[styles.modeTabText, mode === "login" && styles.modeTabTextActive]}>Log In</Text>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.modeTab, mode === "signup" && styles.modeTabActive]} onPress={() => setMode("signup")}>
									<Text style={[styles.modeTabText, mode === "signup" && styles.modeTabTextActive]}>Sign Up</Text>
								</TouchableOpacity>
							</View>

							{mode === "login" ? (
								<View style={styles.inputsWrapper}>
									<TextInput value={identifier} onChange={setIdentifier} label="Email or phone number" labelColor={Colors.focused} />
									<TextInput value={password} onChange={setPassword} label="Password" isPassword labelColor={Colors.focused} />
								</View>
							) : (
								<View style={styles.inputsWrapper}>
									<TextInput value={name} onChange={setName} label="Full Name" labelColor={Colors.focused} />
									<TextInput
										value={phone}
										onChange={setPhone}
										label="Your Phone"
										labelColor={Colors.focused}
										keyboardType="phone-pad"
										leftAccessory={<CountryCodePicker value={countryCode} onChange={setCountryCode} />}
									/>
									<TextInput value={password} onChange={setPassword} label="Password" isPassword labelColor={Colors.focused} />
									<TextInput value={confirmPassword} onChange={setConfirmPassword} label="Confirm Password" isPassword labelColor={Colors.focused} />
								</View>
							)}

							{!!submitError && <Text style={styles.submitError}>{submitError}</Text>}

							<TouchableOpacity
								style={[styles.submitButton, isFormValid && styles.submitButtonActive]}
								disabled={!isFormValid || isSubmitting}
								onPress={onPressSubmit}
							>
								{isSubmitting ? (
									<ActivityIndicator color={isFormValid ? "#fff" : "gray"} />
								) : (
									<Text style={[styles.submitText, isFormValid && styles.submitTextActive]}>
										{mode === "login" ? "Log In & Link" : "Sign Up & Link"}
									</Text>
								)}
							</TouchableOpacity>
						</>
					)}
				</ScrollView>
			</View>
		</KeyboardAvoidingView>
	);
};

export default AddAccountScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	backButton: {
		paddingTop: 56,
		paddingHorizontal: 20,
		paddingBottom: 8,
	},
	scrollContent: {
		paddingHorizontal: 24,
		paddingBottom: 40,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		color: "#000E08",
		marginTop: 8,
	},
	subtitle: {
		fontSize: 14,
		color: "#797C7B",
		marginTop: 8,
		marginBottom: 20,
		lineHeight: 20,
	},
	modeRow: {
		flexDirection: "row",
		gap: 10,
		marginBottom: 20,
	},
	modeTab: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#CDD1D0",
		alignItems: "center",
	},
	modeTabActive: {
		backgroundColor: Colors.focused,
		borderColor: Colors.focused,
	},
	modeTabText: {
		fontWeight: "600",
		color: "#333",
	},
	modeTabTextActive: {
		color: "#fff",
	},
	inputsWrapper: {
		gap: 14,
	},
	submitError: {
		color: "#D63A4C",
		fontSize: 13,
		marginTop: 12,
	},
	submitButton: {
		marginTop: 24,
		borderRadius: 16,
		paddingVertical: 14,
		alignItems: "center",
		backgroundColor: "#E4E9E8",
	},
	submitButtonActive: {
		backgroundColor: Colors.focused,
	},
	submitText: {
		fontWeight: "700",
		fontSize: 16,
		color: "gray",
	},
	submitTextActive: {
		color: "#fff",
	},
});
