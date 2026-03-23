import { Accessor, JSX, Show } from "solid-js";

import { css, cva } from "styled-system/css";
import { styled } from "styled-system/jsx";

import { Breadcrumbs, IconButton, Text } from "@revolt/ui";

import MdClose from "@material-design-icons/svg/outlined/close.svg?component-solid";

import { SettingsList } from "..";
import { useSettingsNavigation } from "../Settings";

/**
 * Content portion of the settings menu
 */
export function SettingsContent(props: {
  onClose?: () => void;
  children: JSX.Element;
  list: Accessor<SettingsList<unknown>>;
  title: (ctx: SettingsList<never>, key: string) => string;
  page: Accessor<string | undefined>;
}) {
  const { navigate } = useSettingsNavigation();

  return (
    <div
      use:scrollable={{
        class: base(),
      }}
    >
      <Show when={props.page()}>
        <InnerContent>
          <InnerColumn>
            <Text class="title" size="large">
              <Breadcrumbs
                elements={props.page()!.split("/")}
                renderElement={(key) =>
                  props.title(props.list() as SettingsList<never>, key)
                }
                navigate={(keys) => navigate(keys.join("/"))}
              />
            </Text>
            {props.children}
            <div class={css({ minHeight: "80px" })} />
          </InnerColumn>
        </InnerContent>
      </Show>
      <Show when={props.onClose}>
        <CloseAction>
          <IconButton variant="tonal" onPress={props.onClose}>
            <MdClose />
          </IconButton>
        </CloseAction>
      </Show>
    </div>
  );
}

/**
 * Base styles
 */
const base = cva({
  base: {
    minWidth: 0,
    flex: "1 1 800px",
    flexDirection: "row",
    display: "flex",
    background:
      "linear-gradient(145deg, var(--neu-bg-primary), var(--neu-bg-secondary))",
    borderStartStartRadius: "20px",
    borderEndStartRadius: "20px",
    borderLeft: "1px solid var(--line)",
    boxShadow: "var(--neu-shadow-inset)",

    "& > a": {
      textDecoration: "none",
    },
  },
});

/**
 * Settings pane
 */
const InnerContent = styled("div", {
  base: {
    gap: "16px",
    minWidth: 0,
    width: "100%",
    display: "flex",
    maxWidth: "820px",
    padding: "64px 36px",
    justifyContent: "stretch",
    zIndex: 1,
  },
});

/**
 * Pane content column
 */
const InnerColumn = styled("div", {
  base: {
    width: "100%",
    gap: "var(--gap-md)",
    display: "flex",
    flexDirection: "column",
    marginBlockEnd: "40px",
  },
});

/**
 * Positioning for close button
 */
const CloseAction = styled("div", {
  base: {
    flexGrow: 1,
    flexShrink: 0,
    padding: "64px 10px",
    visibility: "visible",
    position: "sticky",
    top: 0,

    "&:after": {
      content: '"ESC"',
      marginTop: "4px",
      display: "flex",
      justifyContent: "center",
      width: "40px",
      fontWeight: 600,
      color: "var(--md-sys-color-on-surface)",
      fontSize: "0.7rem",
    },
  },
});
