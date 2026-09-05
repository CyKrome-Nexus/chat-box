import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { router } from "expo-router";

import TextInput from "@/src/components/inputs/TextInput";
import Colors from "@/src/constants/Colors";
import { AuthError, requestPasswordReset, resetPassword } from "@/src/lib/auth/authService";
import { isEmailOrPhone, isStrongPassword, passwordsMatch } from "@/src/lib/auth/validators";

type TStep = "request" | "verify";

const ForgotPassword = () => {
	const [step, setStep] = useState<TStep>("request");
	const [identifier, setIdentifier] = useState("");
	const [otp, setOtp] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleRequestReset = async () => {
		setError("");
		if (!isEmailOrPhone(identifier)) {
			setError("Enter a valid email or phone number");
			return;
		}

		setIsSubmitting(true);
		try {
			const { otp: sentOtp } = await requestPasswordReset(identifier);
			// There is no SMS/email backend in this repo to deliver the OTP —
			// surfacing it here keeps the flow demonstrable end-to-end.
			Alert.alert("Verification code sent", `Your code is ${sentOtp} (demo mode — no SMS/email backend yet).`);
			setStep("verify");
		} catch (e) {
			setError(e instanceof AuthError ? e.message : "Something went wrong. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const isResetValid =
		otp.trim().length === 6 && isStrongPassword(newPassword) && passwordsMatch(newPassword, confirmPassword);

	const handleResetPassword = async () => {
		setError("");
		if (!isResetValid) return;

		setIsSubmitting(true);
		try {
			await resetPassword({ identifier, otp, newPassword });
			Alert.alert("Password updated", "You can now log in with your new password.", [
				{ text: "OK", onPress: () => router.replace({ pathname: "(root)/auth", params: { authType: "login" } }) },
			]);
		} catch (e) {
			setError(e instanceof AuthError ? e.message : "Something went wrong. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
			<View style={styles.container}>
				<Text style={styles.title}>Reset your password</Text>
				<Text style={styles.subtitle}>
					{step === "request"
						? "Enter the email or phone number linked to your account."
						: "Enter the verification code and choose a new password."}
				</Text>

				{step === "request" ? (
					<TextInput
						value={identifier}
						onChange={setIdentifier}
						label="Email or phone number"
						labelColor={Colors.focused}
					/>
				) : (
					<>
						<TextInput value={otp} onChange={setOtp} label="Verification code" labelColor={Colors.focused} />
						<TextInput
							value={newPassword}
							onChange={setNewPassword}
							label="New password"
							isPassword
							labelColor={Colors.focused}
						/>
						<TextInput
							value={confirmPassword}
							onChange={setConfirmPassword}
							label="Confirm new password"
							isPassword
							labelColor={Colors.focused}
						/>
					</>
				)}

				{!!error && <Text style={styles.errorText}>{error}</Text>}

				<TouchableOpacity
					style={[
						styles.button,
						(step === "request" ? isEmailOrPhone(identifier) : isResetValid) && styles.buttonActive,
					]}
					disabled={isSubmitting || (step === "request" ? !isEmailOrPhone(identifier) : !isResetValid)}
					onPress={step === "request" ? handleRequestReset : handleResetPassword}
				>
					{isSubmitting ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text
							style={[
								styles.buttonText,
								!(step === "request" ? isEmailOrPhone(identifier) : isResetValid) &&
									styles.buttonTextInactive,
							]}
						>
							{step === "request" ? "Send code" : "Reset password"}
						</Text>
					)}
				</TouchableOpacity>
			</View>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 24,
		gap: 14,
		justifyContent: "center",
	},
	title: {
		fontFamily: "Inter 18pt Bold",
		fontWeight: "bold",
		fontSize: 24,
		color: "black",
		marginBottom: 8,
	},
	subtitle: {
		color: "#797C7B",
		lineHeight: 20,
		marginBottom: 16,
	},
	errorText: {
		color: "#F04A4C",
		fontSize: 13,
	},
	button: {
		backgroundColor: "#e8e8e8ff",
		padding: 15,
		borderRadius: 20,
		marginTop: 10,
	},
	buttonActive: {
		backgroundColor: Colors.focused,
	},
	buttonText: {
		fontSize: 18,
		fontFamily: "Inter 18pt Bold",
		fontWeight: "bold",
		color: "#fff",
		textAlign: "center",
	},
	buttonTextInactive: {
		color: "gray",
	},
});

export default ForgotPassword;
