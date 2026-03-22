import { createFormControl, createFormGroup } from "solid-forms";
import { For, Show, createEffect, on } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import type { API } from "stoat.js";

import { useClient } from "@revolt/client";
import { CONFIGURATION } from "@revolt/common";
import { useError } from "@revolt/i18n";
import { useState } from "@revolt/state";
import {
  CircularProgress,
  Column,
  Form2,
  MenuItem,
  Row,
  Text,
} from "@revolt/ui";

import { ServerSettingsProps } from "../ServerSettings";

const MAX_SERVER_MEDIA_BYTES = 6_000_000;

function ensureServerMediaSize(file: File, maxBytes: number) {
  if (file.size > maxBytes) {
    throw new Error(`File is too large. Max allowed size is ${maxBytes} bytes.`);
  }
}

/**
 * Server overview
 */
export default function ServerOverview(props: ServerSettingsProps) {
  const { t } = useLingui();
  const err = useError();
  const client = useClient();
  const state = useState();

  /* eslint-disable solid/reactivity */
  const editGroup = createFormGroup({
    name: createFormControl(props.server.name),
    description: createFormControl(props.server.description || ""),
    icon: createFormControl<string | File[] | null>(
      props.server.animatedIconURL,
    ),
    banner: createFormControl<string | File[] | null>(
      props.server.animatedBannerURL,
    ),
    themeAccent: createFormControl(props.server.themeAccent ?? ""),
    themePreset: createFormControl(props.server.themePreset ?? ""),
    sys_user_joined: createFormControl(
      props.server.systemMessages?.user_joined ?? "none",
    ),
    sys_user_left: createFormControl(
      props.server.systemMessages?.user_left ?? "none",
    ),
    sys_user_kicked: createFormControl(
      props.server.systemMessages?.user_kicked ?? "none",
    ),
    sys_user_banned: createFormControl(
      props.server.systemMessages?.user_banned ?? "none",
    ),
  });

  const channels = () =>
    props.server.channels.map((channel) => ({
      item: channel,
      value: channel.id,
    }));
  /* eslint-enable solid/reactivity */

  // update fields (if they are not dirty) ourselves:
  createEffect(
    on(
      () => props.server.name,
      (name) =>
        !editGroup.controls.name.isDirty &&
        editGroup.controls.name.setValue(name),
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.server.description,
      (description) =>
        description &&
        !editGroup.controls.description.isDirty &&
        editGroup.controls.description.setValue(description),
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.server.animatedIconURL,
      (icon) =>
        !editGroup.controls.icon.isDirty &&
        editGroup.controls.icon.setValue(icon ?? null),
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.server.animatedBannerURL,
      (banner) =>
        !editGroup.controls.banner.isDirty &&
        editGroup.controls.banner.setValue(banner ?? null),
      { defer: true },
    ),
  );

  function onReset() {
    editGroup.controls.name.setValue(props.server.name);
    editGroup.controls.description.setValue(props.server.description || "");
    editGroup.controls.icon.setValue(props.server.animatedIconURL ?? null);
    editGroup.controls.banner.setValue(props.server.animatedBannerURL ?? null);
    editGroup.controls.themeAccent.setValue(props.server.themeAccent ?? "");
    editGroup.controls.themePreset.setValue(props.server.themePreset ?? "");
    editGroup.controls.sys_user_joined.setValue(
      props.server.systemMessages?.user_joined ?? "none",
    );
    editGroup.controls.sys_user_left.setValue(
      props.server.systemMessages?.user_left ?? "none",
    );
    editGroup.controls.sys_user_kicked.setValue(
      props.server.systemMessages?.user_kicked ?? "none",
    );
    editGroup.controls.sys_user_banned.setValue(
      props.server.systemMessages?.user_banned ?? "none",
    );
  }

  async function onSubmit() {
    try {
    const changes: API.DataEditServer = {
      remove: [],
      system_messages: {
        // empty object => remove every system_message channel
        ...(props.server.systemMessages ?? {}),
      },
    };

    if (editGroup.controls.name.isDirty) {
      changes.name = editGroup.controls.name.value.trim();
    }

    if (editGroup.controls.description.isDirty) {
      const description = editGroup.controls.description.value.trim();

      if (description) {
        changes.description = description;
      } else {
        changes.remove!.push("Description");
      }
    }

    if (editGroup.controls.icon.isDirty) {
      if (!editGroup.controls.icon.value) {
        changes.remove!.push("Icon");
      } else if (Array.isArray(editGroup.controls.icon.value)) {
        ensureServerMediaSize(editGroup.controls.icon.value[0], MAX_SERVER_MEDIA_BYTES);
        changes.icon = await client().uploadFile(
          "icons",
          editGroup.controls.icon.value[0],
          CONFIGURATION.DEFAULT_MEDIA_URL,
        );
      }
    }

    if (editGroup.controls.banner.isDirty) {
      if (!editGroup.controls.banner.value) {
        changes.remove!.push("Banner");
      } else if (Array.isArray(editGroup.controls.banner.value)) {
        ensureServerMediaSize(
          editGroup.controls.banner.value[0],
          MAX_SERVER_MEDIA_BYTES,
        );
        changes.banner = await client().uploadFile(
          "banners",
          editGroup.controls.banner.value[0],
          CONFIGURATION.DEFAULT_MEDIA_URL,
        );
      }
    }

    if (editGroup.controls.themeAccent.isDirty) {
      const accent = editGroup.controls.themeAccent.value.trim();
      if (accent) {
        (changes as API.DataEditServer & { theme_accent?: string }).theme_accent =
          accent;
      } else {
        changes.remove!.push("ThemeAccent" as never);
      }
    }

    if (editGroup.controls.themePreset.isDirty) {
      const preset = editGroup.controls.themePreset.value.trim();
      if (preset) {
        (changes as API.DataEditServer & { theme_preset?: string }).theme_preset =
          preset;
      } else {
        changes.remove!.push("ThemePreset" as never);
      }
    }

    if (editGroup.controls.sys_user_joined.isDirty) {
      if (
        editGroup.controls.sys_user_joined.value == "none" &&
        changes.system_messages?.user_joined
      ) {
        delete changes.system_messages.user_joined;
      } else {
        changes.system_messages!.user_joined =
          editGroup.controls.sys_user_joined.value;
      }
    }

    if (editGroup.controls.sys_user_left.isDirty) {
      if (
        editGroup.controls.sys_user_left.value == "none" &&
        changes.system_messages?.user_left
      ) {
        delete changes.system_messages.user_left;
      } else {
        changes.system_messages!.user_left =
          editGroup.controls.sys_user_left.value;
      }
    }

    if (editGroup.controls.sys_user_kicked.isDirty) {
      if (
        editGroup.controls.sys_user_kicked.value == "none" &&
        changes.system_messages?.user_kicked
      ) {
        delete changes.system_messages.user_kicked;
      } else {
        changes.system_messages!.user_kicked =
          editGroup.controls.sys_user_kicked.value;
      }
    }

    if (editGroup.controls.sys_user_banned.isDirty) {
      if (
        editGroup.controls.sys_user_banned.value == "none" &&
        changes.system_messages?.user_banned
      ) {
        delete changes.system_messages.user_banned;
      } else {
        changes.system_messages!.user_banned =
          editGroup.controls.sys_user_banned.value;
      }
    }

    await props.server.edit(changes);
    } catch (e) {
      err(e);
      throw e;
    }
  }

  const submit = Form2.useSubmitHandler(editGroup, onSubmit, onReset);

  return (
    <Column gap="xl">
      <form onSubmit={submit}>
        <Column>
          <Form2.FileInput
            control={editGroup.controls.icon}
            accept="image/*"
            label={t`Server Icon`}
            imageJustify={false}
          />
          <Form2.FileInput
            control={editGroup.controls.banner}
            accept="image/*"
            label={t`Server Banner`}
            imageAspect="232/100"
            imageRounded={false}
            imageJustify={false}
          />
          <Form2.TextField
            name="name"
            control={editGroup.controls.name}
            label={t`Server Name`}
          />
          <Form2.TextField
            autosize
            min-rows={2}
            name="description"
            control={editGroup.controls.description}
            label={t`Server Description`}
            placeholder={t`This server is about...`}
          />
          <Show when={state.capabilities.isEnabled("server_theming_v1", true)}>
            <Form2.TextField
              name="themeAccent"
              control={editGroup.controls.themeAccent}
              label="Server Theme Accent"
              placeholder="#5865F2"
            />
            <Form2.TextField
              name="themePreset"
              control={editGroup.controls.themePreset}
              label="Server Theme Preset"
              placeholder="obsidian, aurora, mono"
            />
          </Show>
          <Text class="title" size="small">
            <Trans>System message channels</Trans>
          </Text>
          <Column>
            <Text class="label">
              <Trans>User Joined</Trans>
            </Text>
            <Form2.TextField.Select
              control={editGroup.controls.sys_user_joined}
            >
              <MenuItem value="none">
                <Trans>Disabled</Trans>
              </MenuItem>
              <For each={channels()}>
                {(element) => (
                  <MenuItem value={element.value}>{element.item.name}</MenuItem>
                )}
              </For>
            </Form2.TextField.Select>
          </Column>
          <Column>
            <Text class="label">
              <Trans>User Left</Trans>
            </Text>
            <Form2.TextField.Select control={editGroup.controls.sys_user_left}>
              <MenuItem value="none">
                <Trans>Disabled</Trans>
              </MenuItem>
              <For each={channels()}>
                {(element) => (
                  <MenuItem value={element.value}>{element.item.name}</MenuItem>
                )}
              </For>
            </Form2.TextField.Select>
          </Column>
          <Column>
            <Text class="label">
              <Trans>User Kicked</Trans>
            </Text>
            <Form2.TextField.Select
              control={editGroup.controls.sys_user_kicked}
            >
              <MenuItem value="none">
                <Trans>Disabled</Trans>
              </MenuItem>
              <For each={channels()}>
                {(element) => (
                  <MenuItem value={element.value}>{element.item.name}</MenuItem>
                )}
              </For>
            </Form2.TextField.Select>
          </Column>
          <Column>
            <Text class="label">
              <Trans>User Banned</Trans>
            </Text>
            <Form2.TextField.Select
              control={editGroup.controls.sys_user_banned}
            >
              <MenuItem value="none">
                <Trans>Disabled</Trans>
              </MenuItem>
              <For each={channels()}>
                {(element) => (
                  <MenuItem value={element.value}>{element.item.name}</MenuItem>
                )}
              </For>
            </Form2.TextField.Select>
          </Column>
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
    </Column>
  );
}
