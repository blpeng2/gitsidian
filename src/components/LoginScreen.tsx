import { useState } from 'react';
import { githubService } from '../services/github';

interface LoginScreenProps {
  isLoading: boolean;
  error: string | null;
  onTokenLogin: (token: string) => void;
}

function LoginScreen({ isLoading, error, onTokenLogin }: LoginScreenProps) {
  const [pat, setPat] = useState('');
  const [patError, setPatError] = useState('');

  const handleOAuthLogin = () => {
    try {
      window.location.href = githubService.getOAuthUrl();
    } catch (authError) {
      console.error('OAuth error:', authError);
    }
  };

  const handlePatLogin = () => {
    const token = pat.trim();
    if (!token) {
      setPatError('토큰을 입력해주세요.');
      return;
    }
    setPatError('');
    onTokenLogin(token);
  };

  const handlePatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handlePatLogin();
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <h1>🔗 Gitsidian</h1>
        <p className="login-subtitle">GitHub repositories as connected notes</p>

        {error && <div className="error-message">{error}</div>}

        {githubService.hasOAuthClientId() && (
          <button
            type="button"
            className="oauth-button"
            onClick={handleOAuthLogin}
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Login with GitHub'}
          </button>
        )}

        <div className="pat-section">
          <p className="pat-label">GitHub Personal Access Token</p>
          <input
            type="password"
            className="pat-input"
            placeholder="ghp_xxxxxxxxxxxx"
            value={pat}
            onChange={e => setPat(e.target.value)}
            onKeyDown={handlePatKeyDown}
            disabled={isLoading}
          />
          {patError && <p className="pat-error">{patError}</p>}
          <button
            type="button"
            className="pat-button"
            onClick={handlePatLogin}
            disabled={isLoading || !pat.trim()}
          >
            토큰으로 로그인
          </button>
          <p className="pat-help">
            <a
              href="https://github.com/settings/tokens/new?scopes=repo,read:user"
              target="_blank"
              rel="noreferrer"
            >
              토큰 발급하기 →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
