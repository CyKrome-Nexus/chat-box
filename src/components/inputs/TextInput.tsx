import { StyleSheet, Text, View, TextInput as NativeTextInput, TouchableOpacity, KeyboardTypeOptions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";

import Colors from "@/src/constants/Colors";
import { useState } from "react";


type TTextInput = {
	value: any;
	onChange: (e: any) => any;
	isPassword?: boolean;
	placeholder?: string;
	label?: string;
	labelColor?: string;
	maxLength?: number
	error?: string
	keyboardType?: KeyboardTypeOptions
	leftAccessory?: ReactNode
}

const TextInput = ({
	value,
	onChange,
	isPassword = false,
	placeholder = '',
	label,
	labelColor = Colors.focused,
	maxLength,
	error,
	keyboardType,
	leftAccessory,
}: TTextInput) => {

	const [showPassword, setShowPassword] = useState({ status: false, text: 'Show Password' });

	const toggleShowPassword = () => {
		setShowPassword(prev => ({
			status: !prev.status,
			text: !prev.status ? 'Hide Password' : 'Show Password',
		}));
	}

	return (
		<>
			<View style={ styles.container }>
				{
					label && (
						<Text style={{ color: labelColor }}>
							{label}
						</Text>
					)
				}
				<View style={[styles.main, styles.inputContainter, error && styles.inputContainerError]}>
					{leftAccessory}
					<NativeTextInput
						style={styles.inputBox}
						value={value}
						onChangeText={onChange}
						placeholder={placeholder}
						secureTextEntry={isPassword && !showPassword.status}
						autoCapitalize={'none'}
						keyboardType={keyboardType}
						maxLength={maxLength ?? (isPassword ? 20 : 254)}
					/>
					{
						isPassword && <TouchableOpacity
							style={styles.toggleButton}
							onPress={toggleShowPassword}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							accessibilityRole="button"
							accessibilityLabel={showPassword.text}
						>
							<Ionicons
								name={showPassword.status ? 'eye-off-outline' : 'eye-outline'}
								size={22}
								color={Colors.default}
							/>
						</TouchableOpacity>
					}
				</View>
				{!!error && <Text style={styles.errorText}>{error}</Text>}
			</View>
		</>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
		minHeight: 80,
		// backgroundColor: 'gray'
	},
	main: {
		flex: 1,
		width: '100%',
		// backgroundColor: 'red',
	},
	inputContainter: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomColor: '#CDD1D0',
		borderBottomWidth: 1,
	},
	inputContainerError: {
		borderBottomColor: '#F04A4C',
	},
	inputBox: {
		flex: 1,
		height: 60,
		fontSize: 24,
	},
	toggleButton: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorText: {
		color: '#F04A4C',
		fontSize: 12,
		marginTop: 4,
	},
});

export default TextInput;
