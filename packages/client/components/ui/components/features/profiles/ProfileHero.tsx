import { Show } from "solid-js";

import { ServerMember, User } from "stoat.js";
import { styled } from "styled-system/jsx";

import { Text } from "../../design";

import { UserBadgeInlineIcons, userHasAnyBadgeSignals } from "./UserBadgeInlineIcons";

interface Props {
  user: User;
  member?: ServerMember;
  profile?: {
    cosmetics?: {
      font?: string;
      nameplate?: string;
      role_colour?: string;
      animation?: string;
    };
  };
  width?: 1 | 2 | 3;
}

export function ProfileHero(props: Props) {
  const cosmetics = () => props.profile?.cosmetics;
  const displayName = () => props.member?.displayName ?? props.user.displayName;
  const roleColour = () =>
    cosmetics()?.role_colour ?? props.member?.roleColour ?? "var(--accent)";

  return (
    <Hero
      width={props.width}
      style={{
        "--profile-font": cosmetics()?.font || "inherit",
      }}
    >
      <Row>
        <Text class="title" size="large" style={{ color: roleColour() }}>
          {displayName()}
        </Text>
        <Text class="label">
          {props.user.username}#{props.user.discriminator}
        </Text>
        <Show when={userHasAnyBadgeSignals(props.user)}>
          <UserBadgeInlineIcons user={props.user} />
        </Show>
      </Row>

      <Show when={cosmetics()?.nameplate}>
        <Nameplate>{cosmetics()?.nameplate}</Nameplate>
      </Show>
      <Show when={cosmetics()?.animation}>
        <AnimationChip>{cosmetics()?.animation}</AnimationChip>
      </Show>
    </Hero>
  );
}

const Hero = styled("div", {
  base: {
    marginTop: "-6px",
    padding: "10px 12px",
    borderRadius: "12px",
    background:
      "linear-gradient(120deg, rgba(88,101,242,0.26), rgba(88,101,242,0.08))",
    border: "1px solid rgba(88,101,242,0.36)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    fontFamily: "var(--profile-font, inherit)",
  },
  variants: {
    width: {
      3: {
        gridColumn: "1 / 4",
      },
      2: {
        gridColumn: "1 / 3",
      },
      1: {},
    },
  },
});

const Row = styled("div", {
  base: {
    flex: 1,
    minWidth: 0,
  },
});

const Nameplate = styled("span", {
  base: {
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.2)",
  },
});

const AnimationChip = styled("span", {
  base: {
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "0.75rem",
    background: "rgba(88,101,242,0.22)",
    animation: "pulse 2s infinite ease-in-out",
    "@keyframes pulse": {
      "0%, 100%": { opacity: 0.75, transform: "scale(1)" },
      "50%": { opacity: 1, transform: "scale(1.04)" },
    },
  },
});
