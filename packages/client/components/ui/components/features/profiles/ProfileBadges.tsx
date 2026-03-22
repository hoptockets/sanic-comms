import { Show } from "solid-js";

import { User } from "stoat.js";

import { Text } from "../../design";

import { ProfileCard } from "./ProfileCard";
import {
  UserBadgeInlineIcons,
  userHasAnyBadgeSignals,
} from "./UserBadgeInlineIcons";

export function ProfileBadges(props: { user: User; width?: 1 | 2 | 3 }) {
  return (
    <Show when={userHasAnyBadgeSignals(props.user)}>
      <ProfileCard width={props.width}>
        <Text class="title" size="large">
          Badges
        </Text>
        <UserBadgeInlineIcons user={props.user} />
      </ProfileCard>
    </Show>
  );
}
