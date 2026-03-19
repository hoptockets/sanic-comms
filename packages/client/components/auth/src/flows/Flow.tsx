import { JSX, Show } from "solid-js";

import { defineKeyframes } from "@pandacss/dev";
import { styled } from "styled-system/jsx";

import { Column, Row, Text } from "@revolt/ui";

import envelope from "./envelope.svg";
import wave from "./wave.svg";

/**
 * Container for authentication page flows
 */
export const FlowBase = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-lg)",
    flexGrow: 0,
    background:
      "radial-gradient(700px 420px at 15% 0%, color-mix(in oklab, var(--cyan) 18%, transparent), transparent 62%), linear-gradient(180deg, var(--glass2), var(--glass))",
    color: "var(--ink)",
    width: "440px",
    maxWidth: "calc(100vw - 32px)",
    minHeight: "620px",
    padding: "42px 36px",
    borderRadius: "26px",
    border: "1px solid var(--line)",
    boxShadow: "0 30px 110px rgba(0, 0, 0, 0.55)",
    backdropFilter: "blur(18px)",
    marginTop: "20px",
    marginBottom: "20px",
    justifySelf: "center",
    marginInline: "auto",
    justifyContent: "center",

    "& .title": {
      fontWeight: 800,
      letterSpacing: "0.04em",
    },
    "& .label": {
      color: "var(--muted)",
    },

    mdDown: {
      width: "100%",
      maxWidth: "100%",
      minHeight: "unset",
      padding: "26px 18px",
      borderRadius: "18px",
      gap: "var(--gap-md)",
    },
  },
});

/**
 * Wave animation
 * TODO: I don't think this is how you use it
 */
const WaveAnimation = defineKeyframes({
  fadeIn: {
    "0%": { transform: "rotate(0)" },
    "10%": { transform: "rotate(14deg)" },
    "20%": { transform: "rotate(-8deg)" },
    "30%": { transform: "rotate(14deg)" },
    "40%": { transform: "rotate(-4deg)" },
    "50%": { transform: "rotate(10deg)" },
    "60%": { transform: "rotate(0)" },
    "100%": { transform: "rotate(0)" },
  },
});

/**
 * Envelope animation
 * TODO: I don't think this is how you use it
 */
const EnvelopeAnimation = defineKeyframes({
  fadeIn: {
    "0%": {
      opacity: 0,
      transform: "translateY(-24px)",
    },
    "100%": {
      opacity: 1,
      transform: "translateY(-4px)",
    },
  },
});

/**
 * Wave emoji
 */
const Wave = styled("img", {
  base: {
    height: "1.8em",
    animationDuration: "2.5s",
    animationIterationCount: 1,
    animationName: WaveAnimation,
  },
});

/**
 * Mail emoji
 */
const Mail = styled("img", {
  base: {
    height: "1.8em",
    transform: "translateY(-4px)",
    animationDuration: "0.5s",
    animationIterationCount: 1,
    animationTimingFunction: "ease",
    animationName: EnvelopeAnimation,
  },
});

/**
 * Common flow title component
 */
export function FlowTitle(props: {
  children: JSX.Element;
  subtitle?: JSX.Element;
  emoji?: "wave" | "mail";
}) {
  return (
    <Column>
      <Row align gap="sm">
        <Show when={props.emoji === "wave"}>
          <Wave src={wave} />
        </Show>
        <Show when={props.emoji === "mail"}>
          <Mail src={envelope} />
        </Show>
        <Text class="title" size="large">
          {props.children}
        </Text>
      </Row>
      <Show when={props.subtitle}>
        <Text class="title">{props.subtitle}</Text>
      </Show>
    </Column>
  );
}
