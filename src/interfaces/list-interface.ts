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
}

export interface IChatList {
    chats: IChatRibbon[]
}

// Calls
export interface ICallRibbon extends IRibbonParent {
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
}

export interface ISettingsList {
    settings: ISettingsRibbon[]
}
