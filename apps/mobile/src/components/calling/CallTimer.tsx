import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";

const formatDuration = (seconds: number) => {
	const total = Math.max(0, Math.floor(seconds));
	const mins = Math.floor(total / 60).toString().padStart(2, "0");
	const secs = (total % 60).toString().padStart(2, "0");
	return `${mins}:${secs}`;
};

const CallTimer = ({ connectedAt }: { connectedAt: number }) => {
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setElapsed((Date.now() - connectedAt) / 1000);
		}, 1000);
		return () => clearInterval(interval);
	}, [connectedAt]);

	return <Text style={styles.text}>{formatDuration(elapsed)}</Text>;
};

export default CallTimer;

const styles = StyleSheet.create({
	text: {
		color: "#fff",
		fontSize: 16,
		opacity: 0.85,
	},
});
