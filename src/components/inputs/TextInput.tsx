import { StyleSheet, Text, View, TextInput as NativeTextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
}

const TextInput = ({
	value,
	onChange,
	isPassword = false,
	placeholder = '',
	label,
	labelColor = Colors.focused,
	maxLength,
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
				<View style={[styles.main, styles.inputContainter]}>
					<NativeTextInput
						style={styles.inputBox}
						value={value}
						onChangeText={onChange}
						placeholder={placeholder}
						secureTextEntry={isPassword && !showPassword.status}
						autoCapitalize={'none'}
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
		borderBottomColor: '#CDD1D0',
		borderBottomWidth: 1,
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
});

export default TextInput;
