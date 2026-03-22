import { useQuery } from "@tanstack/solid-query";
import { Show } from "solid-js";
import { styled } from "styled-system/jsx";

import { Dialog, DialogProps, Profile } from "@revolt/ui";
import { useState } from "@revolt/state";

import { useModals } from "..";
import { Modals } from "../types";

export function UserProfileModal(
  props: DialogProps & Modals & { type: "user_profile" },
) {
  const { openModal } = useModals();
  const state = useState();

  const query = useQuery(() => ({
    queryKey: ["profile", props.user.id],
    queryFn: () => props.user.fetchProfile(),
  }));

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      minWidth={560}
      padding={8}
    >
      <Grid
        class={
          state.capabilities.isEnabled(
            "profile_v3",
            state.settings.getValue("features:profile_v2"),
          )
            ? "profile-v3"
            : ""
        }
      >
        <Profile.Banner
          width={3}
          user={props.user}
          member={props.member}
          bannerUrl={query.data?.animatedBannerURL}
          onClick={
            query.data?.banner
              ? () =>
                  openModal({ type: "image_viewer", file: query.data!.banner! })
              : undefined
          }
          onClickAvatar={(e) => {
            e.stopPropagation();

            if (props.user.avatar) {
              openModal({ type: "image_viewer", file: props.user.avatar });
            }
          }}
        />

        <Show
          when={state.capabilities.isEnabled(
            "profile_v3",
            state.settings.getValue("features:profile_v2"),
          )}
        >
          <Profile.Hero
            user={props.user}
            member={props.member}
            profile={query.data as any}
            width={3}
          />
        </Show>

        <Profile.Actions user={props.user} width={3} />
        <Profile.Status user={props.user} />
        <Show
          when={!state.capabilities.isEnabled(
            "profile_v3",
            state.settings.getValue("features:profile_v2"),
          )}
        >
          <Profile.Badges user={props.user} width={3} />
        </Show>
        <Profile.Joined user={props.user} member={props.member} width={3} />
        <Profile.Mutuals user={props.user} width={3} />
        <Profile.Bio content={query.data?.content} full />
      </Grid>
    </Dialog>
  );
}

const Grid = styled("div", {
  base: {
    display: "grid",
    gap: "var(--gap-md)",
    padding: "var(--gap-md)",
    gridTemplateColumns: "repeat(3, 1fr)",
    "&.profile-v3": {
      background:
        "linear-gradient(180deg, rgba(88,101,242,0.22) 0%, rgba(0,0,0,0) 40%), var(--md-sys-color-surface-container)",
      borderRadius: "16px",
    },
  },
});

