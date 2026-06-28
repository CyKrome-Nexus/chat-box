import { StyleSheet, Text, View, TextInput as NativeTextInput, TouchableOpacity } from "react-native";

import Colors from "@/src/constants/Colors";
import { facebook } from "@/src/constants/svgs/logos";
import BIcon from "../buttons/BIcon";
import { useEffect, useState } from "react";


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
		setShowPassword(prev => showPassword.status ? {
			status: false,
			text: 'Show Password'
		} : {
			status: true,
			text: 'Hide Password'
		}) 
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
						maxLength={maxLength ?? isPassword ? 20 : 254}
					/>
					{
						// isPassword && (<BIcon
						// 	borderColor="#FFFFFF00"
						// />)

						isPassword && <TouchableOpacity 
							style={{ justifyContent: 'center' }}
							onPress={toggleShowPassword}
						>
							<Text style={{}}>{showPassword.text}</Text>
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
});

export default TextInput;
