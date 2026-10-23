import { useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch } from "react-redux";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { loginSchema, passwordSchema, phoneSchema, emailSchema } from "@chatbox/shared";

import { AuthHeader } from "@/src/components/auth/AuthHeader";
import { SocialButtons } from "@/src/components/auth/SocialButtons";
import { AppText, Divider, PrimaryButton, ScalePressable, UnderlineField, spacing } from "@/src/components/ui";
import CountryCodePicker, { COUNTRY_CODES, type ICountryCode } from "@/src/components/inputs/CountryCodePicker";
import { login, signUp } from "@/src/lib/auth/authService";
import { updateUser } from "@/src/redux/features/userSlice";

type TMode = "login" | "signup";

const fieldError = (value: string, check: () => string | null) => (value ? (check() ?? undefined) : undefined);

const Authentication = () => {
	const dispatch = useDispatch();
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ authType?: string }>();
	const mode: TMode = params.authType === "signup" ? "signup" : "login";

	const [identifier, setIdentifier] = useState("");
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [country, setCountry] = useState<ICountryCode>(COUNTRY_CODES[0]);
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [failure, setFailure] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const passwordRef = useRef<TextInput>(null);

	const fullPhone = `${country.code}${phone.replace(/\D/g, "").replace(/^0+/, "")}`;

	const errors = useMemo(
		() => ({
			identifier: fieldError(identifier, () => {
				const value = identifier.trim();
				const ok = value.includes("@") ? emailSchema.safeParse(value).success : phoneSchema.safeParse(value).success;
				return ok ? null : "Enter a valid email or phone (with country code)";
			}),
			name: fieldError(name, () => (name.trim().length >= 2 ? null : "Enter your full name")),
			phone: fieldError(phone, () => (phoneSchema.safeParse(fullPhone).success ? null : "Enter a valid phone number")),
			password:
				mode === "signup" ? fieldError(password, () => passwordSchema.safeParse(password).error?.issues[0]?.message ?? null) : undefined,
			confirm: fieldError(confirm, () => (confirm === password ? null : "Passwords don't match")),
		}),
		[identifier, name, phone, fullPhone, password, confirm, mode]
	);

	const valid =
		mode === "login"
			? loginSchema.safeParse({ identifier, password }).success && !errors.identifier
			: name.trim().length >= 2 && !errors.phone && phone.length > 0 && passwordSchema.safeParse(password).success && confirm === password;

	const submit = async () => {
		if (!valid || submitting) return;
		setFailure(null);
		setSubmitting(true);
		try {
			const user =
				mode === "login"
					? await login({ identifier: identifier.trim(), password })
					: await signUp({ name: name.trim(), identifier: fullPhone, password });
			dispatch(updateUser(user));
		} catch (error) {
			setFailure(error instanceof Error ? error.message : "Something went wrong. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<ScrollView
				contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<AuthHeader
					highlight={mode === "login" ? "Log in" : "Sign up"}
					rest={mode === "login" ? "to Chatbox" : "with Phone"}
					subtitle={
						mode === "login"
							? "Welcome back! Sign in using your social account or email to continue us"
							: "Get chatting with friends and family today by signing up for our chat app!"
					}
				/>

				{mode === "login" ? (
					<Animated.View entering={FadeIn.delay(80)} style={styles.social}>
						<SocialButtons tone="dark" />
						<Divider label="OR" />
					</Animated.View>
				) : null}

				<Animated.View key={mode} entering={FadeInDown.springify().damping(20)} style={styles.form}>
					{mode === "login" ? (
						<>
							<UnderlineField
								label="Your email"
								value={identifier}
								onChangeText={setIdentifier}
								error={errors.identifier}
								autoCapitalize="none"
								autoComplete="username"
								keyboardType="email-address"
								returnKeyType="next"
								onSubmitEditing={() => passwordRef.current?.focus()}
							/>
							<UnderlineField
								ref={passwordRef}
								label="Password"
								value={password}
								onChangeText={setPassword}
								secure
								autoComplete="current-password"
								returnKeyType="go"
								onSubmitEditing={() => void submit()}
							/>
						</>
					) : (
						<>
							<UnderlineField label="Your name" value={name} onChangeText={setName} error={errors.name} autoComplete="name" />
							<View>
								<View style={styles.phoneRow}>
									<View style={styles.countryPicker}>
										<CountryCodePicker value={country} onChange={setCountry} />
									</View>
									<View style={styles.flex}>
										<UnderlineField label="Your Number" value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" />
									</View>
								</View>
							</View>
							<UnderlineField label="Password" value={password} onChangeText={setPassword} error={errors.password} secure autoComplete="new-password" />
							<UnderlineField label="Confirm Password" value={confirm} onChangeText={setConfirm} error={errors.confirm} secure autoComplete="new-password" />
						</>
					)}
					{failure ? (
						<Animated.View entering={FadeIn} style={styles.failure}>
							<AppText variant="label" weight="regular" tone="danger">
								{failure}
							</AppText>
						</Animated.View>
					) : null}
				</Animated.View>

				<View style={styles.footer}>
					<PrimaryButton title={mode === "login" ? "Log in" : "Create an account"} onPress={() => void submit()} disabled={!valid} loading={submitting} />
					{mode === "login" ? (
						<ScalePressable accessibilityLabel="Forgot password" onPress={() => router.push("/forgot-password")} style={styles.link}>
							<AppText variant="label" tone="brand">
								Forgot password?
							</AppText>
						</ScalePressable>
					) : (
						<ScalePressable accessibilityLabel="Log in instead" onPress={() => router.setParams({ authType: "login" })} style={styles.link}>
							<AppText variant="label" weight="regular" tone="muted">
								Existing account? <AppText variant="label" tone="brand">Log in</AppText>
							</AppText>
						</ScalePressable>
					)}
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	flex: { flex: 1 },
	content: { flexGrow: 1, paddingHorizontal: spacing.gutter, backgroundColor: "#FFFFFF" },
	social: { marginTop: 30, gap: 30 },
	form: { marginTop: 30, gap: 30 },
	phoneRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
	countryPicker: { paddingBottom: 10 },
	failure: { padding: 12, borderRadius: 12, backgroundColor: "#FDECEC" },
	footer: { marginTop: "auto", paddingTop: 40, gap: 16 },
	link: { alignSelf: "center", paddingVertical: 4 },
});

export default Authentication;
