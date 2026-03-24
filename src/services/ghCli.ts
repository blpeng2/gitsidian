type GhCallback = (success: boolean, data: unknown) => void;

declare global {
  interface Window {
    __ghCallback?: (id: string, success: boolean, data: unknown) => void;
  }
}

interface GhCliHandler {
  postMessage: (msg: { id: string; action: string; args?: string[] }) => void;
}

class GhCliService {
  private callbacks = new Map<string, GhCallback>();

  constructor() {
    window.__ghCallback = (id: string, success: boolean, data: unknown) => {
      const cb = this.callbacks.get(id);
      if (!cb) return;
      this.callbacks.delete(id);
      cb(success, data);
    };
  }

  private send(action: string, args?: string[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2, 10);
      const timer = setTimeout(() => {
        this.callbacks.delete(id);
        reject(new Error(`gh bridge timeout: ${action}`));
      }, 30000);

      this.callbacks.set(id, (success, data) => {
        clearTimeout(timer);
        if (success) resolve(data);
        else reject(new Error(typeof data === 'string' ? data : 'gh error'));
      });
      const ghCliHandler = (window.webkit?.messageHandlers as { ghCli?: GhCliHandler } | undefined)?.ghCli;
      ghCliHandler?.postMessage({ id, action, ...(args ? { args } : {}) });
    });
  }

  isDesktop(): boolean {
    const ghCliHandler = (window.webkit?.messageHandlers as { ghCli?: GhCliHandler } | undefined)?.ghCli;
    return !!ghCliHandler;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.send('isAvailable');
      return result === true;
    } catch {
      return false;
    }
  }

  async checkAuth(): Promise<boolean> {
    try {
      await this.send('checkAuth');
      return true;
    } catch {
      return false;
    }
  }

  async login(): Promise<void> {
    await this.send('login');
  }

  async getToken(): Promise<string> {
    const token = await this.send('getToken');
    if (typeof token !== 'string' || !token) throw new Error('토큰을 가져올 수 없습니다');
    return token;
  }

  async openExternal(url: string): Promise<void> {
    if (!this.isDesktop()) {
        window.open(url, '_blank', 'noopener');
        return;
    }
    await this.send('openExternal', [url]);
  }

  async performUpdate(downloadUrl: string): Promise<void> {
    if (!this.isDesktop()) return;
    const id = Math.random().toString(36).slice(2, 10);
    const ghCliHandler = (window.webkit?.messageHandlers as { ghCli?: GhCliHandler } | undefined)?.ghCli;
    ghCliHandler?.postMessage({ id, action: 'performUpdate', args: [downloadUrl] });
  }
}

export const ghCliService = new GhCliService();
