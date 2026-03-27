const REPO_PREFIX = 'gitsidian-';

export function stripPrefix(name: string): string {
  return name.startsWith(REPO_PREFIX) ? name.slice(REPO_PREFIX.length) : name;
}
