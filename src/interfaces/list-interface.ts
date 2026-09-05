import ECallTypes from "../enums/call-types"
import IIconSVG from "./icon-interface"

export interface IAvatar {
    url: string
}

interface IRibbonParent {
    avatar: IAvatar,
    name: string,
}

// Chat
export interface IChatRibbon extends IRibbonParent {
    id: string
    lastMessage?: string
    lastStatus?: string
    notificationCount?: number
    status?: "ONLINE"
    muted?: boolean
    /** Up to 5 chats — see chat-organization.md. */
    pinned?: boolean
    archived?: boolean
    /** Unsent input-bar text, auto-saved when the user leaves the chat screen. */
    draft?: string
    /**
     * Reserved for the "Groups" filter pill — always false until groups
     * (#33) exist. See docs/architecture/chat-organization.md.
     */
    isGroup?: boolean
    /** Disappearing Messages timer for this conversation. "off" (default) means messages never expire. */
    disappearingTimer?: "off" | "24h" | "7d" | "90d"
}

export interface IChatList {
    chats: IChatRibbon[]
}

// Calls
export interface ICallRibbon extends IRibbonParent {
    id: string,
    callTime?: string,
    callType?: ECallTypes
}

export interface ICallList {
    calls: ICallRibbon[]
}

// Contacts
export interface IContactRibbon extends IRibbonParent {
    id: string
    about?: string
    phoneNumber?: string
    isRegistered?: boolean
    source?: "device" | "manual"
}

export interface IContactList {
    contacts: IContactRibbon[]
}

// Settings
export interface ISettingsRibbon {
    svg: string | IIconSVG;
    title: string;
    description?: string;
    onPress?: () => void;
}

export interface ISettingsList {
    settings: ISettingsRibbon[]
}
