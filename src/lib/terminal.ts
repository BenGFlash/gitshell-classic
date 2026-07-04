import { getAuthedUser, getToken, setToken, getRepos, getBranches, deleteBranch, getWorkflowRuns, getRunLogs } from "./github";

export interface OutputLine {
  text: string;
  kind: "stdout" | "stderr" | "system" | "help" | "divider";
}

interface CommandResult {
  lines: OutputLine[];
  next?: string;
}

function ok(text: string): OutputLine {
  return { text, kind: "stdout" };
}
function err(text: string): OutputLine {
  return { text, kind: "stderr" };
}
function sys(text: string): OutputLine {
  return { text, kind: "system" };
}
function divider(): OutputLine {
  return { text: "───", kind: "divider" };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseRepoArg(raw: string): { owner: string; repo: string } | null {
  const parts = raw.split("/");
  if (parts.length === 2) return { owner: parts[0], repo: parts[1] };
  return null;
}

const HELP_TEXT: OutputLine[] = [
  ok(""),
  sys("  ╔══════════════════════════════════════════════════╗"),
  sys("  ║              GITSHELL v1.0 - HELP               ║"),
  sys("  ╚══════════════════════════════════════════════════╝"),
  ok(""),
  ok("  Available commands:"),
  ok(""),
  ok("    auth <token>        Save your GitHub PAT to this session"),
  ok(""),
  ok("    repos               List your GitHub repositories"),
  ok(""),
  ok("    branches <repo>     List branches of a repository"),
  ok("                        Usage: branches owner/repo-name"),
  ok(""),
  ok("    kill-branch <repo> <branch>"),
  ok("                        Delete a branch from a repository"),
  ok("                        Usage: kill-branch owner/repo-name branch-name"),
  ok(""),
  ok("    runs <repo>         Show latest GitHub Actions runs"),
  ok("                        Usage: runs owner/repo-name"),
  ok(""),
  ok("    logs <repo> <run-id>"),
  ok("                        Show details of a specific workflow run"),
  ok("                        Usage: logs owner/repo-name 1234567"),
  ok(""),
  ok("    whoami              Show current authenticated user"),
  ok(""),
  ok("    clear               Clear the terminal screen"),
  ok(""),
  ok("    help                Display this help message"),
  ok(""),
  sys("  ──────────────────────────────────────────────────"),
  ok(""),
  ok("  Tip: Start by running:  auth <your-github-token>"),
  ok("  Get a token at: github.com/settings/tokens"),
  ok(""),
];

async function cmdHelp(): Promise<CommandResult> {
  return { lines: HELP_TEXT };
}

async function cmdAuth(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return { lines: [err("Usage: auth <personal-access-token>")] };
  }
  setToken(args[0]);
  return { lines: [ok("Token saved. Run whoami to verify.")] };
}

async function cmdWhoami(): Promise<CommandResult> {
  try {
    const user = await getAuthedUser();
    return { lines: [ok(`Authenticated as ${user.login}`)] };
  } catch (e) {
    return { lines: [err(`Auth failed: ${e instanceof Error ? e.message : "unknown error"}`)] };
  }
}

async function cmdRepos(): Promise<CommandResult> {
  try {
    const repos = await getRepos();
    if (repos.length === 0) return { lines: [ok("No repositories found.")] };
    const lines: OutputLine[] = [
      sys(`  ${"REPOSITORY".padEnd(40)} ${"VISIBILITY".padEnd(12)} UPDATED`),
      divider(),
    ];
    for (const r of repos) {
      const name = r.full_name.padEnd(40);
      const vis = (r.private ? "private" : "public").padEnd(12);
      lines.push(ok(`  ${name}${vis}${fmtDate(r.updated_at)}`));
    }
    lines.push(ok(`\n  ${repos.length} repo(s)`));
    return { lines };
  } catch (e) {
    return { lines: [err(`Failed to fetch repos: ${e instanceof Error ? e.message : "unknown error"}`)] };
  }
}

async function cmdBranches(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return { lines: [err("Usage: branches <owner/repo>")] };
  }
  const parsed = parseRepoArg(args[0]);
  if (!parsed) return { lines: [err('Invalid format. Use: owner/repo-name')] };
  try {
    const branches = await getBranches(parsed.owner, parsed.repo);
    if (branches.length === 0) return { lines: [ok("No branches found.")] };
    const lines: OutputLine[] = [
      sys(`  Repository: ${parsed.owner}/${parsed.repo}`),
      divider(),
    ];
    for (const b of branches) {
      lines.push(ok(`  ${b.name.padEnd(40)} ${b.commit.sha.substring(0, 7)}`));
    }
    lines.push(ok(`\n  ${branches.length} branch(es)`));
    return { lines };
  } catch (e) {
    return { lines: [err(`Failed: ${e instanceof Error ? e.message : "unknown error"}`)] };
  }
}

