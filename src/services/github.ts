import { Octokit } from '@octokit/rest';
import { GitHubRepo } from '../types';

const OAUTH_CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID || '';
const REDIRECT_URI = `${window.location.origin}/gitsidian/callback`;

export interface DeviceFlowResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface DeviceFlowTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

class GitHubService {
  private octokit: Octokit | null = null;

  getOAuthUrl(): string {
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'repo read:user',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params}`;
  }

  hasOAuthClientId(): boolean {
    return OAUTH_CLIENT_ID.trim().length > 0;
  }

  async initiateDeviceFlow(): Promise<DeviceFlowResponse> {
    if (!this.hasOAuthClientId()) {
      throw new Error('Missing VITE_OAUTH_CLIENT_ID configuration');
    }

    const params = new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      scope: 'repo read:user',
    });

    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to start GitHub device login');
    }

    const data = (await response.json()) as Partial<DeviceFlowResponse>;

    if (!data.device_code || !data.user_code || !data.verification_uri || !data.expires_in || !data.interval) {
      throw new Error('Invalid device flow response from GitHub');
    }

    return {
      device_code: data.device_code,
      user_code: data.user_code,
      verification_uri: data.verification_uri,
      expires_in: data.expires_in,
      interval: data.interval,
    };
  }

  async pollForToken(deviceCode: string, intervalSeconds: number, expiresInSeconds: number): Promise<string> {
    if (!this.hasOAuthClientId()) {
      throw new Error('Missing VITE_OAUTH_CLIENT_ID configuration');
    }

    const timeoutAt = Date.now() + expiresInSeconds * 1000;
    let pollInterval = intervalSeconds;

    while (Date.now() < timeoutAt) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));

      const params = new URLSearchParams({
        client_id: OAUTH_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      });

      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error('Failed while polling GitHub for access token');
      }

      const data = (await response.json()) as DeviceFlowTokenResponse;

      if (data.access_token) {
        return data.access_token;
      }

      if (data.error === 'authorization_pending') {
        continue;
      }

      if (data.error === 'slow_down') {
        pollInterval += 5;
        continue;
      }

      if (data.error === 'access_denied') {
        throw new Error('GitHub login was canceled');
      }

      if (data.error === 'expired_token') {
        throw new Error('GitHub device code expired. Start login again.');
      }

      throw new Error(data.error_description || 'GitHub device login failed');
    }

    throw new Error('GitHub device login timed out. Start login again.');
  }

  // Initialize with access token
  setAccessToken(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return this.octokit !== null;
  }

  // Fetch all repositories for the authenticated user
  async fetchRepos(): Promise<GitHubRepo[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    try {
      const repos: GitHubRepo[] = [];
      let page = 1;
      const perPage = 100;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data } = await this.octokit.repos.listForAuthenticatedUser({
          per_page: perPage,
          page,
          sort: 'updated',
          direction: 'desc',
        });

        if (data.length === 0) break;

        repos.push(...data.map(repo => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          html_url: repo.html_url,
          topics: repo.topics || [],
          updated_at: repo.updated_at || new Date().toISOString(),
          created_at: repo.created_at || new Date().toISOString(),
          language: repo.language,
          stargazers_count: repo.stargazers_count || 0,
          forks_count: repo.forks_count || 0,
          owner: {
            login: repo.owner.login,
            avatar_url: repo.owner.avatar_url,
          },
        })));

        if (data.length < perPage) break;
        page++;
      }

      return repos;
    } catch (error) {
      console.error('Error fetching repos:', error);
      throw error;
    }
  }

  // Fetch README content for a repository
  async fetchReadme(owner: string, repo: string): Promise<string | null> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    try {
      const { data } = await this.octokit.repos.getReadme({
        owner,
        repo,
      });

      // Decode base64 content using browser API
      const content = atob(data.content);
      return content;
    } catch (error) {
      // README might not exist
      return null;
    }
  }

  async fetchAllReadmes(repos: GitHubRepo[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const concurrency = 10;

    for (let i = 0; i < repos.length; i += concurrency) {
      const batch = repos.slice(i, i + concurrency);
      const promises = batch.map(async (repo) => {
        const content = await this.fetchReadme(repo.owner.login, repo.name);
        if (content) {
          results[repo.name] = content;
        }
      });
      await Promise.all(promises);
    }

    return results;
  }

  // Validate access token
  async validateToken(): Promise<boolean> {
    if (!this.octokit) {
      return false;
    }

    try {
      await this.octokit.users.getAuthenticated();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get current user info
  async getCurrentUser() {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    const { data } = await this.octokit.users.getAuthenticated();
    return {
      login: data.login,
      name: data.name,
      avatar_url: data.avatar_url,
    };
  }
}

// Export singleton instance
export const githubService = new GitHubService();
