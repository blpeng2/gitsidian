import { useEffect, useState } from 'react';
import { githubService } from '../services/github';
import { ghCliService } from '../services/ghCli';
import { IconGraph } from './Icons';

interface LoginScreenProps {
  isLoading: boolean;
  error: string | null;
  onGhLogin?: () => Promise<void>;
}

function LoginScreen({ isLoading, error, onGhLogin }: LoginScreenProps) {
  const [oauthError, setOauthError] = useState('');
  const [ghLoading, setGhLoading] = useState(false);
  const [deviceCode, setDeviceCode] = useState('');
  const [copied, setCopied] = useState(false);
  const isDesktop = ghCliService.isDesktop();

  useEffect(() => {
    const handler = (e: Event) => {
      const { code } = (e as CustomEvent<{ code: string; url: string }>).detail;
      setDeviceCode(code);
    };
    window.addEventListener('ghDeviceCode', handler);
    return () => window.removeEventListener('ghDeviceCode', handler);
  }, []);

  const handleOAuthLogin = () => {
    try {
      window.location.href = githubService.getOAuthUrl();
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'OAuth login failed.';
      setOauthError(message);
    }
  };

  const handleGhLogin = async () => {
    if (!onGhLogin) return;
    setGhLoading(true);
    setDeviceCode('');
    setOauthError('');
    try {
      await onGhLogin();
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setGhLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <IconGraph width="32" height="32" />
        </div>
        <h1 className="login-title">Gitsidian</h1>
        <p className="login-subtitle">Your GitHub repos as a knowledge graph</p>

        {error && <div className="login-error">{error}</div>}

        {isDesktop ? (
          <button
            type="button"
            className="login-github-btn"
            onClick={handleGhLogin}
            disabled={isLoading || ghLoading}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {ghLoading ? '브라우저에서 인증 중…' : (isLoading ? 'Connecting…' : 'Login with GitHub')}
          </button>
        ) : (
          <button
            type="button"
            className="login-github-btn"
            onClick={handleOAuthLogin}
            disabled={isLoading}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {isLoading ? 'Connecting…' : 'Continue with GitHub'}
          </button>
        )}

        {oauthError && <p className="login-oauth-error">{oauthError}</p>}

        {ghLoading && (
          <div className="login-device-flow">
            {deviceCode ? (
              <>
                <p className="login-gh-hint">브라우저에서 이 코드를 입력하세요:</p>
                <div className="login-device-code-row">
                  <div className="login-device-code">{deviceCode}</div>
                  <button
                    className="login-copy-btn"
                    onClick={() => {
                      void navigator.clipboard.writeText(deviceCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    title="Copy code"
                  >
                    {copied ? '✓' : '⎘'}
                  </button>
                </div>
                <p className="login-gh-hint" style={{ fontSize: '0.75rem' }}>
                  github.com/login/device
                </p>
              </>
            ) : (
              <p className="login-gh-hint">GitHub 연결 중…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginScreen;
