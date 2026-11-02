import type { Settings } from '../types'

interface FileResult<T> {
  data: T
  sha: string
}

function headers(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function fileUrl(s: Settings, path: string): string {
  return `https://api.github.com/repos/${s.owner}/${s.repo}/contents/${path}`
}

function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

async function failure(res: Response): Promise<Error> {
  let detail = ''
  try {
    detail = (await res.json()).message ?? ''
  } catch {
    /* ignore */
  }
  return new Error(`GitHub ${res.status}${detail ? `: ${detail}` : ''}`)
}

export async function readJsonFile<T>(s: Settings, path: string): Promise<FileResult<T>> {
  const res = await fetch(`${fileUrl(s, path)}?ref=${encodeURIComponent(s.branch)}`, {
    headers: headers(s.token),
    cache: 'no-store',
  })
  if (!res.ok) throw await failure(res)
  const body = await res.json()
  return { data: JSON.parse(decodeBase64Utf8(body.content)) as T, sha: body.sha }
}

export async function writeJsonFile<T>(
  s: Settings,
  path: string,
  data: T,
  sha: string,
  message: string,
): Promise<void> {
  const res = await fetch(fileUrl(s, path), {
    method: 'PUT',
    headers: headers(s.token),
    body: JSON.stringify({
      message,
      branch: s.branch,
      sha,
      content: encodeBase64Utf8(JSON.stringify(data, null, 2) + '\n'),
    }),
  })
  if (!res.ok) throw await failure(res)
}
