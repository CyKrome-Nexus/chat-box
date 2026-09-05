import { useEffect, useState } from "react";
import {
	FlatList,
	Image,
	Linking,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/src/constants/Colors";
import {
	useConversationMedia,
	IMediaGalleryItem,
	IDocGalleryItem,
	IAudioGalleryItem,
	ILinkGalleryItem,
} from "@/src/hooks/useConversationMedia";
import { fetchLinkPreview, ILinkPreview } from "@/src/lib/media/linkPreview";
import { getDocumentIcon } from "@/src/lib/media/documentIcon";
import { formatDuration } from "@/src/lib/audio/format";

type TTab = "media" | "docs" | "links" | "audio";
const TABS: { key: TTab; label: string }[] = [
	{ key: "media", label: "Media" },
	{ key: "docs", label: "Docs" },
	{ key: "links", label: "Links" },
	{ key: "audio", label: "Audio" },
];

const formatFileSize = (bytes?: number) => {
	if (!bytes) return "";
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString();

const LinkRow = ({ item }: { item: ILinkGalleryItem }) => {
	const [preview, setPreview] = useState<ILinkPreview | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetchLinkPreview(item.url).then((result) => {
			if (!cancelled) setPreview(result);
		});
		return () => {
			cancelled = true;
		};
	}, [item.url]);

	return (
		<TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(item.url)}>
			{preview?.image ? (
				<Image source={{ uri: preview.image }} style={styles.linkImage} />
			) : (
				<View style={[styles.linkImage, styles.linkImagePlaceholder]}>
					<Ionicons name="link" size={20} color="#797C7B" />
				</View>
			)}
			<View style={styles.linkMeta}>
				<Text style={styles.linkTitle} numberOfLines={1}>
					{preview?.title || item.url}
				</Text>
				{!!preview?.description && (
					<Text style={styles.linkDescription} numberOfLines={2}>
						{preview.description}
					</Text>
				)}
				<Text style={styles.linkUrl} numberOfLines={1}>
					{item.url}
				</Text>
			</View>
		</TouchableOpacity>
	);
};

const SharedMediaScreen = () => {
	const params = useLocalSearchParams<{ conversationId: string; name?: string }>();
	const { media, docs, audio, links } = useConversationMedia(params.conversationId);
	const [tab, setTab] = useState<TTab>("media");

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={24} color="#000E08" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>{params.name ? `${params.name}'s Media` : "Shared Media"}</Text>
				<View style={{ width: 24 }} />
			</View>

			<View style={styles.tabRow}>
				{TABS.map((t) => (
					<TouchableOpacity key={t.key} style={styles.tabButton} onPress={() => setTab(t.key)}>
						<Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
						{tab === t.key && <View style={styles.tabIndicator} />}
					</TouchableOpacity>
				))}
			</View>

			{tab === "media" && (
				<FlatList
					data={media}
					keyExtractor={(item) => item.messageId}
					numColumns={3}
					contentContainerStyle={styles.gridContent}
					ListEmptyComponent={<EmptyState label="No photos or videos yet" />}
					renderItem={({ item }: { item: IMediaGalleryItem }) => (
						<View style={styles.gridCell}>
							<Image source={{ uri: item.uri }} style={styles.gridImage} />
							{item.type === "video" && (
								<Ionicons name="play-circle" size={22} color="#fff" style={styles.gridPlayIcon} />
							)}
							{item.viewOnce && (
								<Ionicons name="flame" size={16} color="#fff" style={styles.gridViewOnceIcon} />
							)}
						</View>
					)}
				/>
			)}

			{tab === "docs" && (
				<FlatList
					data={docs}
					keyExtractor={(item) => item.messageId}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={<EmptyState label="No documents shared yet" />}
					renderItem={({ item }: { item: IDocGalleryItem }) => {
						const icon = getDocumentIcon(item.name, item.mimeType);
						return (
							<TouchableOpacity
								style={styles.docRow}
								onPress={() =>
									item.uri &&
									router.push({
										pathname: "/document-preview",
										params: { uri: item.uri, name: item.name || "Document", mimeType: item.mimeType || "" },
									})
								}
							>
								<Ionicons name={icon.name} size={28} color={icon.color} />
								<View style={styles.docMeta}>
									<Text style={styles.docName} numberOfLines={1}>
										{item.name || "Document"}
									</Text>
									<Text style={styles.docSub}>
										{formatDate(item.timestamp)} · {formatFileSize(item.size)}
									</Text>
								</View>
							</TouchableOpacity>
						);
					}}
				/>
			)}

			{tab === "links" && (
				<FlatList
					data={links}
					keyExtractor={(item) => `${item.messageId}-${item.url}`}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={<EmptyState label="No links shared yet" />}
					renderItem={({ item }) => <LinkRow item={item} />}
				/>
			)}

			{tab === "audio" && (
				<FlatList
					data={audio}
					keyExtractor={(item) => item.messageId}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={<EmptyState label="No voice notes shared yet" />}
					renderItem={({ item }: { item: IAudioGalleryItem }) => (
						<View style={styles.docRow}>
							<Ionicons name="mic" size={24} color={Colors.focused} />
							<View style={styles.docMeta}>
								<Text style={styles.docName}>{formatDate(item.timestamp)}</Text>
								<Text style={styles.docSub}>{formatDuration(item.duration || 0)}</Text>
							</View>
						</View>
					)}
				/>
			)}
		</View>
	);
};

