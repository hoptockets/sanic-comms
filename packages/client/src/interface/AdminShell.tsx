import {
  For,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
} from "solid-js";

import { Navigate, useLocation } from "@solidjs/router";

import { patchJsonBody, useClient, useClientLifecycle } from "@revolt/client";
import { useState } from "@revolt/state";

import "../styles/admin-site.css";
import { AdminPanelPage } from "./AdminPanel";

type NavItem = {
  id: string;
  label: string;
  href: string;
  description: string;
};

type UserInspectRecord = {
  id: string;
  username: string;
  discriminator: string;
  display_name?: string;
  privileged: boolean;
  platform_admin_role?: string;
  platform_permissions?: string[];
  badges: number;
  flags: number;
};

type UsersListResponse = {
  users: UserInspectRecord[];
};

type StaffListResponse = {
  users: UserInspectRecord[];
};

type UserRestrictions = {
  user_id: string;
  profile_locked: boolean;
  username_frozen_until?: string;
  display_name_frozen_until?: string;
  media_quarantined: boolean;
  profile_visibility_limited: boolean;
};

type StaffPermissionsCatalog = {
  catalog: string[];
  role_templates: Record<string, string[]>;
};

type SystemFeaturesResponse = {
  emergency_kill_switch: boolean;
  global: Record<string, boolean>;
};

type AuditEntry = {
  timestamp: string;
  actor_id: string;
  action: string;
  target: string;
};

type AuditLogResponse = {
  entries: AuditEntry[];
};

type EmailSystemResponse = {
  smtp_enabled?: boolean;
  smtp_host?: string;
  support_address?: string;
  sender_name?: string;
  reset_base_url?: string;
  require_captcha?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/admin/comms",
    description: "Global health and operational summaries",
  },
  {
    id: "reports",
    label: "Reports & Cases",
    href: "/admin/comms/reports",
    description: "Global moderation queue and review actions",
  },
  {
    id: "users",
    label: "User Operations",
    href: "/admin/comms/users",
    description: "Investigate users and account-level controls",
  },
  {
    id: "staff",
    label: "Staff Management",
    href: "/admin/comms/staff",
    description: "Role scoping, assignment coverage, escalations",
  },
  {
    id: "system",
    label: "System Control",
    href: "/admin/comms/system",
    description: "Service status and platform operations",
  },
];

export function AdminShellPage() {
  const { isLoggedIn } = useClientLifecycle();
  const state = useState();
  const location = useLocation();

  const activeSection = createMemo(() => {
    const path = location.pathname;
    if (path === "/admin/comms" || path === "/admin/comms/") return "overview";
    if (path.startsWith("/admin/comms/reports")) return "reports";
    if (path.startsWith("/admin/comms/users")) return "users";
    if (path.startsWith("/admin/comms/staff")) return "staff";
    if (path.startsWith("/admin/comms/system")) return "system";
    return "overview";
  });

  const pageTitle = createMemo(
    () => NAV_ITEMS.find((item) => item.id === activeSection())?.label ?? "Overview",
  );

  const allowAdmin = createMemo(() =>
    state.capabilities.isEnabled("admin_panel_v1", true),
  );

  return (
    <Show when={isLoggedIn()} fallback={<Navigate href="/login" />}>
      <Show
        when={allowAdmin()}
        fallback={
          <div class="admin-concept admin-gate">
            <div class="cp-card admin-gate-card">
              <div class="cp-card-header">
                <h3>Access denied</h3>
              </div>
              <div class="cp-card-body">
                <p>
                  Your account does not currently have access to the Control
                  Plane.
                </p>
                <a class="cp-link" href="/">
                  Return to app
                </a>
              </div>
            </div>
          </div>
        }
      >
        <div class="admin-concept dashboard-main-wrapper">
          <header class="dashboard-header">
        <div class="cp-header-inner">
          <a class="cp-brand" href="/admin/comms">
            .Comms Control Plane
          </a>
          <div class="cp-header-meta">Employee operations workspace</div>
          <div class="cp-chip">Panel v1</div>
        </div>
      </header>

      <aside class="nav-left-sidebar sidebar-dark">
        <div class="menu-list">
          <div class="cp-nav-divider">Navigation</div>
          <nav class="cp-nav-list">
            <For each={NAV_ITEMS}>
              {(item) => (
                <a
                  href={item.href}
                  class={
                    item.id === activeSection()
                      ? "cp-nav-link active"
                      : "cp-nav-link"
                  }
                >
                  <span class="cp-nav-link-title">{item.label}</span>
                  <span class="cp-nav-link-desc">{item.description}</span>
                </a>
              )}
            </For>
          </nav>
        </div>
      </aside>

      <main class="dashboard-wrapper">
        <div class="dashboard-content" id="main-content">
          <div class="container-fluid">
            <div class="page-header">
              <h1 class="pageheader-title">{pageTitle()}</h1>
              <p class="pageheader-text">
                First-party moderation and platform governance tooling.
              </p>
            </div>

            <Show when={activeSection() === "overview"}>
              <AdminOverviewSection />
            </Show>
            <Show when={activeSection() === "reports"}>
              <AdminPanelPage />
            </Show>
            <Show when={activeSection() === "users"}>
              <UsersOpsSection />
            </Show>
            <Show when={activeSection() === "staff"}>
              <StaffOpsSection />
            </Show>
            <Show when={activeSection() === "system"}>
              <SystemOpsSection />
            </Show>
          </div>
        </div>
          </main>
        </div>
      </Show>
    </Show>
  );
}

