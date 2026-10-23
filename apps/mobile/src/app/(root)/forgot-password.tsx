import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { forgotPasswordSchema, passwordSchema } from "@chatbox/shared";

import { AuthHeader } from "@/src/components/auth/AuthHeader";
import { AppText, PrimaryButton, UnderlineField, spacing } from "@/src/components/ui";
import { requestPasswordReset, resetPassword } from "@/src/lib/auth/authService";

type TStep = "request" | "verify";

const ForgotPassword = () => {
	const insets = useSafeAreaInsets();
	const [step, setStep] = useState<TStep>("request");
	const [identifier, setIdentifier] = useState("");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [failure, setFailure] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const run = async (task: () => Promise<void>) => {
		setFailure(null);
		setSubmitting(true);
		try {
			await task();
		} catch (error) {
			setFailure(error instanceof Error ? error.message : "Something went wrong. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	const passwordError = password ? passwordSchema.safeParse(password).error?.issues[0]?.message : undefined;
	const canRequest = forgotPasswordSchema.safeParse({ identifier }).success;
	const canReset = /^\d{6}$/.test(code) && !passwordError && password.length > 0 && confirm === password;

	const request = () =>
		run(async () => {
			await requestPasswordReset(identifier);
			setStep("verify");
		});

	const reset = () =>
		run(async () => {
			await resetPassword({ identifier, otp: code, newPassword: password });
			Alert.alert("Password updated", "You can now log in with your new password.", [
				{ text: "OK", onPress: () => router.replace({ pathname: "/auth", params: { authType: "login" } }) },
			]);
		});

	return (
		<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
				<AuthHeader
					highlight="Reset"
					rest="your password"
					subtitle={
						step === "request"
							? "Enter the email linked to your account and we'll send you a 6-digit code."
							: "Enter the code we sent and choose a new password."
					}
				/>
				<Animated.View key={step} entering={FadeInDown.springify().damping(20)} style={styles.form}>
					{step === "request" ? (
						<UnderlineField label="Your email" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" keyboardType="email-address" />
					) : (
						<>
							<UnderlineField label="Verification code" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" />
							<UnderlineField label="New password" value={password} onChangeText={setPassword} error={passwordError} secure autoComplete="new-password" />
							<UnderlineField label="Confirm password" value={confirm} onChangeText={setConfirm} error={confirm && confirm !== password ? "Passwords don't match" : undefined} secure />
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
					{step === "request" ? (
						<PrimaryButton title="Send code" onPress={() => void request()} disabled={!canRequest} loading={submitting} />
					) : (
						<PrimaryButton title="Reset password" onPress={() => void reset()} disabled={!canReset} loading={submitting} />
					)}
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	flex: { flex: 1 },
	content: { flexGrow: 1, paddingHorizontal: spacing.gutter, backgroundColor: "#FFFFFF" },
	form: { marginTop: 40, gap: 30 },
	failure: { padding: 12, borderRadius: 12, backgroundColor: "#FDECEC" },
	footer: { marginTop: "auto", paddingTop: 40 },
});

export default ForgotPassword;
