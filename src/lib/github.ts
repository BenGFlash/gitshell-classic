type GhEndpoint = { url: string; method?: string; body?: unknown };

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gitshell_token");
}

export function getToken(): string | null {
  return token();
}

export function setToken(t: string): void {
  localStorage.setItem("gitshell_token", t);
}

function headers(): Record<string, string> {
  const tok = token();
  return {
    Accept: "application/vnd.github.v3+json",
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
  };
}

async function fetchJson<T>(endpoint: GhEndpoint): Promise<T> {
  const res = await fetch(endpoint.url, {
    method: endpoint.method ?? "GET",
    headers: headers(),
    body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
  });
  if (!res.ok) {
    let msg = `GitHub API ${res.status}`;
    try {
      const err = (await res.json()) as { message?: string };
      if (err.message) msg = err.message;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export function getAuthedUser(): Promise<{ login: string }> {
  return fetchJson({ url: "https://api.github.com/user" });
}

export function getRepos(): Promise<{ name: string; full_name: string; description: string | null; private: boolean; updated_at: string }[]> {
  return fetchJson({ url: "https://api.github.com/user/repos?per_page=100&sort=updated" });
}

export function getBranches(owner: string, repo: string): Promise<{ name: string; commit: { sha: string } }[]> {
  return fetchJson({ url: `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100` });
}

export function deleteBranch(owner: string, repo: string, branch: string): Promise<void> {
  return fetchJson({
    url: `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    method: "DELETE",
  });
}

export function getWorkflowRuns(owner: string, repo: string): Promise<{
  workflow_runs: {
    id: number;
    name: string;
    head_branch: string;
    status: string;
    conclusion: string | null;
    created_at: string;
    display_title: string;
  }[];
}> {
  return fetchJson({ url: `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=20` });
}

export function getRunLogs(owner: string, repo: string, runId: number): Promise<{
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  created_at: string;
  updated_at: string;
  display_title: string;
  run_started_at: string;
  jobs_url: string;
  html_url: string;
}> {
  return fetchJson({ url: `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}` });
}
