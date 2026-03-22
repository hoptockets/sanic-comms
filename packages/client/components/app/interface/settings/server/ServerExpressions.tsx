import { createFormControl, createFormGroup } from "solid-forms";
import { For, Show, createResource } from "solid-js";

import { Server } from "stoat.js";

import { useClient } from "@revolt/client";
import { CONFIGURATION } from "@revolt/common";
import { useError } from "@revolt/i18n";
import { useState } from "@revolt/state";
import {
  Avatar,
  Button,
  Column,
  Form2,
  Row,
  Text,
} from "@revolt/ui";

type StickerRow = {
  _id: string;
  name: string;
};

type SoundRow = {
  _id: string;
  name: string;
};

/**
 * Server stickers and soundboard clips (gated by rollout capabilities).
 */
export function ServerExpressions(props: { server: Server }) {
  const client = useClient();
  const err = useError();
  const state = useState();

  const stickersOn = () =>
    state.capabilities.isEnabled(
      "stickers_v1",
      state.settings.getValue("features:stickers_v1"),
    );
  const soundOn = () =>
    state.capabilities.isEnabled(
      "soundboard_v1",
      state.settings.getValue("features:soundboard_v1"),
    );

  const [stickerList, { refetch: refetchStickers }] = createResource(
    () => ({ id: props.server.id, on: stickersOn() }),
    async (src) => {
      if (!src.on) return [] as StickerRow[];
      try {
        const res = (await client().api.get(
          `/custom/stickers/server/${src.id}`,
        )) as { stickers: StickerRow[] };
        return res.stickers ?? [];
      } catch {
        return [];
      }
    },
  );

  const [soundList, { refetch: refetchSounds }] = createResource(
    () => ({ id: props.server.id, on: soundOn() }),
    async (src) => {
      if (!src.on) return [] as SoundRow[];
      try {
        const res = (await client().api.get(
          `/custom/soundboard/server/${src.id}`,
        )) as { clips: SoundRow[] };
        return res.clips ?? [];
      } catch {
        return [];
      }
    },
  );

  const stickerForm = createFormGroup({
    name: createFormControl("", { required: true }),
    file: createFormControl<string | File[] | null>(null, { required: true }),
  });

  const soundForm = createFormGroup({
    name: createFormControl("", { required: true }),
    file: createFormControl<string | File[] | null>(null, { required: true }),
  });

  async function addSticker(e: Event) {
    e.preventDefault();
    if (!stickersOn()) return;
    try {
      const file = stickerForm.controls.file.value![0];
      const id = await client().uploadFile(
        "stickers",
        file,
        CONFIGURATION.DEFAULT_MEDIA_URL,
      );
      await client().api.put(`/custom/stickers/${id}`, {
        name: stickerForm.controls.name.value.trim(),
        parent: { type: "Server", id: props.server.id },
        nsfw: false,
      });
      stickerForm.controls.name.setValue("");
      stickerForm.controls.file.setValue(null);
      await refetchStickers();
    } catch (e) {
      err(e);
    }
  }

  async function addSound(e: Event) {
    e.preventDefault();
    if (!soundOn()) return;
    try {
      const file = soundForm.controls.file.value![0];
      const id = await client().uploadFile(
        "soundboard",
        file,
        CONFIGURATION.DEFAULT_MEDIA_URL,
      );
      await client().api.put(`/custom/soundboard/${id}`, {
        name: soundForm.controls.name.value.trim(),
        parent: { type: "Server", id: props.server.id },
      });
      soundForm.controls.name.setValue("");
      soundForm.controls.file.setValue(null);
      await refetchSounds();
    } catch (e) {
      err(e);
    }
  }

  async function removeSticker(id: string) {
    try {
      await client().api.delete(`/custom/stickers/${id}`);
      await refetchStickers();
    } catch (e) {
      err(e);
    }
  }

  async function removeSound(id: string) {
    try {
      await client().api.delete(`/custom/soundboard/${id}`);
      await refetchSounds();
    } catch (e) {
      err(e);
    }
  }

  return (
    <Column gap="xl">
      <Show
        when={stickersOn()}
        fallback={
          <Text class="label">
            Stickers are disabled for this deployment. Enable{" "}
            <code>stickers_v1</code> in rollout (or your user cohort) to manage
            stickers.
          </Text>
        }
      >
        <Text class="title" size="small">
          Stickers
        </Text>
        <Text class="label" size="small">
          Upload PNG, WebP, or GIF (≤ 2 MB). Used for Discord-style sticker
          slots per server.
        </Text>
        <form onSubmit={addSticker}>
          <Column>
            <Form2.FileInput
              control={stickerForm.controls.file}
              accept="image/*"
              imageJustify={false}
              allowRemoval={false}
            />
            <Form2.TextField
              name="name"
              control={stickerForm.controls.name}
              label="Sticker name"
            />
            <button type="submit">Upload sticker</button>
          </Column>
        </form>
        <Column gap="sm">
          <For each={stickerList() ?? []}>
            {(s) => (
              <Row align justify="space-between">
                <Row align gap="md">
                  <Avatar
                    src={`${CONFIGURATION.DEFAULT_MEDIA_URL}/stickers/${s._id}/original`}
                    size={36}
                  />
                  <Text>{s.name}</Text>
                </Row>
                <Button variant="plain" onPress={() => removeSticker(s._id)}>
                  Remove
                </Button>
              </Row>
            )}
          </For>
        </Column>
      </Show>

      <Show
        when={soundOn()}
        fallback={
          <Text class="label">
            Soundboard is disabled. Enable <code>soundboard_v1</code> in rollout
            to upload short audio clips.
          </Text>
        }
      >
        <Text class="title" size="small">
          Soundboard
        </Text>
        <Text class="label" size="small">
          Upload short audio (≤ 512 KB). Playback in voice UI is upcoming; clips
          are stored and listed here for moderation.
        </Text>
        <form onSubmit={addSound}>
          <Column>
            <Form2.FileInput
              control={soundForm.controls.file}
              accept="audio/*"
              allowRemoval={false}
            />
            <Form2.TextField
              name="name"
              control={soundForm.controls.name}
              label="Clip name"
            />
            <button type="submit">Upload sound</button>
          </Column>
        </form>
        <Column gap="sm">
          <For each={soundList() ?? []}>
            {(s) => (
              <Row align justify="space-between">
                <audio
                  controls
                  src={`${CONFIGURATION.DEFAULT_MEDIA_URL}/soundboard/${s._id}/original`}
                  style={{ "max-width": "240px" }}
                />
                <Text>{s.name}</Text>
                <Button variant="plain" onPress={() => removeSound(s._id)}>
                  Remove
                </Button>
              </Row>
            )}
          </For>
        </Column>
      </Show>
    </Column>
  );
}
