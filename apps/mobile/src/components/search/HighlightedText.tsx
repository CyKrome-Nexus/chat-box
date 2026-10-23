import { Text, TextStyle } from "react-native";

/** Splits `text` around case-insensitive occurrences of `query` and bolds/colors the matches. */
const HighlightedText = ({
	text,
	query,
	style,
	highlightStyle,
	numberOfLines,
}: {
	text: string;
	query: string;
	style?: TextStyle;
	highlightStyle?: TextStyle;
	numberOfLines?: number;
}) => {
	if (!query.trim()) {
		return (
			<Text style={style} numberOfLines={numberOfLines}>
				{text}
			</Text>
		);
	}

	const lowerText = text.toLowerCase();
	const lowerQuery = query.trim().toLowerCase();
	const segments: { value: string; matched: boolean }[] = [];
	let cursor = 0;

	while (cursor < text.length) {
		const index = lowerText.indexOf(lowerQuery, cursor);
		if (index === -1) {
			segments.push({ value: text.slice(cursor), matched: false });
			break;
		}
		if (index > cursor) segments.push({ value: text.slice(cursor, index), matched: false });
		segments.push({ value: text.slice(index, index + lowerQuery.length), matched: true });
		cursor = index + lowerQuery.length;
	}

	return (
		<Text style={style} numberOfLines={numberOfLines}>
			{segments.map((segment, index) => (
				<Text key={index} style={segment.matched ? highlightStyle : undefined}>
					{segment.value}
				</Text>
			))}
		</Text>
	);
};

export default HighlightedText;
