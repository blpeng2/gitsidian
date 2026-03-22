import { githubService } from '../services/github';

interface LoginScreenProps {
  isLoading: boolean;
  error: string | null;
}

function LoginScreen({ isLoading, error }: LoginScreenProps) {
  const handleOAuthLogin = () => {
    try {
      window.location.href = githubService.getOAuthUrl();
    } catch (authError) {
      console.error('OAuth error:', authError);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <h1>🔗 Gitsidian</h1>
        <p className="login-subtitle">GitHub repositories as connected notes</p>

        {error && <div className="error-message">{error}</div>}

        <button
          type="button"
          className="oauth-button"
          onClick={handleOAuthLogin}
          disabled={isLoading || !githubService.hasOAuthClientId()}
        >
          {isLoading ? 'Connecting...' : 'Login with GitHub'}
        </button>

        {!githubService.hasOAuthClientId() && (
          <p className="oauth-help">
            OAuth is not configured for this instance.
          </p>
        )}
      </div>
    </div>
  );
}

export default LoginScreen;
