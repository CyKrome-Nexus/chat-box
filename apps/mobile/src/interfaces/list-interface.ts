import ECallTypes from "../enums/call-types"
import IIconSVG from "./icon-interface"

export interface IAvatar {
    url: string
}

interface IRibbonParent {
    avatar: IAvatar,
    name: string,
}

export type TGroupRole = "owner" | "admin" | "member"

export interface IGroupParticipant {
    id: string
    name: string
    avatar?: IAvatar
    role: TGroupRole
    /** Color-coded username shown on their bubbles in the group — see groups.md. */
    color: string
}

export interface IGroupSettings {
    whoCanSendMessages: "all" | "admins"
    whoCanEditInfo: "all" | "admins"
    requireAdminApproval: boolean
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
    /** See docs/architecture/groups.md. */
    isGroup?: boolean
    groupDescription?: string
    participants?: IGroupParticipant[]
    groupSettings?: IGroupSettings
    /** Invite code for chatbox.link/join/[code] — see groups.md. */
    inviteCode?: string
    /** Broadcast List — a fan-out send target, not a real multi-user chat. */
    isBroadcast?: boolean
    broadcastRecipientIds?: string[]
    /** Disappearing Messages timer for this conversation. "off" (default) means messages never expire. */
    disappearingTimer?: "off" | "24h" | "7d" | "90d"
    /** Server-backed fields. */
    peerId?: string
    peerHandle?: string
    myRole?: TGroupRole
    lastMessageAt?: number
    groupTags?: string[]
    /** Per-member read/delivery pointers (epoch ms) used for message ticks. */
    memberReads?: { userId: string; readAt?: number; deliveredAt?: number }[]
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
    source?: "device" | "manual" | "server"
    /** Chatbox user id when this contact is registered. */
    userId?: string
    handle?: string
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
