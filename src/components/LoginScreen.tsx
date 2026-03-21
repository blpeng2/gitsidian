import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (token: string) => void;
  isLoading: boolean;
  error: string | null;
}

function LoginScreen({ onLogin, isLoading, error }: LoginScreenProps) {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onLogin(token.trim());
    }
  };

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

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !token.trim()}
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </form>

        <div className="login-features">
          <h3>Features</h3>
          <ul>
            <li>View all your repositories in a graph</li>
            <li>Add meta notes to organize your thoughts</li>
            <li>Link repos with [[wiki-links]]</li>
            <li>Track public conversion readiness</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
