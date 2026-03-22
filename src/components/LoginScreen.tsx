import React, { useState } from 'react';
import { githubService, type DeviceFlowResponse } from '../services/github';

interface LoginScreenProps {
  onLogin: (token: string) => Promise<void> | void;
  isLoading: boolean;
  error: string | null;
}

function LoginScreen({ onLogin, isLoading, error }: LoginScreenProps) {
  const [token, setToken] = useState('');
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [deviceFlow, setDeviceFlow] = useState<DeviceFlowResponse | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onLogin(token.trim());
    }
  };

  const handleOAuthLogin = async () => {
    setOauthError(null);
    setIsOAuthLoading(true);

    try {
      const flow = await githubService.initiateDeviceFlow();
      setDeviceFlow(flow);
      window.open(flow.verification_uri, '_blank', 'noopener,noreferrer');

      const accessToken = await githubService.pollForToken(
        flow.device_code,
        flow.interval,
        flow.expires_in,
      );

      await onLogin(accessToken);
    } catch (authError) {
      setOauthError(authError instanceof Error ? authError.message : 'GitHub login failed');
    } finally {
      setIsOAuthLoading(false);
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
              disabled={isLoading || isOAuthLoading}
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
            disabled={isLoading || isOAuthLoading || !token.trim()}
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
            disabled={isLoading || isOAuthLoading || !githubService.hasOAuthClientId()}
          >
            {isOAuthLoading ? 'Waiting for GitHub authorization...' : 'Login with GitHub'}
          </button>

          {!githubService.hasOAuthClientId() && (
            <p className="oauth-help">
              Set <code>VITE_OAUTH_CLIENT_ID</code> to enable GitHub OAuth device flow.
            </p>
          )}

          {deviceFlow && isOAuthLoading && (
            <div className="device-flow-card">
              <p>1. Open GitHub verification page.</p>
              <p>
                2. Enter code: <code>{deviceFlow.user_code}</code>
              </p>
              <a
                href={deviceFlow.verification_uri}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open {deviceFlow.verification_uri}
              </a>
            </div>
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
