import {
  For,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
} from "solid-js";

import { patchJsonBody, useClient } from "@revolt/client";
import { useState } from "@revolt/state";

type Dashboard = {
  total: number;
  created: number;
  in_review: number;
  escalated: number;
  resolved: number;
  rejected: number;
};

type ErrorResponse = {
  error: string;
};

type DashboardOrError = Dashboard | ErrorResponse;

type ReportStatus = "Created" | "InReview" | "Escalated" | "Resolved" | "Rejected";
type ReportSeverity = "Low" | "Medium" | "High" | "Critical";
type ReportPriority = "Low" | "Normal" | "High" | "Urgent";

type ReportContext =
  | {
      type: "Message";
      message_id: string;
      channel_id?: string;
      server_id?: string;
      attachment_count?: number;
    }
  | {
      type: "Server";
      server_id: string;
      owner_id?: string;
    }
  | {
      type: "User";
      user_id: string;
      linked_message_id?: string;
    };

type ReportItem = {
  _id: string;
  author_id: string;
  status: ReportStatus;
  content: { type: string; id: string };
  severity?: ReportSeverity;
  priority?: ReportPriority;
  risk_score?: number;
  confidence_score?: number;
  additional_context?: string;
  report_context?: ReportContext;
  reporter_metadata?: {
    client_platform?: string;
    locale?: string;
    app_version?: string;
    network_fingerprint_hash?: string;
  };
  related_report_ids?: string[];
  created_at?: string;
  updated_at?: string;
  last_transition_at?: string;
  resolved_at?: string;
  notes?: string;
  assignee_id?: string;
  reviewer_id?: string;
};

type ReportsResponse = {
  reports: ReportItem[];
  total?: number;
};

type ReportTimelineResponse = {
  report_id: string;
  entries: Array<{
    id: string;
    timestamp: string;
    actor_id: string;
    action: string;
    target: string;
    metadata: Record<string, string>;
  }>;
};

type ReportSnapshotsResponse = {
  report_id: string;
  snapshots: Array<{ _id?: string; id?: string; content: unknown }>;
};

type ReportsOrError = ReportsResponse | ErrorResponse;

