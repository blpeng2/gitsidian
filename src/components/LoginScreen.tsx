import React, { useState } from 'react';
import { githubService } from '../services/github';

interface LoginScreenProps {
  onLogin: (token: string) => Promise<void> | void;
  isLoading: boolean;
  error: string | null;
}

function LoginScreen({ onLogin, isLoading, error }: LoginScreenProps) {
  const [token, setToken] = useState('');
  const [oauthError, setOauthError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onLogin(token.trim());
    }
  };

  const handleOAuthLogin = () => {
    setOauthError(null);
    try {
      window.location.href = githubService.getOAuthUrl();
    } catch (authError) {
      setOauthError(authError instanceof Error ? authError.message : 'GitHub login failed');
    }
  };

  const combinedError = oauthError || error;

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">Gitsidian</h1>
          <p className="login-subtitle">
            Connect your GitHub repos like Obsidian notes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="token">GitHub Personal Access Token</label>
            <input
              type="password"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="token-input"
              disabled={isLoading}
            />
            <p className="token-help">
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=Gitsidian"
                target="_blank"
                rel="noopener noreferrer"
              >
                Generate a token
              </a>
              {' '}with <code>repo</code> and <code>read:user</code> scopes
            </p>
          </div>

          {combinedError && (
            <div className="error-message">
              {combinedError}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !token.trim()}
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="oauth-button"
            onClick={handleOAuthLogin}
            disabled={isLoading || !githubService.hasOAuthClientId()}
          >
            Login with GitHub
          </button>

          {!githubService.hasOAuthClientId() && (
            <p className="oauth-help">
              Set <code>VITE_OAUTH_CLIENT_ID</code> to enable GitHub OAuth.
            </p>
          )}
        </form>

        <div className="login-features">
          <h3>Features</h3>
          <ul>
            <li>View all your repositories in an interactive graph</li>
            <li>Auto-parse [[wiki-links]] from READMEs to build connections</li>
            <li>See backlinks — which repos reference each other</li>
            <li>Filter by privacy, topics, and connection status</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
