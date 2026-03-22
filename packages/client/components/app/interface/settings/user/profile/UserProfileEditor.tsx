import { createFormControl, createFormGroup } from "solid-forms";
import { For, Show, createEffect, createSignal, on } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { API, User } from "stoat.js";

import { useClient } from "@revolt/client";
import { CONFIGURATION } from "@revolt/common";
import { useError } from "@revolt/i18n";
import { useState } from "@revolt/state";
import {
  CategoryButton,
  CircularProgress,
  Column,
  Form2,
  MenuItem,
  Row,
  Text,
} from "@revolt/ui";

import MdBadge from "@material-design-icons/svg/filled/badge.svg?component-solid";

import { useSettingsNavigation } from "../../Settings";

interface Props {
  user: User;
}

const ALLOWED_ANIMATION_PRESETS = new Set(["", "pulse-glow", "shimmer", "float"]);
const MAX_PROFILE_MEDIA_BYTES = 6_000_000;
const FONT_PRESETS = ["", "gg sans", "Monospace", "Serif"] as const;
const NAMEPLATE_PRESETS = [
  "",
  "Founder",
  "Moderator",
  "Builder",
  "Contributor",
  "Supporter",
] as const;
const ROLE_COLOUR_PRESETS = [
  "",
  "#5865F2",
  "#57F287",
  "#FEE75C",
  "#ED4245",
  "#EB459E",
  "#1ABC9C",
] as const;

function normaliseRoleColour(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : "";
}

function normaliseAnimationPreset(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return ALLOWED_ANIMATION_PRESETS.has(trimmed) ? trimmed : "";
}

function ensureMediaSize(file: File, maxBytes: number) {
  if (file.size > maxBytes) {
    throw new Error(`File is too large. Max allowed size is ${maxBytes} bytes.`);
  }
}

