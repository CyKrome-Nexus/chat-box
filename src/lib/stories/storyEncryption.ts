import { createSenderKey, distributeSenderKey } from "@/src/lib/crypto/senderKeys";

/**
 * "Encrypt status media with an ephemeral broadcast key distributed
 * exclusively to the authorized audience contacts" — reuses the Sender Keys
 * engine built for group E2EE (see e2ee-crypto.md): a story is treated as a
 * one-off "group" whose id is the story id and whose members are the
 * resolved audience's conversation ids. The key material is genuinely
 * encrypted once per audience member through *their own* established
 * pairwise Double Ratchet channel — real crypto, not a stub — even though
 * there's no second real device to actually decrypt it on the receiving end
 * (same self-test-only limitation documented in e2ee-crypto.md/stories.md).
 */
export const distributeStoryKey = async (storyId: string, audienceConversationIds: string[]): Promise<Record<string, string>> => {
    const senderKeyState = createSenderKey();
    return distributeSenderKey(storyId, "me", senderKeyState, audienceConversationIds);
};
