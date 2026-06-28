import React, { useState } from "react";
import { StyleSheet, View, Image } from "react-native";
import { avatarContact } from "@/src/constants/svgs/icons";
import BIcon from "../buttons/BIcon";

type AvatarProps = {
    data?: { url?: string | undefined } | { urls?: string[] };
    isWhite?: boolean;
    showStatus?: boolean;
    statusColor?: string;
    size?: number; // New optional size prop
};

const Avatar = ({
    data,
    isWhite,
    showStatus = false,
    statusColor = "#4CAF50",
    size = 50, // Default size
}: AvatarProps) => {
    const [imageError, setImageError] = useState(false);

    const urls =
        "urls" in (data || {})
            ? (data as { urls?: string[] }).urls?.slice(0, 4) || []
            : data?.url
            ? [data.url]
            : [];

    const isGroup = urls.length > 1;
    const showFallback = urls.length === 0 || imageError;

    if (showFallback) {
        return (
            <View style={[styles.container, { width: size, height: size }]}>
                <BIcon
                    svg={isWhite ? avatarContact?.light : avatarContact}
                    width={size}
                    height={size}
                    iconWidth={size}
                    iconHeight={size}
                />
            </View>
        );
    }

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Single Avatar */}
            {!isGroup ? (
                <View style={[styles.imageContainer, { borderRadius: size / 2, width: size, height: size }]}>
                    <Image
                        source={{ uri: urls[0] }}
                        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
                        onError={() => setImageError(true)}
                    />
                </View>
            ) : (
                /* Group Avatar (2x2 grid) */
                <View style={[styles.groupContainer, { width: size, height: size, borderRadius: size / 2 }]}>
                    {urls.map((url, index) => (
                        <Image
                            key={index}
                            source={{ uri: url }}
                            style={[
                                styles.groupImage,
                                {
                                    width: size / 2,
                                    height: size / 2,
                                    top: index < 2 ? 0 : size / 2,
                                    left: index % 2 === 0 ? 0 : size / 2,
                                },
                            ]}
                            onError={() => setImageError(true)}
                        />
                    ))}
                </View>
            )}

            {/* Status Dot */}
            {showStatus && !isGroup && (
                <View
                    style={[
                        styles.statusDot,
                        {
                            backgroundColor: statusColor,
                            width: size * 0.24, // 12/50 = 0.24 ratio
                            height: size * 0.24,
                            borderRadius: (size * 0.24) / 2,
                            borderWidth: size * 0.04, // 2/50 = 0.04 ratio
                            bottom: size * 0.04, // 2/50 ratio
                            right: size * 0.04,
                        },
                    ]}
                />
            )}
        </View>
    );
};


export default Avatar;

const styles = StyleSheet.create({
	container: {
		position: "relative",
		width: 50,
		height: 50,
	},
	imageContainer: {
		borderRadius: 100,
		overflow: "hidden",
	},
	image: {
		width: 50,
		height: 50,
		borderRadius: 100,
	},
	statusDot: {
		position: "absolute",
		bottom: 2,
		right: 2,
		width: 12,
		height: 12,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: "#fff",
	},
	groupContainer: {
		width: 50,
		height: 50,
		borderRadius: 100,
		overflow: "hidden",
		flexWrap: "wrap",
		position: "relative",
	},
	groupImage: {
		width: 25,
		height: 25,
		position: "absolute",
	},
});
