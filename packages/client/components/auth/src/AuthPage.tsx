import { BiLogosGithub } from "solid-icons/bi";
import { JSX } from "solid-js";

import { styled } from "styled-system/jsx";

import { Titlebar } from "@revolt/app/interface/desktop/Titlebar";
import { useState } from "@revolt/state";
import { IconButton, iconSize } from "@revolt/ui";

import MdDarkMode from "@material-design-icons/svg/filled/dark_mode.svg?component-solid";

import background from "./background.jpg";
import { FlowBase } from "./flows/Flow";
import bluesky from "./flows/bluesky.svg";

/**
 * Authentication page layout
 */
const Base = styled("div", {
  base: {
    width: "100%",
    height: "100%",
    padding: "32px 30px",

    userSelect: "none",
    overflowY: "scroll",

    color: "var(--ink)",
    background:
      "radial-gradient(950px 520px at 12% -8%, color-mix(in oklab, var(--cyan) 20%, transparent), transparent 60%), radial-gradient(900px 560px at 88% 8%, color-mix(in oklab, var(--mag) 17%, transparent), transparent 62%), linear-gradient(180deg, var(--bg0), var(--bg1))",

    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",

    mdDown: {
      padding: "18px 12px",
    },
  },
});

/**
 * Top and bottom navigation bars
 */
const Nav = styled("div", {
  base: {
    minHeight: "42px",
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    border: "1px solid var(--line)",
    borderRadius: "999px",
    background:
      "linear-gradient(180deg, rgba(10, 14, 26, 0.92), rgba(10, 14, 26, 0.58))",
    padding: "6px 10px",
    backdropFilter: "blur(16px)",

    textDecoration: "none",

    mdDown: {
      minHeight: "44px",
      padding: "6px 8px",
    },
  },
});

/**
 * Navigation items
 */
const NavItems = styled("div", {
  base: {
    gap: "10px",
    display: "flex",
    alignItems: "center",
    fontSize: "0.78rem",
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 700,

    "& a:hover": {
      color: "var(--ink)",
    },

    mdDown: {
      gap: "8px",
      fontSize: "0.68rem",
      letterSpacing: "0.05em",
      flexWrap: "wrap",
      justifyContent: "center",
    },
  },
  variants: {
    variant: {
      default: {},
      stack: {
        md: {
          flexDirection: "column",
        },
      },
      hide: {
        md: {
          display: "none",
        },
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

/**
 * Link with an icon inside
 */
const LinkWithIcon = styled("a", {
  base: { height: "24px" },
});

/**
 * Middot-like bullet
 */
const Bullet = styled("div", {
  base: {
    height: "5px",
    width: "5px",
    background: "var(--line2)",
    borderRadius: "50%",

    md: {
      display: "none",
    },
  },
});

/**
 * Authentication page
 */
export function AuthPage(props: { children: JSX.Element }) {
  const state = useState();

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        height: "100%",
      }}
    >
      <Titlebar />
      <Base
        style={{ "--url": `url('${background}')` }}
        css={{ scrollbar: "hidden" }}
      >
        <Nav>
          <div />
          <IconButton
            variant="tonal"
            onPress={() =>
              state.theme.setMode(
                state.theme.activeTheme.darkMode ? "light" : "dark",
              )
            }
          >
            <MdDarkMode {...iconSize("24px")} />
          </IconButton>
        </Nav>
        <FlowBase>{props.children}</FlowBase>
        <Nav>
          <NavItems variant="stack">
            <NavItems>
              <LinkWithIcon href="https://comm.sanic.one/" target="_blank">
                <BiLogosGithub size={24} />
              </LinkWithIcon>
              <LinkWithIcon
                href="https://sanic.one/support"
                target="_blank"
              >
                <img
                  src={bluesky}
                  style={{ height: "22px", "padding-top": "3px" }}
                />
              </LinkWithIcon>
            </NavItems>
            <Bullet />
            <NavItems>
              <a href="https://sanic.one/about" target="_blank">
                About
              </a>
              <a href="https://sanic.one/support" target="_blank">
                Support
              </a>
              <a href="https://sanic.one/privacy" target="_blank">
                Privacy Policy
              </a>
            </NavItems>
          </NavItems>
          <NavItems variant="hide">
            Image by {"@fakurian"}
            <Bullet />
            <a href="https://unsplash.com/" target="_blank" rel="noreferrer">
              unsplash.com
            </a>
          </NavItems>
        </Nav>
      </Base>
    </div>
  );
}
