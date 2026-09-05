import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface ICountryCode {
	code: string;
	flag: string;
	name: string;
}

export const COUNTRY_CODES: ICountryCode[] = [
	{ code: "+91", flag: "🇮🇳", name: "India" },
	{ code: "+1", flag: "🇺🇸", name: "United States" },
	{ code: "+44", flag: "🇬🇧", name: "United Kingdom" },
	{ code: "+61", flag: "🇦🇺", name: "Australia" },
	{ code: "+971", flag: "🇦🇪", name: "UAE" },
	{ code: "+65", flag: "🇸🇬", name: "Singapore" },
];

const CountryCodePicker = ({
	value,
	onChange,
}: {
	value: ICountryCode;
	onChange: (country: ICountryCode) => void;
}) => {
	const [visible, setVisible] = useState(false);

	return (
		<>
			<TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
				<Text style={styles.flag}>{value.flag}</Text>
				<Text style={styles.code}>{value.code}</Text>
				<Ionicons name="chevron-down" size={14} color="#797C7B" />
			</TouchableOpacity>

			<Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
				<Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
					<View style={styles.sheet}>
						<FlatList
							data={COUNTRY_CODES}
							keyExtractor={(item) => item.code}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={styles.row}
									onPress={() => {
										onChange(item);
										setVisible(false);
									}}
								>
									<Text style={styles.flag}>{item.flag}</Text>
									<Text style={styles.rowName}>{item.name}</Text>
									<Text style={styles.code}>{item.code}</Text>
								</TouchableOpacity>
							)}
						/>
					</View>
				</Pressable>
			</Modal>
		</>
	);
};

export default CountryCodePicker;

const styles = StyleSheet.create({
	trigger: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingRight: 10,
		borderRightWidth: 1,
		borderRightColor: "#CDD1D0",
		marginRight: 10,
		height: 60,
	},
	flag: {
		fontSize: 18,
	},
	code: {
		fontSize: 16,
		color: "#222",
	},
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "flex-end",
	},
	sheet: {
		backgroundColor: "#fff",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: 320,
		paddingVertical: 8,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 20,
		paddingVertical: 12,
	},
	rowName: {
		flex: 1,
		fontSize: 15,
		color: "#222",
	},
});
