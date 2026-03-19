import { Match, Show, Switch } from "solid-js";

import { css } from "styled-system/css";

import { useClientLifecycle } from "@revolt/client";
import { TransitionType } from "@revolt/client/Controller";
import { Navigate } from "@revolt/routing";
import { Button, Column } from "@revolt/ui";

import { useState } from "@revolt/state";

/**
 * Flow for logging into an account
 */
export default function FlowHome() {
  const state = useState();
  const { lifecycle, isLoggedIn, isError } = useClientLifecycle();

  return (
    <Switch
      fallback={
        <>
          <Show when={isLoggedIn()}>
            <Navigate href={state.layout.popNextPath() ?? "/app"} />
          </Show>

          <Column gap="xl">
            <h1
              class={css({
                margin: "0 auto",
                fontFamily: "Montserrat, Inter, sans-serif",
                fontWeight: 800,
                letterSpacing: "0.04em",
                fontSize: "clamp(2.1rem, 7vw, 3rem)",
                lineHeight: 1,
                color: "var(--ink)",
                textAlign: "center",
              })}
            >
              .Comms
            </h1>
            <span
              class={css({
                textAlign: "center",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontSize: "0.72rem",
                color: "var(--muted2)",
                marginTop: "-8px",
              })}
            >
              comm.sanic.one
            </span>

            <Column>
              <b
                style={{
                  "font-weight": 800,
                  "font-size": "1.4em",
                  display: "flex",
                  "flex-direction": "column",
                  "align-items": "center",
                  "text-align": "center",
                }}
              >
                <span>
                  Find your com
                  <wbr />
                  munity,
                  <br />
                  connect with the world.
                </span>
              </b>
              <span style={{ "text-align": "center", opacity: "0.5" }}>
                .Comms keeps your teams and communities connected with fast,
                reliable chat.
              </span>
            </Column>

            <Column>
              <a href="/login/auth">
                <Column>
                  <Button>Log In</Button>
                </Column>
              </a>
              <a href="/login/create">
                <Column>
                  <Button variant="tonal">Sign Up</Button>
                </Column>
              </a>
            </Column>
          </Column>
        </>
      }
    >
      <Match when={isError()}>
        <Switch fallback={"an unknown error occurred"}>
          <Match when={lifecycle.permanentError === "InvalidSession"}>
            <h1>You were logged out!</h1>
          </Match>
        </Switch>

        <Button
          variant="filled"
          onPress={() =>
            lifecycle.transition({
              type: TransitionType.Dismiss,
            })
          }
        >OK</Button>
      </Match>
    </Switch>
  );
}
