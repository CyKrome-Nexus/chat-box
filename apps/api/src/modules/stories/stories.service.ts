import {
  STORY_TTL_MS,
  type CreateStoryInput,
  type Story as StoryDto,
  type StoryViewer,
} from "@chatbox/shared";

import { forbidden, notFound } from "@/lib/errors";
import { buildViewerContext, loadUsers, toObjectId, type LeanUser, type ViewerContext } from "@/lib/viewer";
import { Contact, Story, type StoryDoc } from "@/models/misc";
import { hub } from "@/realtime/hub";
import { toAttachment } from "@/serializers/messages";
import { toUserSummary } from "@/serializers/users";
import { resolveOwnedMedia } from "@/modules/media/media.service";

const toStory = (
  story: StoryDoc,
  viewerId: string,
  users: Map<string, LeanUser>,
  context: ViewerContext | null,
): StoryDto => {
  const isAuthor = story.authorId.toString() === viewerId;
  return {
    id: story._id.toString(),
    author: toUserSummary(users.get(story.authorId.toString()), context),
    kind: story.kind,
    media: story.media ? toAttachment(story.media) : null,
    text: story.text ?? null,
    backgroundColor: story.backgroundColor ?? null,
    viewedByMe: isAuthor || story.views.some((view) => view.userId.toString() === viewerId),
    viewCount: isAuthor ? story.views.length : null,
    createdAt: story.createdAt.toISOString(),
    expiresAt: story.expiresAt.toISOString(),
  };
};

const visibleFilter = async (viewerId: string) => {
  const viewer = toObjectId(viewerId);
  const authorsWhoSavedMe = (await Contact.find({ userId: viewer }, { ownerId: 1 }).lean()).map(
    (contact) => contact.ownerId,
  );
  return {
    expiresAt: { $gt: new Date() },
    $or: [
      { authorId: viewer },
      { audienceUserIds: viewer },
      { authorId: { $in: authorsWhoSavedMe }, audienceUserIds: null },
    ],
  };
};

export const storyFeed = async (viewerId: string): Promise<StoryDto[]> => {
  const stories = await Story.find(await visibleFilter(viewerId))
    .sort({ createdAt: 1 })
    .limit(500)
    .lean<StoryDoc[]>();
  const authorIds = stories.map((story) => story.authorId);
  const [users, context] = await Promise.all([loadUsers(authorIds), buildViewerContext(viewerId, authorIds)]);
  return stories.map((story) => toStory(story, viewerId, users, context));
};

export const createStory = async (authorId: string, input: CreateStoryInput): Promise<StoryDto> => {
  let media: StoryDoc["media"] = null;
  if (input.media) {
    const owned = await resolveOwnedMedia(authorId, [input.media.key]);
    const file = owned.get(input.media.key);
    if (!file) throw notFound("Media");
    media = {
      kind: input.media.kind,
      key: input.media.key,
      url: file.url,
      name: null,
      mimeType: file.mimeType,
      size: file.size,
      width: input.media.width ?? null,
      height: input.media.height ?? null,
      durationSeconds: input.media.durationSeconds ?? null,
      waveform: null,
      viewOnce: false,
    };
  }

  const audience = input.audienceUserIds?.map(toObjectId) ?? null;
  const story = await Story.create({
    authorId: toObjectId(authorId),
    kind: input.kind,
    media,
    text: input.text ?? null,
    backgroundColor: input.backgroundColor ?? null,
    audienceUserIds: audience,
    expiresAt: new Date(Date.now() + STORY_TTL_MS),
  });

  const recipients = audience
    ? audience.map(String)
    : (await Contact.find({ userId: toObjectId(authorId) }, { ownerId: 1 }).lean()).map((contact) =>
        contact.ownerId.toString(),
      );
  const users = await loadUsers([authorId]);
  await Promise.all(
    recipients.map(async (recipientId) => {
      const context = await buildViewerContext(recipientId, [authorId]);
      hub.toUsers([recipientId], "story:new", toStory(story.toObject(), recipientId, users, context));
    }),
  );
  return toStory(story.toObject(), authorId, users, null);
};

export const viewStory = async (viewerId: string, storyId: string): Promise<void> => {
  const story = await Story.findOne(
    { _id: toObjectId(storyId), ...(await visibleFilter(viewerId)) },
    { authorId: 1 },
  ).lean();
  if (!story) throw notFound("Story");
  if (story.authorId.toString() === viewerId) return;
  await Story.updateOne(
    { _id: story._id, "views.userId": { $ne: toObjectId(viewerId) } },
    { $push: { views: { userId: toObjectId(viewerId), viewedAt: new Date() } } },
  );
};

export const storyViewers = async (authorId: string, storyId: string): Promise<StoryViewer[]> => {
  const story = await Story.findById(storyId).lean<StoryDoc>();
  if (!story) throw notFound("Story");
  if (story.authorId.toString() !== authorId) throw forbidden();
  const users = await loadUsers(story.views.map((view) => view.userId));
  const context = await buildViewerContext(authorId, users.keys());
  return story.views.map((view) => ({
    user: toUserSummary(users.get(view.userId.toString()), context),
    viewedAt: view.viewedAt.toISOString(),
  }));
};

export const deleteStory = async (authorId: string, storyId: string): Promise<void> => {
  const result = await Story.deleteOne({ _id: toObjectId(storyId), authorId: toObjectId(authorId) });
  if (result.deletedCount === 0) throw notFound("Story");
};
