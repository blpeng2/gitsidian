import { Octokit } from '@octokit/rest';
import { GitHubRepo } from '../types';

class GitHubService {
  private octokit: Octokit | null = null;

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