const EmptyState = ({ label }: { label: string }) => (
	<View style={styles.emptyState}>
		<Text style={styles.emptyStateText}>{label}</Text>
	</View>
);

export default SharedMediaScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 56,
		paddingHorizontal: 16,
		paddingBottom: 12,
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#000E08",
	},
	tabRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	tabButton: {
		flex: 1,
		alignItems: "center",
		paddingVertical: 12,
	},
	tabLabel: {
		fontSize: 13,
		color: "#797C7B",
	},
	tabLabelActive: {
		color: Colors.focused,
		fontWeight: "700",
	},
	tabIndicator: {
		marginTop: 8,
		height: 2,
		width: "60%",
		backgroundColor: Colors.focused,
		borderRadius: 1,
	},
	gridContent: {
		padding: 2,
	},
	gridCell: {
		width: "33.33%",
		aspectRatio: 1,
		padding: 2,
	},
	gridImage: {
		width: "100%",
		height: "100%",
		borderRadius: 4,
		backgroundColor: "#eee",
	},
	gridPlayIcon: {
		position: "absolute",
		top: "40%",
		left: "40%",
	},
	gridViewOnceIcon: {
		position: "absolute",
		bottom: 6,
		right: 6,
	},
	listContent: {
		padding: 16,
	},
	docRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#f2f2f2",
	},
	docMeta: {
		flex: 1,
	},
	docName: {
		fontSize: 14,
		fontWeight: "600",
		color: "#000E08",
	},
	docSub: {
		fontSize: 12,
		color: "#797C7B",
		marginTop: 2,
	},
	linkRow: {
		flexDirection: "row",
		gap: 12,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#f2f2f2",
	},
	linkImage: {
		width: 56,
		height: 56,
		borderRadius: 8,
	},
	linkImagePlaceholder: {
		backgroundColor: "#F2F8F7",
		justifyContent: "center",
		alignItems: "center",
	},
	linkMeta: {
		flex: 1,
		justifyContent: "center",
	},
	linkTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#000E08",
	},
	linkDescription: {
		fontSize: 12,
		color: "#555",
		marginTop: 2,
	},
	linkUrl: {
		fontSize: 11,
		color: "#797C7B",
		marginTop: 2,
	},
	emptyState: {
		paddingTop: 60,
		alignItems: "center",
	},
	emptyStateText: {
		color: "#797C7B",
		fontSize: 13,
	},
});
