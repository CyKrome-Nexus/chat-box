export interface IEmoji {
    char: string;
    name: string;
    keywords: string[];
}

export interface IEmojiCategory {
    key: string;
    label: string;
    icon: string;
    emojis: IEmoji[];
}

export const EMOJI_CATEGORIES: IEmojiCategory[] = [
    {
        key: "smileys",
        label: "Smileys",
        icon: "😀",
        emojis: [
            { char: "😀", name: "grinning face", keywords: ["happy", "smile"] },
            { char: "😁", name: "beaming face", keywords: ["happy", "smile", "grin"] },
            { char: "😂", name: "tears of joy", keywords: ["laugh", "lol", "funny"] },
            { char: "🤣", name: "rolling on the floor laughing", keywords: ["laugh", "lol"] },
            { char: "😊", name: "smiling face", keywords: ["happy", "blush"] },
            { char: "😍", name: "heart eyes", keywords: ["love", "crush"] },
            { char: "😘", name: "face blowing a kiss", keywords: ["love", "kiss"] },
            { char: "😉", name: "winking face", keywords: ["wink", "flirt"] },
            { char: "😎", name: "smiling face with sunglasses", keywords: ["cool"] },
            { char: "🤔", name: "thinking face", keywords: ["think", "hmm"] },
            { char: "😢", name: "crying face", keywords: ["sad", "cry"] },
            { char: "😭", name: "loudly crying face", keywords: ["sad", "cry", "sob"] },
            { char: "😡", name: "pouting face", keywords: ["angry", "mad"] },
            { char: "😴", name: "sleeping face", keywords: ["sleep", "tired"] },
            { char: "🥳", name: "partying face", keywords: ["party", "celebrate"] },
            { char: "😱", name: "screaming in fear", keywords: ["shock", "scared"] },
            { char: "🙄", name: "rolling eyes", keywords: ["annoyed", "eyeroll"] },
            { char: "😅", name: "grinning with sweat", keywords: ["relief", "phew"] },
        ],
    },
    {
        key: "people",
        label: "People",
        icon: "👋",
        emojis: [
            { char: "👋", name: "waving hand", keywords: ["hi", "hello", "bye"] },
            { char: "👍", name: "thumbs up", keywords: ["like", "yes", "good"] },
            { char: "👎", name: "thumbs down", keywords: ["dislike", "no", "bad"] },
            { char: "👏", name: "clapping hands", keywords: ["applause", "well done"] },
            { char: "🙌", name: "raising hands", keywords: ["celebrate", "yay"] },
            { char: "🙏", name: "folded hands", keywords: ["please", "thanks", "pray"] },
            { char: "💪", name: "flexed biceps", keywords: ["strong", "muscle"] },
            { char: "🤝", name: "handshake", keywords: ["deal", "agreement"] },
            { char: "✌️", name: "victory hand", keywords: ["peace"] },
            { char: "👌", name: "ok hand", keywords: ["okay", "perfect"] },
            { char: "🤷", name: "shrug", keywords: ["idk", "shrug"] },
            { char: "🧑‍💻", name: "technologist", keywords: ["developer", "coder"] },
        ],
    },
    {
        key: "nature",
        label: "Nature",
        icon: "🐶",
        emojis: [
            { char: "🐶", name: "dog face", keywords: ["dog", "pet"] },
            { char: "🐱", name: "cat face", keywords: ["cat", "pet"] },
            { char: "🐼", name: "panda", keywords: ["panda", "cute"] },
            { char: "🦁", name: "lion", keywords: ["lion"] },
            { char: "🐸", name: "frog", keywords: ["frog"] },
            { char: "🌸", name: "cherry blossom", keywords: ["flower", "spring"] },
            { char: "🌞", name: "sun", keywords: ["sun", "sunny"] },
            { char: "🌧️", name: "rain cloud", keywords: ["rain", "weather"] },
            { char: "🔥", name: "fire", keywords: ["fire", "lit", "hot"] },
            { char: "🌈", name: "rainbow", keywords: ["rainbow"] },
            { char: "⭐", name: "star", keywords: ["star"] },
            { char: "🌙", name: "crescent moon", keywords: ["moon", "night"] },
        ],
    },
    {
        key: "food",
        label: "Food",
        icon: "🍕",
        emojis: [
            { char: "🍕", name: "pizza", keywords: ["pizza", "food"] },
            { char: "🍔", name: "hamburger", keywords: ["burger", "food"] },
            { char: "🍟", name: "fries", keywords: ["fries", "food"] },
            { char: "🌮", name: "taco", keywords: ["taco", "food"] },
            { char: "🍣", name: "sushi", keywords: ["sushi", "food"] },
            { char: "🍩", name: "doughnut", keywords: ["donut", "sweet"] },
            { char: "🍰", name: "cake slice", keywords: ["cake", "dessert"] },
            { char: "☕", name: "hot beverage", keywords: ["coffee", "tea"] },
            { char: "🍺", name: "beer mug", keywords: ["beer", "drink"] },
            { char: "🍎", name: "red apple", keywords: ["apple", "fruit"] },
        ],
    },
    {
        key: "activity",
        label: "Activity",
        icon: "⚽",
        emojis: [
            { char: "⚽", name: "soccer ball", keywords: ["football", "soccer"] },
            { char: "🏀", name: "basketball", keywords: ["basketball"] },
            { char: "🎮", name: "video game", keywords: ["gaming", "controller"] },
            { char: "🎧", name: "headphone", keywords: ["music", "audio"] },
            { char: "🎉", name: "party popper", keywords: ["celebrate", "party"] },
            { char: "🏆", name: "trophy", keywords: ["win", "award"] },
            { char: "🎯", name: "direct hit", keywords: ["target", "goal"] },
            { char: "🎸", name: "guitar", keywords: ["music", "guitar"] },
        ],
    },
    {
        key: "travel",
        label: "Travel",
        icon: "✈️",
        emojis: [
            { char: "✈️", name: "airplane", keywords: ["travel", "flight"] },
            { char: "🚗", name: "car", keywords: ["car", "drive"] },
            { char: "🚀", name: "rocket", keywords: ["rocket", "launch"] },
            { char: "🏖️", name: "beach", keywords: ["beach", "vacation"] },
            { char: "🗺️", name: "world map", keywords: ["map", "travel"] },
            { char: "🏔️", name: "mountain", keywords: ["mountain", "hike"] },
            { char: "🏠", name: "house", keywords: ["home", "house"] },
            { char: "🚲", name: "bicycle", keywords: ["bike", "cycle"] },
        ],
    },
    {
        key: "objects",
        label: "Objects",
        icon: "💡",
        emojis: [
            { char: "💡", name: "light bulb", keywords: ["idea", "light"] },
            { char: "📱", name: "mobile phone", keywords: ["phone", "mobile"] },
            { char: "💻", name: "laptop", keywords: ["computer", "laptop"] },
            { char: "📷", name: "camera", keywords: ["camera", "photo"] },
            { char: "🎁", name: "wrapped gift", keywords: ["gift", "present"] },
            { char: "📌", name: "pushpin", keywords: ["pin", "note"] },
            { char: "🔑", name: "key", keywords: ["key", "unlock"] },
            { char: "⏰", name: "alarm clock", keywords: ["clock", "time", "alarm"] },
        ],
    },
    {
        key: "symbols",
        label: "Symbols",
        icon: "❤️",
        emojis: [
            { char: "❤️", name: "red heart", keywords: ["love", "heart"] },
            { char: "💔", name: "broken heart", keywords: ["heartbreak", "sad"] },
            { char: "💯", name: "hundred points", keywords: ["100", "perfect"] },
            { char: "✅", name: "check mark", keywords: ["done", "check", "yes"] },
            { char: "❌", name: "cross mark", keywords: ["no", "wrong", "cancel"] },
            { char: "⚠️", name: "warning", keywords: ["warning", "alert"] },
            { char: "❓", name: "question mark", keywords: ["question", "confused"] },
            { char: "💤", name: "zzz", keywords: ["sleep", "tired", "zzz"] },
        ],
    },
];