export function AdminPanelPage() {
  const client = useClient();
  const state = useState();
  const [statusFilter, setStatusFilter] = createSignal("All");
  const [severityFilter, setSeverityFilter] = createSignal("All");
  const [priorityFilter, setPriorityFilter] = createSignal("All");
  const [sortFilter, setSortFilter] = createSignal("newest");
  const [selectedReport, setSelectedReport] = createSignal<ReportItem>();
  const [caseNotes, setCaseNotes] = createSignal("");
  const [assigneeId, setAssigneeId] = createSignal("");
  const [workflowAction, setWorkflowAction] = createSignal("ack");
  const [workflowReason, setWorkflowReason] = createSignal("");
  const [mergeInto, setMergeInto] = createSignal("");
  const [actionError, setActionError] = createSignal<string | undefined>();

  function resolveReportTarget(report: ReportItem): {
    title: string;
    subtitle?: string;
    viewHref?: string;
    viewLabel?: string;
  } {
    const { type, id } = report.content;
    const context = report.report_context;

    if (type === "Server") {
      const server = client().servers.get(id);
      return {
        title: server?.name ?? "Unknown server",
        subtitle: id,
        viewHref: `/server/${id}`,
        viewLabel: "View server",
      };
    }

    if (type === "User") {
      const user = client().users.get(id);
      const display =
        user?.displayName ??
        (user ? `${user.username}#${user.discriminator}` : "Unknown user");
      return {
        title: display,
        subtitle: id,
        viewHref: `/admin/comms/users?target=${encodeURIComponent(id)}`,
        viewLabel: "View user",
      };
    }

    if (type === "Message") {
      const message = client().messages.get(id);
      const author =
        message?.author?.displayName ??
        (message?.author
          ? `${message.author.username}#${message.author.discriminator}`
          : "Unknown author");

      const fromContext =
        context?.type === "Message" && context.channel_id
          ? context.server_id
            ? `/server/${context.server_id}/channel/${context.channel_id}`
            : `/channel/${context.channel_id}`
          : undefined;

      return {
        title: `Message from ${author}`,
        subtitle: id,
        viewHref: fromContext,
        viewLabel: fromContext ? "View message" : undefined,
      };
    }

    return { title: id };
  }

  createEffect(() => {
    const sel = selectedReport();
    setCaseNotes(sel?.notes ?? "");
    setAssigneeId(sel?.assignee_id ?? "");
  });

  const [dashboard, { refetch: refetchDashboard }] = createResource<DashboardOrError>(
    async () => {
      try {
        return (await client().api.get("/safety/reports/dashboard")) as Dashboard;
      } catch (e) {
        return { error: (e as Error).message ?? String(e) };
      }
    },
  );

  const [reports, { refetch: refetchReports }] = createResource<ReportsOrError>(
    () => ({
      status: statusFilter(),
      severity: severityFilter(),
      priority: priorityFilter(),
      sort: sortFilter(),
    }),
    async (filters) => {
      try {
        const params = new URLSearchParams();
        if (filters.status && filters.status !== "All") {
          params.set("status", filters.status);
        }
        if (filters.severity && filters.severity !== "All") {
          params.set("severity", filters.severity);
        }
        if (filters.priority && filters.priority !== "All") {
          params.set("priority", filters.priority);
        }
        if (filters.sort) {
          params.set("sort", filters.sort);
        }
        const suffix = params.size ? `/safety/reports?${params.toString()}` : "/safety/reports";
        return (await client().api.get(suffix)) as ReportsResponse;
      } catch (e) {
        return { error: (e as Error).message ?? String(e) };
      }
    },
  );

  const enabled = () =>
    state.capabilities.isEnabled(
      "admin_panel_v1",
      state.settings.getValue("features:admin_panel_v1"),
    );

  const hasEmployeeAccess = createMemo(() => {
    const me = client().user;
    if (!me) return false;
    const employeeBadgeBits = 2048 | 4096;
    return me.privileged || (me.badges & employeeBadgeBits) !== 0;
  });

  const allowAccess = () => enabled() || hasEmployeeAccess();

  const dashboardError = createMemo(() => {
    const value = dashboard();
    return value && "error" in value ? value.error : undefined;
  });

  const reportsError = createMemo(() => {
    const value = reports();
    return value && "error" in value ? value.error : undefined;
  });

  const totalReports = createMemo(() => {
    const value = dashboard();
    return value && "total" in value ? value.total : 0;
  });

  const reportItems = createMemo<ReportItem[]>(() => {
    const value = reports();
    if (!value || "error" in value) return [];
    return value.reports;
  });
  const totalFromQueue = createMemo(() => {
    const value = reports();
    if (!value || "error" in value) return 0;
    return value.total ?? value.reports.length;
  });

  const [timeline] = createResource<ReportTimelineResponse | undefined, string | undefined>(
    () => selectedReport()?._id,
    async (id) => {
      if (!id) return undefined;
      return (await client().api.get(`/safety/reports/${id}/timeline`)) as ReportTimelineResponse;
    },
  );

  const [snapshots] = createResource<ReportSnapshotsResponse | undefined, string | undefined>(
    () => selectedReport()?._id,
    async (id) => {
      if (!id) return undefined;
      return (await client().api.get(`/safety/reports/${id}/snapshots`)) as ReportSnapshotsResponse;
    },
  );

  const refresh = async () => {
    await Promise.all([refetchDashboard(), refetchReports()]);
  };

  async function updateReportStatus(reportId: string, status: Exclude<ReportStatus, "Created">) {
    setActionError(undefined);
    try {
      await patchJsonBody(client().api, `/safety/reports/${reportId}`, {
        status,
        ...(caseNotes().trim() ? { notes: caseNotes().trim() } : {}),
        ...(assigneeId().trim() ? { assignee_id: assigneeId().trim() } : {}),
        ...(status === "Rejected"
          ? { rejection_reason: "Rejected by control-plane staff." }
          : {}),
      });
      await refresh();
    } catch (e) {
      setActionError((e as Error)?.message ?? String(e));
    }
  }

  async function saveCaseMetadata() {
    const sel = selectedReport();
    if (!sel) return;
    setActionError(undefined);

    try {
      await patchJsonBody(client().api, `/safety/reports/${sel._id}`, {
        status: sel.status,
        ...(caseNotes().trim() ? { notes: caseNotes().trim() } : {}),
        ...(assigneeId().trim() ? { assignee_id: assigneeId().trim() } : {}),
      });
      await refresh();
    } catch (e) {
      setActionError((e as Error)?.message ?? String(e));
    }
  }

  async function runWorkflowAction() {
    const report = selectedReport();
    if (!report) return;
    setActionError(undefined);
    try {
      await client().api.post(`/safety/reports/${report._id}/actions`, {
        action: workflowAction(),
        reason: workflowReason().trim() || undefined,
        assignee_id: assigneeId().trim() || undefined,
        merge_into: mergeInto().trim() || undefined,
      });
      setWorkflowReason("");
      setMergeInto("");
      await refresh();
    } catch (e) {
      setActionError((e as Error)?.message ?? String(e));
    }
  }

  return (
    <section class="cp-section-stack">
      <div class="cp-section-heading">
        <h2>Reports &amp; Cases</h2>
        <p>Global moderation queue and review actions.</p>
      </div>

      <Show
        when={allowAccess()}
        fallback={
          <div class="cp-alert cp-alert-warning">
            Enable <code>features:admin_panel_v1</code> in advanced settings to access this dashboard.
          </div>
        }
      >
        <div class="cp-toolbar">
          <label class="cp-inline-field" for="report-status-filter">
            Status
          </label>
          <select
            id="report-status-filter"
            class="cp-select"
            value={statusFilter()}
            onInput={(event) => setStatusFilter(event.currentTarget.value)}
          >
            <option value="All">All</option>
            <option value="Created">Created</option>
            <option value="InReview">InReview</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select
            class="cp-select"
            value={severityFilter()}
            onInput={(event) => setSeverityFilter(event.currentTarget.value)}
          >
            <option value="All">All severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <select
            class="cp-select"
            value={priorityFilter()}
            onInput={(event) => setPriorityFilter(event.currentTarget.value)}
          >
            <option value="All">All priorities</option>
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
          <select
            class="cp-select"
            value={sortFilter()}
            onInput={(event) => setSortFilter(event.currentTarget.value)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="risk_desc">Risk (desc)</option>
            <option value="priority_desc">Priority (desc)</option>
          </select>

          <Show
            when={!!dashboardError()}
            fallback={
              <span class="cp-toolbar-meta">
                Total reports: {totalReports()} | Filtered: {totalFromQueue()}
              </span>
            }
          >
            <span class="cp-alert-inline">Admin/API error: {dashboardError()}</span>
          </Show>

          <Show when={!dashboard() || !reports()}>
            <span class="cp-toolbar-meta">Loading...</span>
          </Show>
        </div>

        <Show when={!!actionError()}>
          <div class="cp-alert cp-alert-danger">Action failed: {actionError()}</div>
        </Show>

        <div class="cp-card">
          <div class="cp-card-header">
            <h3>Global moderation queue</h3>
          </div>
          <div class="cp-table-wrap">
            <table class="cp-table cp-table-hover">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Severity</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Reviewer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={reportItems()}>
                  {(item) => (
                    <tr
                      class={
                        selectedReport()?._id === item._id
                          ? "cp-row-selected"
                          : undefined
                      }
                      onClick={() => setSelectedReport(item)}
                    >
                      <td class="cp-mono">{item._id}</td>
                      <td>
                        {(() => {
                          const target = resolveReportTarget(item);
                          return (
                            <>
                              <div>{target.title}</div>
                              <div class="cp-mono">{item.content.type}: {target.subtitle ?? item.content.id}</div>
                              <Show when={target.viewHref && target.viewLabel}>
                                <a class="cp-link" href={target.viewHref}>
                                  {target.viewLabel}
                                </a>
                              </Show>
                            </>
                          );
                        })()}
                      </td>
                      <td>
                        <span class={`cp-status cp-status-${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.severity ?? "Medium"}</td>
                      <td>{item.priority ?? "Normal"}</td>
                      <td>{item.assignee_id ?? "Unassigned"}</td>
                      <td>{item.reviewer_id ?? "Unassigned"}</td>
                      <td>
                        <div class="cp-action-group" onClick={(event) => event.stopPropagation()}>
                          <button
                            class="cp-btn cp-btn-outline"
                            onClick={() => updateReportStatus(item._id, "InReview")}
                          >
                            Claim
                          </button>
                          <button
                            class="cp-btn cp-btn-outline"
                            onClick={() => updateReportStatus(item._id, "Escalated")}
                          >
                            Escalate
                          </button>
                          <button
                            class="cp-btn cp-btn-outline"
                            onClick={() => updateReportStatus(item._id, "Resolved")}
                          >
                            Resolve
                          </button>
                          <button
                            class="cp-btn cp-btn-danger"
                            onClick={() => updateReportStatus(item._id, "Rejected")}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>

        <Show when={!!reportsError()}>
          <div class="cp-alert cp-alert-warning">Queue fetch failed: {reportsError()}</div>
        </Show>

        <Show when={selectedReport()}>
          <div class="cp-card">
            <div class="cp-card-header">
              <h3>Case detail</h3>
            </div>
            <div class="cp-card-body cp-detail-grid">
              <div><span class="cp-field-label">ID</span><div class="cp-mono">{selectedReport()!._id}</div></div>
              <div>
                <span class="cp-field-label">Target</span>
                {(() => {
                  const report = selectedReport()!;
                  const target = resolveReportTarget(report);
                  return (
                    <div>
                      <div>{target.title}</div>
                      <div class="cp-mono">
                        {report.content.type}: {target.subtitle ?? report.content.id}
                      </div>
                      <Show when={target.viewHref && target.viewLabel}>
                        <a class="cp-link" href={target.viewHref}>
                          {target.viewLabel}
                        </a>
                      </Show>
                    </div>
                  );
                })()}
              </div>
              <div><span class="cp-field-label">Status</span><div>{selectedReport()!.status}</div></div>
              <div><span class="cp-field-label">Author</span><div class="cp-mono">{selectedReport()!.author_id}</div></div>
              <div><span class="cp-field-label">Severity</span><div>{selectedReport()!.severity ?? "Medium"}</div></div>
              <div><span class="cp-field-label">Priority</span><div>{selectedReport()!.priority ?? "Normal"}</div></div>
              <div><span class="cp-field-label">Risk score</span><div>{selectedReport()!.risk_score ?? "N/A"}</div></div>
              <div><span class="cp-field-label">Confidence score</span><div>{selectedReport()!.confidence_score ?? "N/A"}</div></div>
              <div><span class="cp-field-label">Created</span><div>{selectedReport()!.created_at ?? "N/A"}</div></div>
              <div><span class="cp-field-label">Updated</span><div>{selectedReport()!.updated_at ?? "N/A"}</div></div>
              <div class="cp-detail-span2">
                <span class="cp-field-label">Additional context</span>
                <div>{selectedReport()!.additional_context || "No additional context provided."}</div>
              </div>

              <label class="cp-field-stack">
                <span class="cp-field-label">Assignee User ID</span>
                <input
                  class="cp-input"
                  value={assigneeId()}
                  placeholder="User ID or empty to clear"
                  onInput={(e) => setAssigneeId(e.currentTarget.value)}
                />
              </label>

              <label class="cp-field-stack cp-field-stack-wide">
                <span class="cp-field-label">Case notes</span>
                <textarea
                  class="cp-textarea"
                  value={caseNotes()}
                  rows={5}
                  onInput={(e) => setCaseNotes(e.currentTarget.value)}
                />
              </label>

              <div class="cp-field-stack-wide">
                <button class="cp-btn cp-btn-primary" onClick={saveCaseMetadata}>
                  Save notes / assignee
                </button>
              </div>

              <div class="cp-field-stack cp-field-stack-wide">
                <span class="cp-field-label">Workflow action</span>
                <div class="cp-toolbar">
                  <select
                    class="cp-select"
                    value={workflowAction()}
                    onInput={(e) => setWorkflowAction(e.currentTarget.value)}
                  >
                    <option value="ack">ack</option>
                    <option value="request_more_info">request_more_info</option>
                    <option value="reopen">reopen</option>
                    <option value="merge_duplicate">merge_duplicate</option>
                    <option value="escalate_tier2">escalate_tier2</option>
                    <option value="close_no_action">close_no_action</option>
                  </select>
                  <input
                    class="cp-input"
                    value={workflowReason()}
                    placeholder="Action reason (optional)"
                    onInput={(e) => setWorkflowReason(e.currentTarget.value)}
                  />
                  <Show when={workflowAction() === "merge_duplicate"}>
                    <input
                      class="cp-input"
                      value={mergeInto()}
                      placeholder="Merge into report ID"
                      onInput={(e) => setMergeInto(e.currentTarget.value)}
                    />
                  </Show>
                  <button class="cp-btn cp-btn-outline" onClick={runWorkflowAction}>
                    Run action
                  </button>
                </div>
              </div>

              <div class="cp-field-stack cp-field-stack-wide">
                <span class="cp-field-label">Evidence snapshots</span>
                <div class="cp-card">
                  <div class="cp-card-body">
                    <pre>{JSON.stringify(snapshots()?.snapshots ?? [], null, 2)}</pre>
                  </div>
                </div>
              </div>

              <div class="cp-field-stack cp-field-stack-wide">
                <span class="cp-field-label">Timeline</span>
                <div class="cp-card">
                  <div class="cp-card-body">
                    <For each={timeline()?.entries ?? []}>
                      {(entry) => (
                        <div class="cp-list-item">
                          <strong>{entry.timestamp}</strong> {entry.action} by{" "}
                          <span class="cp-mono">{entry.actor_id}</span>
                        </div>
                      )}
                    </For>
                    <Show when={(timeline()?.entries ?? []).length === 0}>
                      <div>No timeline entries yet.</div>
                    </Show>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </Show>
    </section>
  );
}