export function UserProfileEditor(props: Props) {
  const { t } = useLingui();
  const err = useError();
  const client = useClient();
  const queryClient = useQueryClient();
  const state = useState();

  const profile = useQuery(() => ({
    queryKey: ["profile", props.user.id],
    queryFn: () => props.user.fetchProfile(),
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  }));

  const { navigate } = useSettingsNavigation();

  /* eslint-disable solid/reactivity */
  const editGroup = createFormGroup({
    displayName: createFormControl(props.user.displayName),
    // username: createFormControl(props.user.username),
    avatar: createFormControl<string | File[] | null>(
      props.user.animatedAvatarURL,
    ),
    banner: createFormControl<string | File[] | null>(null),
    bio: createFormControl(""),
    font: createFormControl(""),
    nameplate: createFormControl(""),
    roleColour: createFormControl(""),
    animation: createFormControl(""),
  });
  /* eslint-enable solid/reactivity */

  // unlike the other forms, this one does not react to
  // further changes outside of our control because it's
  // unlikely that the user is going to be doing this

  const [initialBio, setInitialBio] = createSignal<readonly [string]>();
  const [showCosmetics, setShowCosmetics] = createSignal(false);

  // once profile data is loaded, copy it into the form
  createEffect(
    on(
      () => profile.data,
      (profileData) => {
        if (profileData) {
          editGroup.controls.banner.setValue(
            profileData.animatedBannerURL || null,
          );

          editGroup.controls.bio.setValue(profileData.content || "");
          setInitialBio([profileData.content || ""]);
          const cosmetics = profileData.cosmetics ?? {};
          editGroup.controls.font.setValue(cosmetics.font ?? "");
          editGroup.controls.nameplate.setValue(cosmetics.nameplate ?? "");
          editGroup.controls.roleColour.setValue(
            normaliseRoleColour(cosmetics.role_colour),
          );
          editGroup.controls.animation.setValue(
            normaliseAnimationPreset(cosmetics.animation),
          );
        }
      },
    ),
  );

  function onReset() {
    editGroup.controls.displayName.setValue(props.user.displayName);
    editGroup.controls.avatar.setValue(props.user.animatedAvatarURL);

    if (profile.data) {
      editGroup.controls.banner.setValue(
        profile.data.animatedBannerURL || null,
      );
      editGroup.controls.bio.setValue(profile.data.content || "");
      setInitialBio([profile.data.content || ""]);
      const cosmetics = profile.data.cosmetics ?? {};
      editGroup.controls.font.setValue(cosmetics.font ?? "");
      editGroup.controls.nameplate.setValue(cosmetics.nameplate ?? "");
      editGroup.controls.roleColour.setValue(
        normaliseRoleColour(cosmetics.role_colour),
      );
      editGroup.controls.animation.setValue(
        normaliseAnimationPreset(cosmetics.animation),
      );
    }
  }

  async function onSubmit() {
    const changes: API.DataEditUser = {
      remove: [],
    };

    try {
      if (editGroup.controls.displayName.isDirty) {
        changes.display_name = editGroup.controls.displayName.value.trim();
      }

      if (editGroup.controls.avatar.isDirty) {
        if (!editGroup.controls.avatar.value) {
          changes.remove!.push("Avatar");
        } else if (Array.isArray(editGroup.controls.avatar.value)) {
          ensureMediaSize(editGroup.controls.avatar.value[0], MAX_PROFILE_MEDIA_BYTES);
          changes.avatar = await client().uploadFile(
            "avatars",
            editGroup.controls.avatar.value[0],
            CONFIGURATION.DEFAULT_MEDIA_URL,
          );
        }
      }

      if (editGroup.controls.bio.isDirty) {
        if (!editGroup.controls.bio.value) {
          changes.remove!.push("ProfileContent");
        } else {
          changes.profile ??= {};
          changes.profile.content = editGroup.controls.bio.value;
        }
      }

      if (
        editGroup.controls.font.isDirty ||
        editGroup.controls.nameplate.isDirty ||
        editGroup.controls.roleColour.isDirty ||
        editGroup.controls.animation.isDirty
      ) {
        changes.profile ??= {};
        (changes.profile as any).cosmetics = {
          font: editGroup.controls.font.value || undefined,
          nameplate: editGroup.controls.nameplate.value || undefined,
          role_colour: editGroup.controls.roleColour.value || undefined,
          animation: editGroup.controls.animation.value || undefined,
        };
      }

      let newBannerUrl: string | null = null;

      if (editGroup.controls.banner.isDirty) {
        if (!editGroup.controls.banner.value) {
          changes.remove!.push("ProfileBackground");
        } else if (Array.isArray(editGroup.controls.banner.value)) {
          ensureMediaSize(editGroup.controls.banner.value[0], MAX_PROFILE_MEDIA_BYTES);
          changes.profile ??= {};
          changes.profile.background = await client().uploadFile(
            "backgrounds",
            editGroup.controls.banner.value[0],
            CONFIGURATION.DEFAULT_MEDIA_URL,
          );

          newBannerUrl = `${CONFIGURATION.DEFAULT_MEDIA_URL}/backgrounds/${changes.profile.background}`;
        } else {
          newBannerUrl = editGroup.controls.banner.value;
        }
      }

      await props.user.edit(changes);

      if (editGroup.controls.banner.isDirty && profile.data) {
        queryClient.setQueryData(["profile", props.user.id], {
          ...profile.data,
          animatedBannerURL: newBannerUrl,
          bannerURL: newBannerUrl,
        });
      }
    } catch (e) {
      err(e);
      throw e;
    }
  }

  const submit = Form2.useSubmitHandler(editGroup, onSubmit, onReset);

  return (
    <form onSubmit={submit}>
      <Column>
        <Form2.FileInput
          control={editGroup.controls.avatar}
          accept="image/*"
          label={t`Avatar`}
          imageJustify={false}
        />
        <Form2.FileInput
          control={editGroup.controls.banner}
          accept="image/*"
          label={t`Banner`}
          imageAspect="232/100"
          imageRounded={false}
          imageJustify={false}
        />
        <Form2.TextField
          name="displayName"
          control={editGroup.controls.displayName}
          label={t`Display Name`}
        />

        <Show when={!props.user.bot}>
          <CategoryButton
            icon={<MdBadge />}
            action="chevron"
            description={
              <Trans>Go to account settings to edit your username</Trans>
            }
            onClick={() => navigate("account")}
          >
            <Trans>Want to change username?</Trans>
          </CategoryButton>
        </Show>

        <Text class="label">
          <Trans>Profile Bio</Trans>
        </Text>
        <Form2.TextEditor
          initialValue={initialBio()}
          control={editGroup.controls.bio}
          placeholder={t`Something cool about me...`}
        />

        <Show
          when={state.capabilities.isEnabled(
            "profile_v3",
            state.settings.getValue("features:profile_v2"),
          )}
        >
          <CategoryButton
            action="chevron"
            onClick={() => setShowCosmetics((value) => !value)}
            description="Optional profile cosmetics for Discord-style profile cards."
          >
            Profile Cosmetics
          </CategoryButton>

          <Show when={showCosmetics()}>
            <Text class="label">Profile Font</Text>
            <Form2.TextField.Select control={editGroup.controls.font}>
              <For each={FONT_PRESETS}>
                {(preset) => (
                  <MenuItem value={preset}>{preset || "Default"}</MenuItem>
                )}
              </For>
            </Form2.TextField.Select>

            <Text class="label">Nameplate</Text>
            <Form2.TextField.Select control={editGroup.controls.nameplate}>
              <For each={NAMEPLATE_PRESETS}>
                {(preset) => (
                  <MenuItem value={preset}>{preset || "None"}</MenuItem>
                )}
              </For>
            </Form2.TextField.Select>

            <Text class="label">Role Colour</Text>
            <Row>
              <input
                type="color"
                value={editGroup.controls.roleColour.value || "#5865F2"}
                onInput={(event) =>
                  editGroup.controls.roleColour.setValue(event.currentTarget.value)
                }
                style={{
                  width: "40px",
                  height: "32px",
                  padding: "0",
                  border: "none",
                  background: "transparent",
                }}
              />
              <For each={ROLE_COLOUR_PRESETS.filter(Boolean)}>
                {(preset) => (
                  <button
                    type="button"
                    onClick={() =>
                      editGroup.controls.roleColour.setValue(preset as string)
                    }
                    style={{
                      width: "24px",
                      height: "24px",
                      border: "1px solid rgba(255,255,255,0.35)",
                      "border-radius": "999px",
                      background: preset,
                    }}
                    title={preset}
                  />
                )}
              </For>
            </Row>

            <Text class="label">Profile Animation</Text>
            <Form2.TextField.Select control={editGroup.controls.animation}>
              <MenuItem value="">None</MenuItem>
              <MenuItem value="pulse-glow">Pulse Glow</MenuItem>
              <MenuItem value="shimmer">Shimmer</MenuItem>
              <MenuItem value="float">Float</MenuItem>
            </Form2.TextField.Select>
          </Show>
        </Show>

        <Row>
          <Form2.Reset group={editGroup} onReset={onReset} />
          <Form2.Submit group={editGroup} requireDirty>
            <Trans>Save</Trans>
          </Form2.Submit>
          <Show when={editGroup.isPending}>
            <CircularProgress />
          </Show>
        </Row>
      </Column>
    </form>
  );
}
