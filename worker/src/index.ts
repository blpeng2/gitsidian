/// <reference lib="webworker" />

/**
 * Cloudflare Worker for GitHub OAuth token exchange
 *
 * This worker handles the OAuth flow:
 * 1. Frontend redirects user to GitHub with our client_id
 * 2. GitHub redirects back to our worker with a code
 * 3. Worker exchanges code for access token
 * 4. Worker redirects back to frontend with token in URL fragment (not logged in server logs)
 */

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return handleOptions(request, env);
    }

    // Handle OAuth callback
    if (url.pathname === "/callback") {
      return handleCallback(request, env);
    }

    // Handle token exchange request (for frontend)
    if (url.pathname === "/exchange" && request.method === "POST") {
      return handleExchange(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

function handleOptions(request: Request, env: Env): Response {
  const origin = request.headers.get("Origin") || "";

  // Allow the configured origin
  if (origin === env.ALLOWED_ORIGIN || origin.endsWith(".github.io")) {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  let platform = "web";
  if (state) {
    try {
      const stateObj = JSON.parse(atob(state));
      if (stateObj.platform === "desktop") {
        platform = "desktop";
      }
    } catch {
      // ignore
    }
  }

  // Exchange code for access token
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };

  if (tokenData.error || !tokenData.access_token) {
    return new Response(`Token exchange failed: ${tokenData.error}`, { status: 400 });
  }

  if (platform === "desktop") {
    const redirectUrl = `gitsidian://callback?access_token=${tokenData.access_token}`;
    return Response.redirect(redirectUrl, 302);
  }

  const redirectUrl = new URL(env.ALLOWED_ORIGIN);
  redirectUrl.searchParams.set('access_token', tokenData.access_token);

  return Response.redirect(redirectUrl.toString(), 302);
}

async function handleExchange(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin") || "";

  // Check CORS
  if (origin !== env.ALLOWED_ORIGIN && !origin.endsWith(".github.io")) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const { code } = (await request.json()) as { code: string };

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing code" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin,
        },
      });
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };

    if (tokenData.error || !tokenData.access_token) {
      return new Response(JSON.stringify({ error: tokenData.error || "Token exchange failed" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin,
        },
      });
    }

    return new Response(JSON.stringify({ access_token: tokenData.access_token }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
      },
    });
  }
}
