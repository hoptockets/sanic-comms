import { BiSolidShield } from "solid-icons/bi";
import { Show } from "solid-js";

import { User, UserBadges } from "stoat.js";
import { styled } from "styled-system/jsx";

import badgeDeveloper from "../../../../../public/assets/badges/developer.svg";
import badgeEarlyAdopter from "../../../../../public/assets/badges/early_adopter.svg";
import badgeFounder from "../../../../../public/assets/badges/founder.svg";
import badgeModeration from "../../../../../public/assets/badges/moderation.svg";
import badgePaw from "../../../../../public/assets/badges/paw.svg";
import badgeSupporter from "../../../../../public/assets/badges/supporter.svg";
import badgeTranslator from "../../../../../public/assets/badges/translator.svg";
import MdAdminPanelSettings from "@material-design-icons/svg/outlined/admin_panel_settings.svg?component-solid";
import MdSupportAgent from "@material-design-icons/svg/outlined/support_agent.svg?component-solid";

function staffPlatformRole(user: User): boolean {
  const role = user.platformAdminRole;
  return typeof role === "string" && role.length > 0;
}

export function userHasAnyBadgeSignals(user: User): boolean {
  return (
    user.privileged ||
    staffPlatformRole(user) ||
    (user.badges ?? 0) > 0
  );
}

/** Discord-style badge strip (icons only) for headers and profile cards. */
export function UserBadgeInlineIcons(props: { user: User }) {
  return (
    <BadgeRow>
      <Show when={props.user.badges & UserBadges.Founder}>
        <img
          use:floating={{
            tooltip: { placement: "top", content: "Stoat Founder" },
          }}
          src={badgeFounder}
          alt=""
        />
      </Show>
      <Show when={props.user.badges & UserBadges.Developer}>
        <img
          use:floating={{
            tooltip: { placement: "top", content: "Stoat Developer" },
          }}
          src={badgeDeveloper}
          alt=""
        />
      </Show>
      <Show when={props.user.badges & UserBadges.Supporter}>
        <img
          use:floating={{
            tooltip: { placement: "top", content: "Donated to Stoat" },
          }}
          src={badgeSupporter}
          alt=""
        />
      </Show>
      <Show when={props.user.badges & UserBadges.Translator}>
        <img
          use:floating={{
            tooltip: { placement: "top", content: "Helped translate Stoat" },
          }}
          src={badgeTranslator}
          alt=""
        />
      </Show>
      <Show when={props.user.badges & UserBadges.EarlyAdopter}>
        <img
          use:floating={{
            tooltip: {
              placement: "top",
              content: "One of the first 1000 users!",
            },
          }}
          src={badgeEarlyAdopter}
          alt=""
        />
      </Show>
      <Show when={props.user.badges & UserBadges.PlatformModeration}>
        <span
          use:floating={{
            tooltip: { placement: "top", content: "Platform Moderator" },
          }}
        >
          <img src={badgeModeration} alt="" />
        </span>
      </Show>
      <Show
        when={
          props.user.privileged ||
          (props.user.badges & UserBadges.CommsAdmin) > 0
        }
      >
        <span
          use:floating={{
            tooltip: {
              placement: "top",
              content: props.user.privileged
                ? ".Comms Platform Admin"
                : ".Comms Admin",
            },
          }}
        >
          <MdAdminPanelSettings />
        </span>
      </Show>
      <Show
        when={
          (props.user.badges & UserBadges.CommsStaff) > 0 ||
          staffPlatformRole(props.user)
        }
      >
        <span
          use:floating={{
            tooltip: {
              placement: "top",
              content: staffPlatformRole(props.user)
                ? `Platform: ${props.user.platformAdminRole}`
                : ".Comms Staff",
            },
          }}
        >
          <MdSupportAgent />
        </span>
      </Show>
      <Show when={props.user.badges & UserBadges.ResponsibleDisclosure}>
        <span
          use:floating={{
            tooltip: {
              placement: "top",
              content: "Responsibly disclosed security issues",
            },
          }}
        >
          <BiSolidShield />
        </span>
      </Show>
      <Show when={props.user.badges & UserBadges.Paw}>
        <img
          use:floating={{
            tooltip: { placement: "top", content: "🦊" },
          }}
          src={badgePaw}
          alt=""
        />
      </Show>
    </BadgeRow>
  );
}

const BadgeRow = styled("div", {
  base: {
    gap: "var(--gap-sm)",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",

    "& img, & svg": {
      width: "22px",
      height: "22px",
      aspectRatio: "1/1",
    },
  },
});
