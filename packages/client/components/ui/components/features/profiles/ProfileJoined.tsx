import { Show, createMemo } from "solid-js";

import { ServerMember, User } from "stoat.js";

import { useTime } from "@revolt/i18n";

import { Text } from "../../design";
import { OverflowingText } from "../../utils";

import { ProfileCard } from "./ProfileCard";

export function ProfileJoined(props: {
  user: User;
  member?: ServerMember;
  width?: 1 | 2 | 3;
}) {
  const dayjs = useTime();
  const parseDate = (value: unknown): Date | undefined => {
    if (!value) return undefined;
    const parsed = value instanceof Date ? value : new Date(value as string);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };
  const createdAt = createMemo(() => parseDate(props.user.createdAt));
  const memberJoinedAt = createMemo(() => parseDate(props.member?.joinedAt));
  const formatDate = (value?: Date) =>
    value ? dayjs(value).format("DD MMM YYYY") : "Unknown";
  const hasValidMemberInfo = createMemo(
    () => Boolean(props.member?.server?.name) && Boolean(memberJoinedAt()),
  );

  return (
    <ProfileCard width={props.width}>
      <Text class="title" size="large">
        Joined
      </Text>
      <Text class="label">Member since</Text>
      <Text>{formatDate(createdAt())}</Text>
      <Show when={hasValidMemberInfo()}>
        <Text class="label">Server</Text>
        <Text>
          <OverflowingText>{props.member!.server!.name}</OverflowingText>
        </Text>
        <Text class="label">Member Since</Text>
        <Text>{formatDate(memberJoinedAt())}</Text>
      </Show>
    </ProfileCard>
  );
}
