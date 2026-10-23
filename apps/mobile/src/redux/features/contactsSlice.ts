import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IContactRibbon } from "@/src/interfaces/list-interface";

interface ContactsState {
    manualContacts: IContactRibbon[];
    savedContacts: IContactRibbon[];
    showAddContactModal: boolean;
}

const initialState: ContactsState = {
    manualContacts: [],
    savedContacts: [],
    showAddContactModal: false,
};

export const contactsSlice = createSlice({
    name: "contacts",
    initialState,
    reducers: {
        addManualContact: (state, action: PayloadAction<IContactRibbon>) => {
            state.manualContacts.push(action.payload);
        },
        setShowAddContactModal: (state, action: PayloadAction<boolean>) => {
            state.showAddContactModal = action.payload;
        },
        /** Replaces manually-added contacts with what's in the local database on startup. */
        hydrateManualContacts: (state, action: PayloadAction<IContactRibbon[]>) => {
            state.manualContacts = action.payload;
        },
        setSavedContacts: (state, action: PayloadAction<IContactRibbon[]>) => {
            state.savedContacts = action.payload;
        },
    },
});

export const { addManualContact, setShowAddContactModal, hydrateManualContacts, setSavedContacts } = contactsSlice.actions;
export default contactsSlice.reducer;
