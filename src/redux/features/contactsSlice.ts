import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IContactRibbon } from "@/src/interfaces/list-interface";

interface ContactsState {
    manualContacts: IContactRibbon[];
    showAddContactModal: boolean;
}

const initialState: ContactsState = {
    manualContacts: [],
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
    },
});

export const { addManualContact, setShowAddContactModal } = contactsSlice.actions;
export default contactsSlice.reducer;