async function cmdKillBranch(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return { lines: [err("Usage: kill-branch <owner/repo> <branch-name>")] };
  }
  const parsed = parseRepoArg(args[0]);
  if (!parsed) return { lines: [err('Invalid repo format. Use: owner/repo-name')] };
  const branch = args[1];
  try {
    await deleteBranch(parsed.owner, parsed.repo, branch);
    return { lines: [
      ok(`Branch "${branch}" deleted from ${parsed.owner}/${parsed.repo}.`),
    ] };
  } catch (e) {
    return { lines: [err(`Failed to delete branch: ${e instanceof Error ? e.message : "unknown error"}`)] };
  }
}

async function cmdRuns(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return { lines: [err("Usage: runs <owner/repo>")] };
  }
  const parsed = parseRepoArg(args[0]);
  if (!parsed) return { lines: [err('Invalid repo format. Use: owner/repo-name')] };
  try {
    const data = await getWorkflowRuns(parsed.owner, parsed.repo);
    if (data.workflow_runs.length === 0) return { lines: [ok("No workflow runs found.")] };
    const lines: OutputLine[] = [
      sys(`  ${"RUN ID".padEnd(10)} ${"STATUS".padEnd(14)} ${"CONCLUSION".padEnd(14)} BRANCH                TITLE`),
      divider(),
    ];
    for (const r of data.workflow_runs) {
      const id = String(r.id).padEnd(10);
      const st = r.status.padEnd(14);
      const co = (r.conclusion ?? "-").padEnd(14);
      const branch = r.head_branch.padEnd(20).substring(0, 20);
      lines.push(ok(`  ${id}${st}${co}${branch}${r.display_title.substring(0, 30)}`));
    }
    lines.push(ok(`\n  ${data.workflow_runs.length} run(s)`));
    return { lines };
  } catch (e) {
    return { lines: [err(`Failed to fetch runs: ${e instanceof Error ? e.message : "unknown error"}`)] };
  }
}

async function cmdLogs(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return { lines: [err("Usage: logs <owner/repo> <run-id>")] };
  }
  const parsed = parseRepoArg(args[0]);
  if (!parsed) return { lines: [err('Invalid repo format. Use: owner/repo-name')] };
  const runId = parseInt(args[1], 10);
  if (isNaN(runId)) return { lines: [err("Run ID must be a number.")] };
  try {
    const run = await getRunLogs(parsed.owner, parsed.repo, runId);
    const lines: OutputLine[] = [
      sys(`  Workflow Run #${run.id}`),
      divider(),
      ok(`  Title:      ${run.display_title}`),
      ok(`  Name:       ${run.name}`),
      ok(`  Branch:     ${run.head_branch}`),
      ok(`  Status:     ${run.status}`),
      ok(`  Conclusion: ${run.conclusion ?? "-"}`),
      ok(`  Created:    ${fmtDate(run.created_at)}`),
      ok(`  Started:    ${fmtDate(run.run_started_at)}`),
      ok(`  Updated:    ${fmtDate(run.updated_at)}`),
      ok(`  Jobs URL:   ${run.jobs_url}`),
      ok(`  HTML:       ${run.html_url}`),
      divider(),
    ];
    return { lines };
  } catch (e) {
    return { lines: [err(`Failed to fetch logs: ${e instanceof Error ? e.message : "unknown error"}`)] };
  }
}

function cmdClear(): CommandResult {
  return { lines: [{ text: "__CLEAR__", kind: "system" }] };
}

function checkAuth(): OutputLine | null {
  if (!getToken()) {
    return err("No token set. Run: auth <your-github-token>");
  }
  return null;
}

const COMMANDS: Record<string, (args: string[]) => Promise<CommandResult> | CommandResult> = {
  help: cmdHelp,
  auth: cmdAuth,
  whoami: cmdWhoami,
  repos: cmdRepos,
  branches: cmdBranches,
  ["kill-branch"]: cmdKillBranch,
  runs: cmdRuns,
  logs: cmdLogs,
  clear: cmdClear,
};

const AUTH_REQUIRED: Set<string> = new Set(["whoami", "repos", "branches", "kill-branch", "runs", "logs"]);

export async function executeCommand(input: string): Promise<OutputLine[]> {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (!(cmd in COMMANDS)) {
    return [err(`Unknown command: ${cmd}. Type 'help' for available commands.`)];
  }

  if (AUTH_REQUIRED.has(cmd)) {
    const authErr = checkAuth();
    if (authErr) return [authErr];
  }

  try {
    const result = await COMMANDS[cmd](args);
    // handle clear specially
    if (result.lines.length === 1 && result.lines[0].text === "__CLEAR__") {
      return result.lines;
    }
    // wrap with prompt echo
    return [sys(`> ${trimmed}`), ...result.lines];
  } catch (e) {
    return [sys(`> ${trimmed}`), err(`Error: ${e instanceof Error ? e.message : "unknown error"}`)];
  }
}
