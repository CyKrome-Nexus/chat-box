import { StyleSheet, Text, View } from "react-native";

export const getDateLabel = (timestamp: number) => {
	const date = new Date(timestamp);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);

	const isSameDay = (a: Date, b: Date) =>
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();

	if (isSameDay(date, today)) return "Today";
	if (isSameDay(date, yesterday)) return "Yesterday";

	return date.toLocaleDateString(undefined, {
		day: "numeric",
		month: "long",
		year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
	});
};

const DateSeparator = ({ label }: { label: string }) => (
	<View style={styles.container}>
		<View style={styles.pill}>
			<Text style={styles.text}>{label}</Text>
		</View>
	</View>
);

export default DateSeparator;

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		marginVertical: 12,
	},
	pill: {
		backgroundColor: "#E7ECEB",
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 4,
	},
	text: {
		fontSize: 12,
		color: "#5B6260",
		fontWeight: "600",
	},
});
