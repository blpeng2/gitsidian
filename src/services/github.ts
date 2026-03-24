import { Octokit } from '@octokit/rest';
import { GitHubRepo } from '../types';

const OAUTH_CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID || '';
const REPO_PREFIX = 'gitsidian-';

class GitHubService {
  private octokit: Octokit | null = null;

  getOAuthUrl(): string {
    if (!OAUTH_CLIENT_ID) {
      throw new Error('Missing VITE_OAUTH_CLIENT_ID');
    }

    const isDesktop = window.location.protocol === 'gitsidian:';
    const stateObj = {
      nonce: crypto.randomUUID(),
      platform: isDesktop ? 'desktop' : 'web',
    };
    const state = btoa(JSON.stringify(stateObj));
    sessionStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      scope: 'repo read:user',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params}`;
  }

  hasOAuthClientId(): boolean {
    return OAUTH_CLIENT_ID.trim().length > 0;
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

      return repos.filter((repo) => repo.name.startsWith(REPO_PREFIX));
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

      // Decode base64 content with proper UTF-8 support
      const binary = atob(data.content.replace(/\n/g, ''));
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const content = new TextDecoder('utf-8').decode(bytes);
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

  async createRepo(name: string, description: string, isPrivate: boolean): Promise<GitHubRepo> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    const fullName = `${REPO_PREFIX}${name}`;
    const { data: repo } = await this.octokit.repos.createForAuthenticatedUser({
      name: fullName,
      description,
      private: isPrivate,
      auto_init: false,
    });

    const readmeContent = `# ${name}\n\n${description || ''}\n`;
    const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(readmeContent)));
    await this.octokit.repos.createOrUpdateFileContents({
      owner: repo.owner.login,
      repo: repo.name,
      path: 'README.md',
      message: 'Initial README',
      content: encoded,
    });

    await this.octokit.repos.replaceAllTopics({
      owner: repo.owner.login,
      repo: repo.name,
      names: ['inbox'],
    });

    return {
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      html_url: repo.html_url,
      topics: ['inbox'],
      updated_at: repo.updated_at || new Date().toISOString(),
      created_at: repo.created_at || new Date().toISOString(),
      language: repo.language,
      stargazers_count: repo.stargazers_count || 0,
      forks_count: repo.forks_count || 0,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url,
      },
    };
  }

  async getReadmeSha(owner: string, repo: string): Promise<string | null> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    try {
      const { data } = await this.octokit.repos.getReadme({ owner, repo });
      return data.sha;
    } catch {
      return null;
    }
  }

  async updateReadme(owner: string, repo: string, content: string, sha: string | null): Promise<string> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    const bytes = new TextEncoder().encode(content);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
    const encoded = btoa(binary);
    const { data } = await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: 'Update README via Gitsidian',
      content: encoded,
      ...(sha && { sha }),
    });

    return data.content?.sha || '';
  }

  async uploadImage(owner: string, repo: string, filename: string, base64Content: string): Promise<string> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    let sha: string | undefined;
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: `assets/${filename}`,
      });

      if (!Array.isArray(data) && 'sha' in data) {
        sha = data.sha;
      }
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: number }).status
        : undefined;
      if (status !== 404) {
        throw error;
      }
    }

    await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `assets/${filename}`,
      message: `Upload image: ${filename}`,
      content: base64Content,
      ...(sha && { sha }),
    });

    return `https://raw.githubusercontent.com/${owner}/${repo}/main/assets/${filename}`;
  }

  async updateTopics(owner: string, repo: string, topics: string[]): Promise<void> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    await this.octokit.repos.replaceAllTopics({
      owner,
      repo,
      names: topics,
    });
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
export { REPO_PREFIX };