function AdminOverviewSection() {
  return (
    <section class="cp-section-stack">
      <div class="cp-grid-3">
        <PanelCard
          title="Moderation Queue"
          value="Live feed connected"
          subtext="Track report backlog and escalations in real time."
        />
        <PanelCard
          title="Staff Coverage"
          value="Role-scoped assignments"
          subtext="Queue ownership and workload balancing by team."
        />
        <PanelCard
          title="Platform Health"
          value="Service telemetry"
          subtext="Visibility into API, events, and subsystem status."
        />
      </div>

      <div class="cp-card">
        <div class="cp-card-header">
          <h3>Operational priorities</h3>
        </div>
        <div class="cp-table-wrap">
          <table class="cp-table cp-table-hover">
            <thead>
              <tr>
                <th>Stream</th>
                <th>Description</th>
                <th>Status</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Report lifecycle</td>
                <td>Assignment, in-review, escalation workflows</td>
                <td>In progress</td>
                <td>Expand case detail and evidence viewer</td>
              </tr>
              <tr>
                <td>User inspect</td>
                <td>Cross-case context and account controls</td>
                <td>Queued</td>
                <td>Add user timeline and moderation history</td>
              </tr>
              <tr>
                <td>Staff governance</td>
                <td>Roles, scopes, and auditability</td>
                <td>Queued</td>
                <td>Ship role policy editor and audit log</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function UsersOpsSection() {
  const client = useClient();
  const location = useLocation();
  const [query, setQuery] = createSignal("");
  const [selectedUserId, setSelectedUserId] = createSignal("");
  const [resetEmail, setResetEmail] = createSignal("");
  const [resetCaptcha, setResetCaptcha] = createSignal("");
  const [flagSuspended, setFlagSuspended] = createSignal(false);
  const [flagDeleted, setFlagDeleted] = createSignal(false);
  const [flagBanned, setFlagBanned] = createSignal(false);
  const [nameplate, setNameplate] = createSignal("");
  const [roleColour, setRoleColour] = createSignal("");
  const [profileFont, setProfileFont] = createSignal("");
  const [profileAnimation, setProfileAnimation] = createSignal("");
  const [profileLocked, setProfileLocked] = createSignal(false);
  const [usernameFrozenUntil, setUsernameFrozenUntil] = createSignal("");
  const [displayNameFrozenUntil, setDisplayNameFrozenUntil] = createSignal("");
  const [mediaQuarantined, setMediaQuarantined] = createSignal(false);
  const [profileVisibilityLimited, setProfileVisibilityLimited] = createSignal(false);

  const [users, { refetch: refetchUsers }] = createResource(query, async (q) => {
    const suffix = q.trim()
      ? `/safety/users?q=${encodeURIComponent(q.trim())}&limit=150`
      : "/safety/users?limit=150";
    return (await client().api.get(suffix)) as UsersListResponse;
  });

  const [inspected, { refetch }] = createResource(async () => {
    const id = selectedUserId().trim();
    if (!id) return undefined;
    return (await client().api.get(`/safety/users/${id}`)) as UserInspectRecord;
  });

  const [restrictions, { refetch: refetchRestrictions }] = createResource<
    UserRestrictions | undefined
  >(selectedUserId, async (id) => {
    if (!id.trim()) return undefined;
    return (await client().api.get(`/safety/users/${id}/restrictions`)) as UserRestrictions;
  });

  createEffect(() => {
    const current = inspected();
    if (!current) return;
    const bits = Number(current.flags ?? 0);
    setFlagSuspended((bits & 1) !== 0);
    setFlagDeleted((bits & 2) !== 0);
    setFlagBanned((bits & 4) !== 0);
    const cosmetics = (current as { profile?: { cosmetics?: Record<string, string> } }).profile
      ?.cosmetics;
    setNameplate(cosmetics?.nameplate ?? "");
    setRoleColour(cosmetics?.role_colour ?? "");
    setProfileFont(cosmetics?.font ?? "");
    setProfileAnimation(cosmetics?.animation ?? "");
  });

  createEffect(() => {
    const target = new URLSearchParams(location.search).get("target")?.trim();
    if (!target || target === selectedUserId()) return;
    setSelectedUserId(target);
    void refetch();
  });

  createEffect(() => {
    const current = restrictions();
    if (!current) return;
    setProfileLocked(Boolean(current.profile_locked));
    setUsernameFrozenUntil(current.username_frozen_until ?? "");
    setDisplayNameFrozenUntil(current.display_name_frozen_until ?? "");
    setMediaQuarantined(Boolean(current.media_quarantined));
    setProfileVisibilityLimited(Boolean(current.profile_visibility_limited));
  });

  async function updateFlags() {
    const record = inspected();
    if (!record?.id) return;
    const nextFlags =
      (flagSuspended() ? 1 : 0) |
      (flagDeleted() ? 2 : 0) |
      (flagBanned() ? 4 : 0);

    await patchJsonBody(client().api, `/safety/users/${record.id}/flags`, {
      flags: nextFlags,
    });
    await refetch();
  }

  async function sendPasswordResetEmail() {
    const email = resetEmail().trim();
    if (!email) return;
    await client().api.post("/auth/account/reset_password", {
      email,
      captcha: resetCaptcha().trim() || null,
    });
  }

  async function updateCosmetics() {
    const record = inspected();
    if (!record?.id) return;
    await patchJsonBody(client().api, `/safety/users/${record.id}/cosmetics`, {
      nameplate: nameplate().trim() || null,
      role_colour: roleColour().trim() || null,
      font: profileFont().trim() || null,
      animation: profileAnimation().trim() || null,
    });
    await refetch();
  }

  async function updateRestrictions() {
    const record = inspected();
    if (!record?.id) return;
    await patchJsonBody(client().api, `/safety/users/${record.id}/restrictions`, {
      profile_locked: profileLocked(),
      username_frozen_until: usernameFrozenUntil().trim() || null,
      display_name_frozen_until: displayNameFrozenUntil().trim() || null,
      media_quarantined: mediaQuarantined(),
      profile_visibility_limited: profileVisibilityLimited(),
    });
    await refetchRestrictions();
  }

  return (
    <section class="cp-section-stack">
      <p class="cp-page-note">Live user directory with account-level moderation controls.</p>

      <div class="cp-toolbar">
        <input
          class="cp-input"
          value={query()}
          placeholder="Search username, display name, or id"
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
        <button class="cp-btn cp-btn-outline" onClick={() => refetchUsers()}>
          Refresh users
        </button>
      </div>

      <div class="cp-card">
        <div class="cp-card-header">
          <h3>User directory</h3>
        </div>
        <div class="cp-table-wrap">
          <table class="cp-table cp-table-hover">
            <thead>
              <tr>
                <th>User</th>
                <th>Display</th>
                <th>Role</th>
                <th>Badges</th>
                <th>Flags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <For each={users()?.users ?? []}>
                {(item) => (
                  <tr>
                    <td>{item.username}#{item.discriminator}</td>
                    <td>{item.display_name ?? "N/A"}</td>
                    <td>{item.platform_admin_role ?? "User"}</td>
                    <td>{item.badges}</td>
                    <td>{item.flags ?? 0}</td>
                    <td>
                      <button
                        class="cp-btn cp-btn-outline"
                        onClick={async () => {
                          setSelectedUserId(item.id);
                          await refetch();
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>

      <Show when={inspected()}>
        {(record) => (
          <div class="cp-card">
            <div class="cp-card-header">
              <h3>User record</h3>
            </div>
            <div class="cp-card-body cp-detail-grid">
              <div><span class="cp-field-label">ID</span><div class="cp-mono">{record().id}</div></div>
              <div><span class="cp-field-label">Username</span><div>{record().username}#{record().discriminator}</div></div>
              <div><span class="cp-field-label">Display name</span><div>{record().display_name ?? "N/A"}</div></div>
              <div><span class="cp-field-label">Platform role</span><div>{record().platform_admin_role ?? "None"}</div></div>
              <div><span class="cp-field-label">Badges</span><div>{record().badges ?? 0}</div></div>
              <div><span class="cp-field-label">Flags</span><div>{record().flags ?? 0}</div></div>
              <div class="cp-detail-span2">
                <span class="cp-field-label">Feature grants</span>
                <div>{(record().platform_permissions ?? []).join(", ") || "None"}</div>
              </div>

              <div class="cp-detail-span2 cp-block-group">
                <h4>Account state</h4>
                <div class="cp-inline-checks">
                  <label class="cp-check"><input type="checkbox" checked={flagSuspended()} onInput={(event) => setFlagSuspended(event.currentTarget.checked)} />Suspended</label>
                  <label class="cp-check"><input type="checkbox" checked={flagDeleted()} onInput={(event) => setFlagDeleted(event.currentTarget.checked)} />Deleted</label>
                  <label class="cp-check"><input type="checkbox" checked={flagBanned()} onInput={(event) => setFlagBanned(event.currentTarget.checked)} />Banned</label>
                  <button class="cp-btn cp-btn-primary" onClick={updateFlags}>Apply flags</button>
                </div>
              </div>

              <div class="cp-detail-span2 cp-block-group">
                <h4>Password recovery</h4>
                <div class="cp-toolbar">
                  <input
                    class="cp-input"
                    value={resetEmail()}
                    placeholder="Target account email"
                    onInput={(event) => setResetEmail(event.currentTarget.value)}
                  />
                  <input
                    class="cp-input"
                    value={resetCaptcha()}
                    placeholder="Captcha token (optional)"
                    onInput={(event) => setResetCaptcha(event.currentTarget.value)}
                  />
                  <button class="cp-btn cp-btn-outline" onClick={sendPasswordResetEmail}>
                    Send reset email
                  </button>
                </div>
              </div>

              <div class="cp-detail-span2 cp-block-group">
                <h4>Cosmetics &amp; identity controls</h4>
                <div class="cp-toolbar">
                  <input
                    class="cp-input"
                    value={nameplate()}
                    placeholder="Nameplate"
                    onInput={(event) => setNameplate(event.currentTarget.value)}
                  />
                  <input
                    class="cp-input"
                    value={roleColour()}
                    placeholder="Role colour (hex)"
                    onInput={(event) => setRoleColour(event.currentTarget.value)}
                  />
                  <input
                    class="cp-input"
                    value={profileFont()}
                    placeholder="Font key"
                    onInput={(event) => setProfileFont(event.currentTarget.value)}
                  />
                  <input
                    class="cp-input"
                    value={profileAnimation()}
                    placeholder="Animation key"
                    onInput={(event) => setProfileAnimation(event.currentTarget.value)}
                  />
                  <button class="cp-btn cp-btn-primary" onClick={updateCosmetics}>
                    Save cosmetics
                  </button>
                </div>
              </div>

              <div class="cp-detail-span2 cp-block-group">
                <h4>Restrictions &amp; enforcement</h4>
                <div class="cp-inline-checks">
                  <label class="cp-check">
                    <input
                      type="checkbox"
                      checked={profileLocked()}
                      onInput={(event) => setProfileLocked(event.currentTarget.checked)}
                    />
                    Profile locked
                  </label>
                  <label class="cp-check">
                    <input
                      type="checkbox"
                      checked={mediaQuarantined()}
                      onInput={(event) => setMediaQuarantined(event.currentTarget.checked)}
                    />
                    Media quarantined
                  </label>
                  <label class="cp-check">
                    <input
                      type="checkbox"
                      checked={profileVisibilityLimited()}
                      onInput={(event) =>
                        setProfileVisibilityLimited(event.currentTarget.checked)
                      }
                    />
                    Profile visibility limited
                  </label>
                </div>
                <div class="cp-toolbar">
                  <input
                    class="cp-input"
                    value={usernameFrozenUntil()}
                    placeholder="Username frozen until (RFC3339)"
                    onInput={(event) => setUsernameFrozenUntil(event.currentTarget.value)}
                  />
                  <input
                    class="cp-input"
                    value={displayNameFrozenUntil()}
                    placeholder="Display name frozen until (RFC3339)"
                    onInput={(event) => setDisplayNameFrozenUntil(event.currentTarget.value)}
                  />
                  <button class="cp-btn cp-btn-danger" onClick={updateRestrictions}>
                    Apply restrictions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>
    </section>
  );
}

function StaffOpsSection() {
  const client = useClient();
  const [query, setQuery] = createSignal("");
  const [targetId, setTargetId] = createSignal("");
  const [role, setRole] = createSignal("SupportAgent");
  const [featureGrant, setFeatureGrant] = createSignal("");
  const [selectedPermissions, setSelectedPermissions] = createSignal<string[]>([]);

  const [staffList, { refetch }] = createResource(query, async (q) => {
    const suffix = q.trim()
      ? `/safety/staff?q=${encodeURIComponent(q.trim())}&limit=200`
      : "/safety/staff?limit=200";
    return (await client().api.get(suffix)) as StaffListResponse;
  });

  const [permissionsCatalog] = createResource(async () => {
    return (await client().api.get(
      "/safety/staff/permissions/catalog",
    )) as StaffPermissionsCatalog;
  });

  async function assignRole() {
    const featureGrants = featureGrant()
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => (value.startsWith("feature:") ? value : `feature:${value}`));

    const grants = [...selectedPermissions(), ...featureGrants];

    await patchJsonBody(client().api, `/safety/staff/${targetId().trim()}`, {
      platform_admin_role: role(),
      platform_permissions: grants,
    });

    await refetch();
  }

  function togglePermission(permission: string, enabled: boolean) {
    setSelectedPermissions((current) => {
      const set = new Set(current);
      if (enabled) {
        set.add(permission);
      } else {
        set.delete(permission);
      }
      return Array.from(set);
    });
  }

  return (
    <section class="cp-section-stack">
      <p class="cp-page-note">Live staff directory with role assignment and scoped rollout grants.</p>

      <div class="cp-toolbar">
        <input
          class="cp-input"
          value={query()}
          placeholder="Search staff by username, display name, or id"
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
        <button class="cp-btn cp-btn-outline" onClick={() => refetch()}>
          Load staff
        </button>
      </div>

      <div class="cp-toolbar">
        <input
          class="cp-input"
          value={targetId()}
          placeholder="Target user ID"
          onInput={(event) => setTargetId(event.currentTarget.value)}
        />
        <select
          class="cp-select"
          value={role()}
          onInput={(event) => setRole(event.currentTarget.value)}
        >
          <option value="PlatformOwner">PlatformOwner</option>
          <option value="SafetyAdmin">SafetyAdmin</option>
          <option value="SupportAgent">SupportAgent</option>
          <option value="Analyst">Analyst</option>
        </select>
        <input
          class="cp-input"
          value={featureGrant()}
          placeholder="Feature grants (comma-separated)"
          onInput={(event) => setFeatureGrant(event.currentTarget.value)}
        />
        <button
          class="cp-btn cp-btn-outline"
          onClick={() => {
            const template = permissionsCatalog()?.role_templates?.[role()] ?? [];
            setSelectedPermissions(template.filter((value) => !value.startsWith("feature:")));
          }}
        >
          Load role template
        </button>
        <button class="cp-btn cp-btn-primary" onClick={assignRole}>
          Assign
        </button>
      </div>

      <Show when={permissionsCatalog()}>
        <div class="cp-card">
          <div class="cp-card-header">
            <h3>Permission matrix</h3>
          </div>
          <div class="cp-card-body">
            <div class="cp-inline-checks">
              <For each={permissionsCatalog()!.catalog.filter((value) => !value.startsWith("feature:"))}>
                {(perm) => (
                  <label class="cp-check">
                    <input
                      type="checkbox"
                      checked={selectedPermissions().includes(perm)}
                      onInput={(event) => togglePermission(perm, event.currentTarget.checked)}
                    />
                    {perm}
                  </label>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      <div class="cp-card">
        <div class="cp-card-header">
          <h3>Staff records</h3>
        </div>
        <div class="cp-table-wrap">
          <table class="cp-table cp-table-hover">
            <thead>
              <tr>
                <th>Username</th>
                <th>Display</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <For each={staffList()?.users ?? []}>
                {(item) => (
                  <tr>
                    <td>{item.username}#{item.discriminator}</td>
                    <td>{item.display_name ?? "N/A"}</td>
                    <td>{item.platform_admin_role ?? "None"}</td>
                    <td>{(item.platform_permissions ?? []).join(", ") || "None"}</td>
                    <td>
                      <button
                        class="cp-btn cp-btn-outline"
                        onClick={() => {
                          setTargetId(item.id);
                          setRole(item.platform_admin_role ?? "SupportAgent");
                          setSelectedPermissions(
                            (item.platform_permissions ?? []).filter(
                              (value) => !value.startsWith("feature:"),
                            ),
                          );
                          setFeatureGrant(
                            (item.platform_permissions ?? [])
                              .map((value) =>
                                value.startsWith("feature:")
                                  ? value.slice("feature:".length)
                                  : value,
                              )
                              .join(","),
                          );
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SystemOpsSection() {
  const client = useClient();
  const state = useState();
  const [feature, setFeature] = createSignal("profile_v3");
  const [enabled, setEnabled] = createSignal(true);
  const [supportAddress, setSupportAddress] = createSignal("");
  const [senderName, setSenderName] = createSignal("");
  const [resetBaseUrl, setResetBaseUrl] = createSignal("");
  const [requireCaptcha, setRequireCaptcha] = createSignal(false);

  const [system, { refetch }] = createResource(async () => {
    return (await client().api.get("/safety/system/features")) as SystemFeaturesResponse;
  });

  const [auditLog, { refetch: refetchAudit }] = createResource(async () => {
    return (await client().api.get("/safety/audit")) as AuditLogResponse;
  });

  const [emailSystem, { refetch: refetchEmail }] = createResource(async () => {
    return (await client().api.get("/safety/system/email")) as EmailSystemResponse;
  });

  createEffect(() => {
    const cfg = emailSystem();
    if (!cfg) return;
    setSupportAddress(cfg.support_address ?? "");
    setSenderName(cfg.sender_name ?? "");
    setResetBaseUrl(cfg.reset_base_url ?? "");
    setRequireCaptcha(Boolean(cfg.require_captcha));
  });

  async function setFeatureToggle() {
    await patchJsonBody(client().api, "/safety/system/features", {
      feature: feature(),
      enabled: enabled(),
    });
    await refetch();
    await refetchAudit();
  }

  async function setKillSwitch(next: boolean) {
    await patchJsonBody(client().api, "/safety/system/kill-switch", {
      enabled: next,
    });
    await refetch();
    await refetchAudit();
    state.capabilities.refresh(client());
  }

  async function updateEmailSystem() {
    await patchJsonBody(client().api, "/safety/system/email", {
      support_address: supportAddress().trim(),
      sender_name: senderName().trim(),
      reset_base_url: resetBaseUrl().trim(),
      require_captcha: requireCaptcha(),
    });
    await refetchEmail();
    await refetchAudit();
  }

  return (
    <section class="cp-section-stack">
      <p class="cp-page-note">Runtime feature rollout and emergency controls.</p>

      <div class="cp-toolbar">
        <input
          class="cp-input"
          value={feature()}
          placeholder="Feature key"
          onInput={(event) => setFeature(event.currentTarget.value)}
        />
        <select
          class="cp-select"
          value={enabled() ? "enabled" : "disabled"}
          onInput={(event) => setEnabled(event.currentTarget.value === "enabled")}
        >
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
        <button class="cp-btn cp-btn-primary" onClick={setFeatureToggle}>
          Apply toggle
        </button>
      </div>

      <div class="cp-toolbar">
        <button class="cp-btn cp-btn-danger" onClick={() => setKillSwitch(true)}>
          Enable kill switch
        </button>
        <button class="cp-btn cp-btn-outline" onClick={() => setKillSwitch(false)}>
          Disable kill switch
        </button>
      </div>

      <Show when={system()}>
        {(sys) => (
          <div class="cp-card">
            <div class="cp-card-header">
              <h3>System flags</h3>
            </div>
            <div class="cp-card-body cp-section-stack">
              <p>
                Emergency Kill Switch: <strong>{sys().emergency_kill_switch ? "ENABLED" : "disabled"}</strong>
              </p>
              <div>
                <h4 class="cp-subheading">Global feature matrix</h4>
                <ul class="cp-list">
                  <For each={Object.entries(sys().global ?? {})}>
                    {(entry) => (
                      <li>
                        <span class="cp-mono">{entry[0]}</span>: {entry[1] ? "enabled" : "disabled"}
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </div>
          </div>
        )}
      </Show>

      <Show when={auditLog()}>
        {(log) => (
          <div class="cp-card">
            <div class="cp-card-header">
              <h3>Recent admin audit</h3>
            </div>
            <div class="cp-table-wrap">
              <table class="cp-table cp-table-hover">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={log().entries ?? []}>
                    {(entry) => (
                      <tr>
                        <td>{entry.timestamp}</td>
                        <td class="cp-mono">{entry.actor_id}</td>
                        <td>{entry.action}</td>
                        <td class="cp-mono">{entry.target}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Show>

      <div class="cp-card">
        <div class="cp-card-header">
          <h3>Email system</h3>
        </div>
        <div class="cp-card-body cp-section-stack">
          <Show when={emailSystem()}>
            {(cfg) => (
              <p>
                SMTP: {cfg().smtp_enabled ? "enabled" : "disabled"} ({cfg().smtp_host ?? "unknown"})
              </p>
            )}
          </Show>

          <div class="cp-toolbar">
            <input
              class="cp-input"
              value={supportAddress()}
              placeholder="Support address"
              onInput={(event) => setSupportAddress(event.currentTarget.value)}
            />
            <input
              class="cp-input"
              value={senderName()}
              placeholder="Sender name"
              onInput={(event) => setSenderName(event.currentTarget.value)}
            />
            <input
              class="cp-input"
              value={resetBaseUrl()}
              placeholder="Reset base URL"
              onInput={(event) => setResetBaseUrl(event.currentTarget.value)}
            />
          </div>

          <div class="cp-toolbar">
            <label class="cp-check">
              <input
                type="checkbox"
                checked={requireCaptcha()}
                onInput={(event) => setRequireCaptcha(event.currentTarget.checked)}
              />
              Require captcha for reset requests
            </label>
            <button class="cp-btn cp-btn-primary" onClick={updateEmailSystem}>
              Save email settings
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PanelCard(props: { title: string; value: string; subtext: string }) {
  return (
    <div class="cp-card cp-metric-card">
      <div class="cp-card-body">
        <p class="cp-metric-label">{props.title}</p>
        <p class="cp-metric-value">{props.value}</p>
        <p class="cp-metric-subtext">{props.subtext}</p>
      </div>
    </div>
  );
}
