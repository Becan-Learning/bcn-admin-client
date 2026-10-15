// Langfuse groups an agent Session's traces by the LiveKit room name (`ss_<study_session.id>`).
// `projectUrl` is the server-only env var LANGFUSE_PROJECT_URL, for example
// https://cloud.langfuse.com/project/<id>. Unset, empty or not an http(s) URL: no link.
export function langfuseSessionUrl(projectUrl: string | undefined | null, room: string): string | null {
  const base = projectUrl?.trim().replace(/\/+$/, "");
  if (!base || !/^https?:\/\//i.test(base) || !room) return null;
  return `${base}/sessions/${encodeURIComponent(room)}`;
}
