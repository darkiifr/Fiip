const GITHUB_LATEST_RELEASE_URL = 'https://api.github.com/repos/darkiifr/Fiip/releases/latest';

export async function fetchGitHubLatestRelease({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(GITHUB_LATEST_RELEASE_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub release lookup failed (${response.status}).`);
  }

  return response.json();
}

export function getUpdatePresentation(update, githubRelease = null) {
  const changelog = String(update?.body || githubRelease?.body || '').trim();
  return {
    version: update?.version || githubRelease?.tag_name?.replace(/^v/i, '') || '',
    date: update?.date || githubRelease?.published_at || '',
    changelog: changelog || 'Aucun changelog fourni pour cette version.',
    releaseUrl: githubRelease?.html_url || 'https://github.com/darkiifr/Fiip/releases',
  };
}
