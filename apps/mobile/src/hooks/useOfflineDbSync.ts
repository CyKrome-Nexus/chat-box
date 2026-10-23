import { useEffect } from "react";
import type { Dispatch } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import { listConversations } from "@/src/lib/db/conversationsRepo";
import { listAllMessages } from "@/src/lib/db/messagesRepo";
import { listManualContacts } from "@/src/lib/db/contactsRepo";
import type { RootState } from "@/src/redux/store/store";
import { hydrateChats } from "@/src/redux/features/chatsSlice";
import { hydrateMessages } from "@/src/redux/features/messagesSlice";
import { hydrateManualContacts } from "@/src/redux/features/contactsSlice";

// Paints the last known chats/messages from SQLite before the network sync finishes.
export const hydrateOfflineDataForActiveAccount = async (dispatch: Dispatch) => {
    const [chats, messages, contacts] = await Promise.all([listConversations(), listAllMessages(), listManualContacts()]);
    dispatch(hydrateChats(chats));
    dispatch(hydrateMessages(messages));
    dispatch(hydrateManualContacts(contacts));
};

export const useOfflineDbSync = () => {
    const dispatch = useDispatch();
    const status = useSelector((state: RootState) => state.session.status);

    useEffect(() => {
        if (status === "ready") hydrateOfflineDataForActiveAccount(dispatch).catch(() => undefined);
    }, [status, dispatch]);
};
