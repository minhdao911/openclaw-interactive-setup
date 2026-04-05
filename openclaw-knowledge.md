# OpenClaw Knowledge Base

> Personal notes and research on OpenClaw — the foundation for the ClawPath playbook.
> Add findings here as you learn, test, and experiment.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Uninstallation](#uninstallation)
- [Onboarding Wizard (`openclaw onboard`)](#onboarding-wizard-openclaw-onboard)
- [Configuration](#configuration)
- [Channels](#channels)
- [Security](#security)
- [Skills & ClawHub](#skills--clawhub)
- [Memory System](#memory-system)
- [SOUL.md](#soulmd)
- [Cron Jobs & Heartbeats](#cron-jobs--heartbeats)
- [Model Providers](#model-providers)
- [Ollama (Local Models)](#ollama-local-models)
- [CLI Reference](#cli-reference)
- [Troubleshooting](#troubleshooting)
- [Cost Optimization](#cost-optimization)
- [Misc Notes](#misc-notes)

---

## Overview

OpenClaw is a **self-hosted gateway** that connects your favorite chat apps (WhatsApp, Telegram, Discord, Slack, iMessage, and more) to AI coding agents. One Gateway process runs on your machine, bridging messaging apps to an always-available AI assistant.

**Who is it for?** Developers and power users who want a personal AI assistant reachable from anywhere without giving up data control or relying on hosted services.

**Core traits:**

- **Self-hosted:** runs on your hardware, your rules
- **Multi-channel:** one Gateway serves WhatsApp, Telegram, Discord, and more simultaneously
- **Agent-native:** built for coding agents with tool use, sessions, memory, and multi-agent routing
- **Open source:** MIT licensed, community-driven
- **Requirements:** Node 24 (recommended) or Node 22 LTS (22.16+), an API key, and ~5 minutes

**Key capabilities:**

- Multi-channel gateway: WhatsApp, Telegram, Discord, iMessage, Slack, Signal, IRC, Google Chat, LINE with a single Gateway process
- Plugin channels: Feishu/Lark, Nostr, Microsoft Teams, Mattermost, Nextcloud Talk, Matrix, BlueBubbles, Zalo, Zalo Personal, Synology Chat, Tlon via extension packages
- Multi-agent routing: isolated sessions per agent, workspace, or sender
- Media support: send and receive images, audio, and documents
- Web Control UI: browser dashboard for chat, config, sessions, and nodes
- Mobile nodes: pair iOS and Android nodes for Canvas, camera, and voice-enabled workflows

---

## Architecture

> **Source:** https://docs.openclaw.ai/architecture

### Big Picture

A single long-lived **Gateway** process owns all messaging surfaces. Everything connects to it:

```
  WhatsApp (Baileys)
  Telegram (grammY)       →  Gateway  →  WebSocket API  →  Clients (CLI / web UI / macOS app)
  Slack / Discord                     →                →  Nodes (macOS / iOS / Android)
  Signal / iMessage
  WebChat
```

- **One Gateway per host** — it is the only process that opens a WhatsApp/Telegram session.
- Control-plane clients connect over **WebSocket** on the configured bind host (default `127.0.0.1:18789`).
- **Nodes** (macOS/iOS/Android/headless) connect with `role: node` and expose device commands: `canvas.*`, `camera.*`, `screen.record`, `location.get`.
- The **canvas host** is served by the Gateway HTTP server under `/__openclaw__/canvas/` and `/__openclaw__/a2ui/`.

### Components

| Component                                    | Role                                                                                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Gateway (daemon)**                         | Maintains provider connections. Exposes typed WebSocket API. Emits events: `agent`, `chat`, `presence`, `health`, `heartbeat`, `cron`. |
| **Clients** (CLI / web UI / mac app)         | One WS connection per client. Send requests, subscribe to events.                                                                      |
| **Nodes** (macOS / iOS / Android / headless) | Connect with `role: node`. Expose device capabilities.                                                                                 |
| **WebChat**                                  | Static UI that talks to the Gateway WS API.                                                                                            |

### Wire Protocol

- Transport: WebSocket, text frames with JSON payloads
- First frame must be `connect`
- Requests: `{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
- Events: `{type:"event", event, payload, seq?, stateVersion?}`
- If `OPENCLAW_GATEWAY_TOKEN` is set, `connect.params.auth.token` must match

### Remote Access

- Preferred: Tailscale or VPN
- Alternative SSH tunnel: `ssh -N -L 18789:127.0.0.1:18789 user@host`

### Operations

```bash
openclaw gateway          # start gateway
openclaw status           # check status
openclaw logs --follow    # tail logs
```

Supervision: launchd (macOS) or systemd (Linux) for auto-restart.

---

## Installation

### System Requirements

- **Node 24** (recommended) or Node 22 LTS (22.16+)
- macOS, Linux, or Windows (WSL2 strongly recommended on Windows)
- `pnpm` only if building from source

### Quickest Install (script)

```bash
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash

# Windows (PowerShell)
iwr -useb https://openclaw.ai/install.ps1 | iex
```

### npm

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

### pnpm

```bash
pnpm add -g openclaw@latest
pnpm approve-builds -g
openclaw onboard --install-daemon
```

### After Install

```bash
openclaw doctor    # check installation health
openclaw status    # verify gateway status
openclaw dashboard # open web UI
```

**`openclaw` not found?**

```bash
node -v && npm -v && npm prefix -g && echo "$PATH"
# Fix: add to ~/.zshrc or ~/.bashrc:
export PATH="$(npm prefix -g)/bin:$PATH"
```

---

### macOS (via Lume VM)

> **Source:** https://docs.openclaw.ai/install/macos-vm
> **Requirements:** Apple Silicon Mac (M1/M2/M3/M4), macOS Sequoia+, ~60 GB free disk space, ~20 min setup time
>
> **When to use a macOS VM:** specifically for iMessage/BlueBubbles support, or when you want strict isolation. For always-on Gateway use, a small Linux VPS is cheaper and simpler.

#### Steps

**Step 1 — Install Lume**

```bash
# Install via bash script
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"

# Add to PATH if not automatically added
export PATH="$HOME/.local/bin:$PATH"

# Verify
lume --version
```

**Step 2 — Create the macOS VM**

```bash
lume create openclaw --os macos --ipsw latest
```

Downloads macOS and provisions the VM. This takes a while.

> ⚠️ **Gotcha:** The docs say "a VNC window automatically opens" but this doesn't always happen. If you don't see a VNC window, launch the VM with the display manually:
>
> ```bash
> lume run openclaw
> ```

**Step 3 — Complete macOS Setup Assistant (inside the VM)**

Via the VNC/display window:

1. Go through the macOS Setup Assistant
2. Create a user account (remember the username — you'll SSH with it)
3. Enable Remote Login: **System Settings → General → Sharing → Remote Login → On**

**Step 4 — Get the VM's IP address**

```bash
lume get openclaw
# Look for the IP in the output, e.g. 192.168.64.X
```

**Step 5 — SSH into the VM**

```bash
ssh youruser@192.168.64.X
```

> ⚠️ **Gotcha:** On first SSH, you'll see this prompt:
>
> ```
> The authenticity of host '192.168.64.x (192.168.64.x)' can't be established.
> ED25519 key fingerprint is SHA256:xxxxxx.
> Are you sure you want to continue connecting (yes/no/[fingerprint])?
> ```
>
> You **must type `yes` and press Enter** — just pressing Enter (blank) will reject the connection with `Host key verification failed`. This is a one-time verification that adds the VM to your known hosts.

**Step 6 — Install Node.js inside the VM**

> ⚠️ **Doc gap:** The official docs skip this step entirely, but Node.js is required to run OpenClaw. Install it first before proceeding.

```bash
# Using Homebrew (recommended on macOS)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node

# Verify (OpenClaw requires Node 22+)
node --version
```

**Step 7 — Install OpenClaw**

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
# Follow the prompts to configure your model provider
```

**Step 8 — Configure Channels**

```bash
# Edit config to add channels (WhatsApp, Telegram, etc.)
~/.openclaw/openclaw.json

# Authenticate channels
openclaw channels login
```

**Step 9 — Switch to headless mode (for always-on use)**

```bash
# Stop the VM
lume stop openclaw

# Restart without display
lume run openclaw --no-display

# Monitor via SSH going forward
ssh youruser@192.168.64.X
```

**Optional — Save a golden image**

```bash
lume stop openclaw
lume clone openclaw openclaw-golden
```

#### iMessage via BlueBubbles (macOS VM)

```json
{
  "channels": {
    "bluebubbles": {
      "serverUrl": "http://localhost:1234",
      "password": "your-api-password",
      "webhookPath": "/bluebubbles-webhook"
    }
  }
}
```

---

### Linux (bare metal)

```bash
# Install Node 24 (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 24

# Install OpenClaw
npm install -g openclaw@latest
openclaw onboard --install-daemon

# OpenClaw installs as a systemd user service
systemctl --user status openclaw
```

---

### VPS (DigitalOcean / Hetzner / Linode)

> Recommended for always-on, low-cost Gateway deployments.

```bash
# On VPS (Ubuntu/Debian):
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon

# Gateway binds to 127.0.0.1 by default — use SSH tunnel or Tailscale for remote access
```

Access the dashboard remotely via SSH tunnel:

```bash
ssh -N -L 18789:127.0.0.1:18789 user@your-vps-ip
# Then open: http://localhost:18789/
```

---

### Docker / Docker Compose

> **Sources:**
>
> - https://docs.openclaw.ai/install/docker
> - https://github.com/phioranex/openclaw-docker
> - https://hub.docker.com/r/alpine/openclaw

**Requirements:** Docker Desktop/Engine + Docker Compose v2, minimum 2 GB RAM (build may fail with 1 GB).

#### Option A — From the OpenClaw Repo (Official)

Clone the repo and use the built-in setup script or manual commands:

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Automated setup
./scripts/docker/setup.sh

# Or use a pre-built image instead of building locally:
export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
./scripts/docker/setup.sh
```

**Manual steps (if not using the setup script):**

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

#### Option B — Pre-built Image from Docker Hub (No Repo Clone)

> **Docker Hub:** https://hub.docker.com/r/alpine/openclaw

Pull and run directly without cloning any repo:

```bash
docker pull alpine/openclaw:latest
docker run -it -p 18789:18789 -v ~/.openclaw:/home/node/.openclaw alpine/openclaw:latest
```

**Available image tags:**

| Tag      | Description                          |
| -------- | ------------------------------------ |
| `latest` | Current stable build (updated daily) |
| `vX.Y.Z` | Specific version releases            |
| `main`   | Cutting-edge branch version          |

You can also use this image with the official setup script by setting `OPENCLAW_IMAGE`:

```bash
export OPENCLAW_IMAGE="alpine/openclaw:latest"
```

#### Option C — openclaw-docker by Phioranex (No Repo Clone)

> **Source:** https://github.com/phioranex/openclaw-docker
>
> Community-maintained Docker setup with one-line install scripts. Rebuilds daily; checks for new releases every 6 hours.

**One-line install (Linux/macOS):**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/phioranex/openclaw-docker/main/install.sh)
```

**One-line install (Windows PowerShell):**

```powershell
irm https://raw.githubusercontent.com/phioranex/openclaw-docker/main/install.ps1 | iex
```

The install script handles prerequisites checking, image pulling, onboarding, and gateway startup automatically.

#### Volume Mounts & Persistence

Compose binds these paths for persistence:

| Host path (configurable) | Container path                   | Purpose                          |
| ------------------------ | -------------------------------- | -------------------------------- |
| `OPENCLAW_CONFIG_DIR`    | `/home/node/.openclaw`           | Config, credentials, sessions    |
| `OPENCLAW_WORKSPACE_DIR` | `/home/node/.openclaw/workspace` | Agent files (SOUL.md, MEMORY.md) |

Configuration persists in `~/.openclaw/` across container restarts.

> ⚠️ Monitor disk growth in: `media/`, session JSONL files, `cron/runs/`, and `/tmp/openclaw/`.

#### Key Environment Variables

| Variable                 | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `OPENCLAW_IMAGE`         | Specify remote image instead of local build     |
| `OPENCLAW_EXTENSIONS`    | Pre-install extension dependencies              |
| `OPENCLAW_EXTRA_MOUNTS`  | Add host bind mounts (comma-separated)          |
| `OPENCLAW_HOME_VOLUME`   | Persist `/home/node` in a named volume          |
| `OPENCLAW_SANDBOX`       | Enable agent sandbox (`1`, `true`, `yes`, `on`) |
| `OPENCLAW_DOCKER_SOCKET` | Override Docker socket path                     |
| `OPENCLAW_GATEWAY_BIND`  | Set to `lan` for host access to published ports |

#### Channel Setup (Docker)

```bash
# WhatsApp (QR code)
docker compose run --rm openclaw-cli channels login

# Telegram
docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

# Discord
docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
```

#### Access & Health Checks

Dashboard: `http://127.0.0.1:18789/`

```bash
curl -fsS http://127.0.0.1:18789/healthz    # liveness (no auth)
curl -fsS http://127.0.0.1:18789/readyz     # readiness (no auth)
```

#### Agent Sandbox (Docker)

Sandboxing isolates agent tool execution in a separate container:

```bash
# Build sandbox image
scripts/sandbox-setup.sh

# Enable sandbox via setup script
export OPENCLAW_SANDBOX=1
./scripts/docker/setup.sh
```

Config equivalent:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared
      },
    },
  },
}
```

#### Important Notes

- Container runs as non-root user `node` (uid 1000)
- If permission errors occur, ensure `/home/node/.openclaw` is owned by uid 1000
- For CI/automation, add `-T` flag to `docker compose run` to disable pseudo-TTY allocation
- Use `OPENCLAW_GATEWAY_BIND=lan` if you need host access to published ports

---

### Cloud Platforms (Railway, Fly.io)

> See https://docs.openclaw.ai/install for cloud deployment guides.

---

### From Source

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build
pnpm build
pnpm link --global
openclaw onboard --install-daemon
```

---

## Uninstallation

> **Source:** https://docs.openclaw.ai/install/uninstall

### Quick Uninstall (CLI)

```bash
openclaw uninstall
```

For automated/non-interactive environments:

```bash
openclaw uninstall --all --yes --non-interactive
# Or via npx if the global CLI is broken:
npx -y openclaw uninstall --all --yes --non-interactive
```

### Manual Uninstall Steps

If the CLI is unavailable or you prefer manual removal:

1. **Stop the service:** `openclaw gateway stop`
2. **Uninstall the service:** `openclaw gateway uninstall`
3. **Delete configuration:** `rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"`
4. **Remove workspace (optional):** `rm -rf ~/.openclaw/workspace`
5. **Uninstall CLI** (pick your package manager):
   - `npm rm -g openclaw`
   - `pnpm remove -g openclaw`
   - `bun remove -g openclaw`
6. **macOS app removal (if applicable):** `rm -rf /Applications/OpenClaw.app`

### Platform-Specific Service Removal

**macOS (launchd):**

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
rm -f ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

**Linux (systemd):**

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload
```

**Windows (Scheduled Task):**

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd"
```

### Additional Notes

- **Profiles:** repeat the state directory deletion for each profile (`~/.openclaw-<profile>`)
- **Remote setups:** perform steps 1–4 on the gateway host
- **Source installations:** uninstall the service before deleting the cloned repository

---

## Onboarding Wizard (`openclaw onboard`)

> **Sources:**
>
> - https://docs.openclaw.ai/start/wizard
> - https://docs.openclaw.ai/start/wizard-cli-reference
> - https://github.com/openclaw/openclaw/tree/main/src/wizard

The onboarding wizard is the recommended way to configure a fresh OpenClaw installation. It runs interactively in the terminal and walks through all setup steps in order.

```bash
openclaw onboard
# or, to also install the daemon in one go:
openclaw onboard --install-daemon
```

Re-running the wizard is safe — it detects existing config and lets you choose what to reset rather than overwriting everything blindly.

---

### Two Paths: Quickstart vs Manual (Advanced)

At the start of the wizard (after the risk acknowledgment), you choose your onboarding mode. The actual wizard label is **"Manual"** (was documented as "Advanced" — same flow, renamed):

|                    | Quickstart                               | Manual (Advanced)                         |
| ------------------ | ---------------------------------------- | ----------------------------------------- |
| **Port**           | Default (18789)                          | You choose                                |
| **Bind address**   | Loopback only                            | You choose                                |
| **Auth mode**      | Token (auto-generated)                   | Token or Password                         |
| **Tailscale**      | Off                                      | You choose                                |
| **Daemon install** | Auto (yes)                               | You choose                                |
| **Best for**       | Local, single-user, getting started fast | VPS, remote access, custom network setups |

**Which one should you choose?**

| Environment                                      | Recommendation | Why                                                                                                                                         |
| ------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Local Mac/Linux (personal use, same machine)** | **Quickstart** | Loopback bind is fine — everything runs on one box. No network config needed.                                                               |
| **VPS / remote server**                          | **Manual**     | You need **LAN bind** (`0.0.0.0`) so the gateway is reachable from other machines or through SSH tunnels. Quickstart locks you to loopback. |
| **macOS VM (Lume)**                              | **Manual**     | The VM has its own network interface. You need **LAN bind** so the host Mac can reach the gateway (via SSH tunnel or direct IP).            |
| **Docker (remote host)**                         | **Manual**     | Container networking requires **LAN bind** for published ports to work. Set `OPENCLAW_GATEWAY_BIND=lan` or configure bind in the wizard.    |
| **Tailscale mesh**                               | **Manual**     | Lets you pick Tailnet bind or Funnel exposure — not available in Quickstart.                                                                |
| **Multi-user / shared setup**                    | **Manual**     | Allows password auth, custom port, and explicit security choices.                                                                           |

> **Rule of thumb:** If OpenClaw and everything that talks to it (browser, messaging clients) are on the **same machine**, Quickstart is fine. If **anything needs to reach the gateway over the network** (VPS, VM, Docker, remote access), choose **Manual** and set bind to **LAN**.

**Quickstart defaults:**

- `tools.profile: "coding"` — installs coding tool profile
- `session.dmScope: "per-channel-peer"` — isolated session per channel/peer
- Telegram + WhatsApp DM allowlists enabled

---

### Step-by-Step: Manual Flow

> ⚠️ **Actual step order from live wizard run** — differs from earlier documentation. Workspace and model provider steps come _before_ gateway network settings.

#### Step 0 — Risk Acknowledgment

Before anything else, the wizard surfaces a security acknowledgment you must confirm:

> _"I understand this is personal-by-default and shared/multi-user use requires lock-down."_

Key warnings it covers (actual wizard text):

- "OpenClaw is a hobby project and still in beta. Expect sharp edges."
- "By default, OpenClaw is a personal agent: one trusted operator boundary."
- "This bot can read files and run actions if tools are enabled. A bad prompt can trick it into doing unsafe things."
- "OpenClaw is not a hostile multi-tenant boundary by default. If multiple users can message one tool-enabled agent, they share that delegated tool authority."
- "If you're not comfortable with security hardening and access control, don't run OpenClaw."

Recommended baseline (shown in wizard):

- Pairing/allowlists + mention gating
- Multi-user/shared inbox: split trust boundaries (separate gateway/credentials, ideally separate OS users/hosts)
- Sandbox + least-privilege tools
- Shared inboxes: isolate DM sessions (`session.dmScope: per-channel-peer`) and keep tool access minimal
- Keep secrets out of the agent's reachable filesystem
- Use the strongest available model for any bot with tools or untrusted inboxes

Commands surfaced here:

```bash
openclaw security audit --deep
openclaw security audit --fix    # ⚠️ new — not in earlier docs
```

You cannot proceed without confirming this.

---

#### Step 1 — Config Handling (if existing config detected)

If a config already exists, the wizard shows an **"Existing config detected"** panel with a summary of key settings (API keys, channels, etc.). If it says **"No key settings detected"**, the existing config is empty or minimal — nothing meaningful to preserve.

Then a **"Config handling"** prompt offers three options:

| Option                  | What it does                                                               | When to choose                                                          |
| ----------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Use existing values** | Keeps current `openclaw.json` and skips reconfiguring already-set values   | You already configured things manually and want to keep them            |
| **Update values**       | Walks through the wizard but lets you selectively change specific settings | You want to tweak a few settings without losing everything              |
| **Reset**               | Wipes and starts fresh — opens a follow-up prompt to choose reset scope    | First real setup, or "No key settings detected" — nothing worth keeping |

> **Recommendation:** If the panel says "No key settings detected", choose **Reset** for a clean slate. If you've already configured API keys or channels and want to keep them, choose **Use existing values** or **Update values**.

##### Reset Scope (shown after choosing Reset)

| Option                              | What it clears                                                             |
| ----------------------------------- | -------------------------------------------------------------------------- |
| **Config only**                     | `openclaw.json` config file only                                           |
| **Config + credentials + sessions** | Config, stored API keys, and active session data (default `--reset` scope) |
| **Full reset**                      | Everything above + workspace directory removal (`--reset-scope full`)      |

If no existing config is found, this step is skipped.

---

#### Step 2 — Gateway: Setup Mode

Choose where the gateway will run:

| Option     | Description                                                                            |
| ---------- | -------------------------------------------------------------------------------------- |
| **Local**  | Gateway runs on this machine — full setup proceeds                                     |
| **Remote** | Info-only mode; wizard explains how to connect to a gateway running on another machine |

For most setups, choose **Local**.

---

#### Step 3 — Workspace Directory

> ⚠️ **Actual order:** Workspace comes _before_ gateway network settings in the live wizard (not after as earlier docs suggested).

Sets the directory where OpenClaw stores agent files (SOUL.md, MEMORY.md, skills, etc.).

- **Default:** `~/.openclaw/workspace`
- Can be any path you have write access to
- Quickstart always uses the default; Manual lets you customise

---

#### Step 4 — API Key / Model Provider

Select your model provider and enter your API credentials.

**Supported providers:** Anthropic, OpenAI, OpenAI Code (OAuth), Anthropic OAuth (Claude Code CLI), Anthropic setup-token, xAI (Grok), OpenCode, Vercel AI Gateway, Cloudflare AI Gateway, MiniMax, Ollama, Moonshot/Kimi, OpenRouter, Qwen, and custom providers.

##### Secret Input Mode

When entering API keys, you have two storage modes:

| Mode                                      | How it works                                                                 | Best for                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| **Plaintext**                             | Key is stored directly in `openclaw.json`                                    | Simple local setups                       |
| **SecretRef** (`--secret-input-mode ref`) | Stores a reference like `env:MY_API_KEY` — resolved at runtime from env vars | VPS/server setups, shared machines, CI/CD |

SecretRef format: `source:provider:id` — e.g. `env:system:ANTHROPIC_API_KEY`

If a SecretRef can't be resolved at startup, OpenClaw throws a descriptive error: `"[path]: failed to resolve SecretRef [reference]: [reason]"`.

##### Custom Provider Options (advanced / non-interactive)

| Flag                     | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| `--custom-base-url`      | Base URL of your custom provider endpoint                   |
| `--custom-model-id`      | Model identifier string                                     |
| `--custom-api-key`       | API key (falls back to `CUSTOM_API_KEY` env var if omitted) |
| `--custom-provider-id`   | Name to label this provider in config                       |
| `--custom-compatibility` | API format: `openai` (default) or `anthropic`               |

---

#### Step 5 — Model Selection

After configuring the provider, choose the default model.

- The wizard lists available models for the selected provider
- This becomes the default model for all agents unless overridden per-agent
- Can be changed later via `openclaw config` or editing `openclaw.json`
- Option to "Keep current" if already configured

---

#### Step 6 — Gateway: Port

Set the port the gateway listens on.

- **Default:** `18789`
- Must be a valid port number
- Quickstart always uses the default; Manual lets you change it
- If you change it, update all channel configs and clients accordingly

---

#### Step 7 — Gateway: Bind Address

Controls which network interfaces the gateway accepts connections from.

| Option       | Binds to                | When to use                                                                                                                                              |
| ------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Loopback** | `127.0.0.1`             | Gateway only reachable from the same machine. Works well when you access the dashboard via SSH tunnel, or when everything runs on one local box.         |
| **LAN**      | `0.0.0.0`               | Gateway listens on all interfaces. Required for VPS or any setup where the dashboard or API needs to be reachable from another machine on the network.   |
| **Tailnet**  | Tailscale IP            | Exposes the gateway only on your private Tailscale mesh. Good if you use Tailscale to connect between machines without opening anything to the internet. |
| **Auto**     | Loopback → LAN fallback | Tries loopback first; falls back to LAN if that fails. Low-friction option if you're unsure.                                                             |
| **Custom**   | User-specified IPv4     | Bind to a specific IP on a multi-homed machine.                                                                                                          |

> ⚠️ **Tailscale constraint:** Selecting Tailnet forces `bind=loopback` internally — Tailscale handles the network exposure layer.

> ⚠️ **SECURITY ERROR with LAN bind:** After the wizard completes, if you chose LAN and open the web Control UI, you'll see: `"SECURITY ERROR: Gateway URL 'ws://192.168.64.2:18789' uses plaintext ws:// to a non-loopback address."` and the Control UI shows "Gateway: not detected". The gateway itself still runs fine — this is the web UI refusing to connect over unencrypted `ws://` to a non-loopback host. To use the dashboard in this case: open it from the same machine via `localhost`, or put TLS in front of the gateway.

---

#### Step 8 — Gateway: Authentication Mode

Controls how clients authenticate to the gateway.

| Option                | How it works                     | Notes                                     |
| --------------------- | -------------------------------- | ----------------------------------------- |
| **Token** _(default)_ | Auto-generated bearer token      | Recommended for both local and remote use |
| **Password**          | User-defined password credential | Required if using Tailscale Funnel mode   |

For token mode, the wizard can either auto-generate a token or let you provide your own.

##### Token Storage (shown after choosing Token auth)

After selecting Token auth mode, the wizard asks how to store the gateway token:

| Option                                         | How it works                                                                             | Best for                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Generate/store plaintext token** _(default)_ | Auto-generates a token and saves it directly in `openclaw.json`                          | Simple local setups, single-user machines |
| **Use SecretRef**                              | Stores a reference like `env:OPENCLAW_GATEWAY_TOKEN` — resolved at runtime from env vars | VPS/server setups, shared machines, CI/CD |

> **Recommendation:** Use **plaintext** (default) for personal machines and local development. Use **SecretRef** if you're on a shared server, running in Docker/CI, or don't want secrets in the config file. SecretRef format: `source:provider:id` — e.g. `env:system:OPENCLAW_GATEWAY_TOKEN`.

---

#### Step 9 — Gateway: Tailscale Exposure

Only relevant if you have Tailscale installed and want remote access without SSH tunnels.

| Option              | What it does                                                               |
| ------------------- | -------------------------------------------------------------------------- |
| **Off** _(default)_ | No Tailscale — gateway only accessible via local bind address              |
| **Serve**           | Exposes gateway to your Tailnet (private mesh only)                        |
| **Funnel**          | Exposes gateway publicly via Tailscale Funnel — **requires password auth** |

If the Tailscale binary isn't detected on the system, the wizard will warn you.

The wizard also asks whether to **reset Tailscale config on exit** — useful during testing so you don't leave stale Tailscale configurations behind.

---

#### Step 10 — Channel Setup

The wizard shows a **channel status panel** listing all channels and their current state before asking if you want to configure them now. The panel distinguishes:

- Built-in channels: Telegram, WhatsApp, Discord, Slack, Signal, iMessage, IRC, Google Chat, LINE
- Plugin channels (require separate install): Feishu/Lark, Nostr, Microsoft Teams, Mattermost, Nextcloud Talk, Matrix, BlueBubbles, Zalo, Zalo Personal, Synology Chat, Tlon

Then a **"How channels work"** info panel is shown before letting you select a channel to configure. You can configure multiple channels in sequence, then select "Finished".

Each channel has its own auth flow and DM policy configuration. After channel selection, the wizard asks:

1. Whether to configure DM access policies now (default: pairing)
2. The DM policy for that channel (Pairing recommended)

---

#### Step 11 — Web Search Configuration

The wizard checks for configured search providers (Brave Search, etc.) and their API keys. If none are set, it alerts you that web search won't work until configured.

---

#### Step 12 — Skills Setup

Install recommended skills from ClawHub for your use case.

- Quickstart installs a curated "coding tool profile" by default
- Manual lets you pick skills manually
- The wizard reports: Eligible, Missing requirements, Unsupported on this OS, Blocked by allowlist
- Skills can also be installed/removed later via `openclaw skills`

---

#### Step 13 — Hooks (NEW)

> ⚠️ Not in earlier documentation — confirmed in live wizard run.

The wizard asks if you want to enable hooks.

**What hooks are:** Shell commands that run automatically when agent commands are issued.

**Example use case:** Save session context to memory when you issue `/new` or `/reset`.

**Docs:** https://docs.openclaw.ai/automation/hooks

Option: "Skip for now" is available.

---

#### Step 14 — Gateway Service Runtime + Daemon Installation

First selects the runtime:

- **Node** (recommended)
- Other options may be available

Then installs OpenClaw as a persistent background service so it starts automatically.

| Platform | Service type         | Path                                               |
| -------- | -------------------- | -------------------------------------------------- |
| macOS    | LaunchAgent          | `~/Library/LaunchAgents/ai.openclaw.gateway.plist` |
| Linux    | systemd user service | systemd user service                               |

Logs: `~/.openclaw/logs/gateway.log`

The wizard asks whether to install the daemon (Quickstart defaults to yes).

For Linux, it also handles **systemd user lingering** — ensures the user service keeps running after you log out. If systemd isn't available, it skips this with a notification.

If a daemon is already installed, you're offered:

- **Restart** the existing service
- **Reinstall** (removes old, installs fresh)
- **Skip** (leave it as-is)

---

#### Step 15 — Health Check

The wizard verifies the gateway is reachable and channel connections are working. It shows per-channel status, e.g. "Discord: ok (@Ken) (1059ms)".

Also shows:

- Agents configured (e.g. "Agents: main (default)")
- **Heartbeat interval** — default observed in live run: **30m (main)** (not 55m as in cost optimization docs — that 55m is a recommended override for cache warming, not the out-of-box default)
- Session store path + entry count

---

#### Step 16 — Optional Apps (NEW)

> ⚠️ Not in earlier documentation — confirmed in live wizard run.

The wizard presents optional node apps for additional capabilities:

- **macOS app** — system integration + notifications
- **iOS app** — camera/canvas workflows
- **Android app** — camera/canvas workflows

---

#### Step 17 — Control UI Panel

Displays the web UI URL and token. If bound to a non-loopback address, also shows the security warning about plaintext `ws://`.

---

#### Step 18 — Workspace Backup (NEW)

> ⚠️ Not in earlier documentation — confirmed in live wizard run.

The wizard prompts to back up your agent workspace.

**Docs:** https://docs.openclaw.ai/concepts/agent-workspace

---

#### Step 19 — Security Reminder

A final security reminder panel pointing to https://docs.openclaw.ai/security.

---

#### Step 20 — Shell Completion

Installs tab-completion for the `openclaw` CLI in your shell (bash/zsh).

- Quickstart: auto-installs without prompting
- Manual: prompts for confirmation
- If already installed, this step is skipped
- If installation fails, it suggests running `openclaw completion --install` manually

---

#### Step 21 — Dashboard Ready

Final panel showing the full dashboard URL with auth token, and SSH tunnel command if no GUI is detected.

---

#### Step 22 — What Now (NEW)

> ⚠️ Not in earlier documentation — confirmed in live wizard run.

Final step directs you to: https://openclaw.ai/showcase ("What People Are Building").

---

### CLI Flags Reference

```bash
openclaw onboard [flags]
```

#### Reset Flags

| Flag                 | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `--reset`            | Reset config, credentials, and sessions before re-running |
| `--reset-scope full` | Full reset — includes workspace directory removal         |

#### Automation / Non-Interactive Flags

| Flag                | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `--non-interactive` | Run without prompts — requires all values supplied via other flags |
| `--install-daemon`  | Automatically install the gateway daemon as part of onboarding     |

#### Authentication Flags

| Flag                                | Description                                                  |
| ----------------------------------- | ------------------------------------------------------------ |
| `--auth-choice <option>`            | Pre-select auth method (e.g. `custom-api-key`)               |
| `--secret-input-mode ref`           | Store credentials as env var references instead of plaintext |
| `--gateway-token-ref-env <ENV_VAR>` | Env var name to use for the gateway token in SecretRef mode  |

#### Custom Provider Flags

| Flag                                         | Description                                                 |
| -------------------------------------------- | ----------------------------------------------------------- |
| `--custom-base-url <url>`                    | Base URL for a custom OpenAI/Anthropic-compatible provider  |
| `--custom-model-id <id>`                     | Model identifier for the custom provider                    |
| `--custom-api-key <key>`                     | API key (optional — falls back to `CUSTOM_API_KEY` env var) |
| `--custom-provider-id <name>`                | Display name for the custom provider in config              |
| `--custom-compatibility <openai\|anthropic>` | API compatibility mode (default: `openai`)                  |

---

### Quick Reference: Common Invocations

```bash
# Standard first-time setup
openclaw onboard

# First-time setup + auto-install daemon
openclaw onboard --install-daemon

# Re-run wizard and reset everything
openclaw onboard --reset

# Full wipe and start fresh (deletes workspace too)
openclaw onboard --reset --reset-scope full

# Automate with a custom OpenAI-compatible provider (no prompts)
openclaw onboard \
  --non-interactive \
  --install-daemon \
  --auth-choice custom-api-key \
  --custom-provider-id my-provider \
  --custom-base-url https://api.my-provider.com/v1 \
  --custom-model-id my-model-id \
  --custom-compatibility openai \
  --secret-input-mode ref \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

---

## Configuration

### Config File Location

```
~/.openclaw/openclaw.json   # main config (JSON5 format)
~/.openclaw/workspace/      # agent files (SOUL.md, MEMORY.md, skills)
~/.openclaw/credentials/    # stored API keys / channel credentials
~/.openclaw/cron/           # cron job store and run history
```

### Config Structure (overview)

The config file is JSON5 format (comments and trailing commas are fine).

```json5
{
  // API keys injected as environment variables — resolved at runtime
  "env": {
    "ANTHROPIC_API_KEY": "sk-ant-...",
    "OPENAI_API_KEY":    "sk-...",
    "GOOGLE_API_KEY":    "...",
    "DEEPSEEK_API_KEY":  "..."
  },

  // Gateway settings
  gateway: {
    port: 18789,
    bind: "loopback",       // loopback | lan | tailnet | auto | custom
    auth: {
      mode: "token",        // token | password
      token: "your-token",
    },
  },

  // Agent/model settings
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-haiku-4-5",   // ⚠️ MUST be full model path, not alias
        fallbacks: ["openai/gpt-4o"],
      },
      heartbeat: {
        every: "55m",                             // keep cache warm; fires before 1hr TTL
      },
      contextPruning: {
        mode: "cache-ttl",
        ttl:  "1h",
      },
      models: {
        // allowlist + aliases — keys must be full provider/model paths
        "anthropic/claude-haiku-4-5":  { alias: "haiku" },
        "anthropic/claude-sonnet-4-6": { alias: "sonnet", params: { cacheRetention: "short" } },
        "anthropic/claude-opus-4-6":   { alias: "opus",   params: { cacheRetention: "long" } },
      },
    },
  },

  // Diagnostics (top-level, sibling of "agents")
  diagnostics: {
    cacheTrace: { enabled: true },
  },

  // Channel configs
  channels: {
    telegram: { ... },
    whatsapp: { ... },
    discord:  { ... },
    slack:    { ... },
  },

  // Workspace directory (default: ~/.openclaw/workspace)
  workspace: "~/.openclaw/workspace",
}
```

### Editing the Config File

**Option A — nano (terminal):**

```bash
nano ~/.openclaw/openclaw.json
```

| Action        | Keys                          |
| ------------- | ----------------------------- |
| Save          | `Ctrl+O` then `Enter`         |
| Exit          | `Ctrl+X`                      |
| Save and exit | `Ctrl+O` → `Enter` → `Ctrl+X` |
| Undo          | `Alt+U`                       |
| Jump to line  | `Ctrl+_` then type number     |

**Option B — VS Code Remote SSH (recommended for longer edits):**

1. Install the **Remote - SSH** extension (by Microsoft) in VS Code
2. Click the `><` icon (bottom-left) → **Connect to Host…** → **Add New SSH Host…**
3. Enter `ssh your_username@your_server_address` → save to `~/.ssh/config`
4. Click `><` → **Connect to Host…** → select your server
5. Once connected (bottom-left turns green): **Open Folder** → `/root/.openclaw` (or `/home/youruser/.openclaw`)
6. VS Code underlines JSON errors in red as you type — press `Ctrl+Shift+M` to see all errors at once
7. Open a terminal inside VS Code with `` Ctrl+` ``

> ⚠️ **Never commit `openclaw.json` to a public repository** — it contains your API keys.
> Add to gitignore: `echo ".openclaw/" >> ~/.gitignore`

### Key Environment Variables

| Variable                 | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `OPENCLAW_GATEWAY_TOKEN` | Gateway auth token                            |
| `ANTHROPIC_API_KEY`      | Anthropic API key                             |
| `OPENAI_API_KEY`         | OpenAI API key                                |
| `OPENROUTER_API_KEY`     | OpenRouter API key                            |
| `OPENCLAW_SKIP_CRON`     | Set to `1` to disable cron entirely           |
| `CUSTOM_API_KEY`         | Fallback for custom provider key in `onboard` |
| `DISCORD_BOT_TOKEN`      | Discord bot token (alt to config)             |

### Adding a Second Agent

```bash
openclaw agents add <name>
```

Each agent gets its own workspace, memory, SOUL.md, and sessions.

---

## Channels

### Telegram

> **Source:** https://docs.openclaw.ai/channels/telegram

Fastest channel to set up (bot token only, no QR pairing).

#### Setup

1. Talk to [@BotFather](https://t.me/BotFather) → `/newbot` → get your bot token
2. Add `channels.telegram.botToken` to `~/.openclaw/openclaw.json`
3. Restart the gateway

```json5
{
  channels: {
    telegram: {
      botToken: "123456:ABC-DEF...",
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
    },
  },
}
```

#### DM Policy

| Policy      | Behavior                                             |
| ----------- | ---------------------------------------------------- |
| `pairing`   | Users must DM the bot and confirm a pairing code     |
| `allowlist` | Only numeric Telegram user IDs in `allowFrom` can DM |
| `open`      | Any user can DM (not recommended)                    |
| `disabled`  | No DMs                                               |

#### Group Policy

```json5
{
  channels: {
    telegram: {
      groupPolicy: "allowlist", // open | allowlist | disabled
      groupAllowFrom: ["12345678"], // allowed user IDs
      groups: {
        "-1001234567890": {
          // specific group config
          requireMention: true,
          allowFrom: ["12345678"],
        },
        "*": {
          // global group defaults
          requireMention: true,
        },
      },
    },
  },
}
```

#### Key Config Options

| Key              | Description                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| `botToken`       | BotFather-issued token                                                    |
| `dmPolicy`       | DM access control (pairing/allowlist/open/disabled)                       |
| `allowFrom`      | Numeric Telegram user IDs for DM allowlist                                |
| `groupPolicy`    | Group access control                                                      |
| `groupAllowFrom` | Allowed user IDs in groups                                                |
| `streaming`      | `off \| partial \| block \| progress` — live preview (default: `partial`) |
| `textChunkLimit` | Max chars per message chunk (default: 4000)                               |
| `replyToMode`    | `off \| first \| all` — reply threading behavior                          |
| `webhookUrl`     | Enable webhook mode instead of long polling                               |
| `proxy`          | SOCKS/HTTP proxy for Bot API calls                                        |

#### Forum Topics (Supergroups)

Each topic gets its own isolated session. Route different topics to different agents:

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          topics: {
            "3": { agentId: "dev-agent" },
            "5": { agentId: "ops-agent" },
          },
        },
      },
    },
  },
}
```

---

### Discord

> **Source:** https://docs.openclaw.ai/channels/discord

Supports both **Direct Messages** (with the bot) and **Guild channels** (in a server). Each has its own isolated session context. Long-term memory only loads automatically in DM sessions — in guild channels you access it via memory tools.

#### Prerequisites

- A Discord account
- A Discord server you own or admin (**create one first** — see gotcha below)
- Developer Mode enabled in Discord: **User Settings → Advanced → Developer Mode**

#### Steps

**Step 1 — Create a Discord Application**

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**, give it a name (this becomes your bot's identity)
3. Navigate to the **Bot** tab → Add a Bot

**Step 2 — Enable Required Intents**

In the **Bot** tab, enable these Privileged Gateway Intents:

| Intent                 | Required?                                |
| ---------------------- | ---------------------------------------- |
| Message Content Intent | ✅ Required                              |
| Server Members Intent  | Recommended (needed for role allowlists) |
| Presence Intent        | Optional                                 |

**Step 3 — Configure Bot Permissions & Generate Invite URL**

In the **OAuth2 → URL Generator** tab:

- Scopes: `bot`, `applications.commands`
- Bot Permissions: View Channels, Send Messages, Read Message History, Embed Links, Attach Files, (optionally) Add Reactions

Copy the generated URL — you'll use it to add the bot to your server.

**Step 4 — Add the Bot to Your Server & Collect IDs**

> ⚠️ **Gotcha:** When you open the OAuth2 invite URL, Discord shows a dropdown of servers to add the bot to. If you haven't created a server yet, the list will be empty. **Create a Discord server first**, then open the URL — your server will appear in the dropdown.

Open the invite URL in your browser, select your server, and authorise the bot.

Then collect these IDs (right-click each in Discord with Developer Mode on → **Copy ID**):

| ID               | Where to find it                         |
| ---------------- | ---------------------------------------- |
| **Server ID**    | Right-click your server name             |
| **Your User ID** | Right-click your username                |
| **Bot Token**    | Developer Portal → Bot tab → Reset Token |

> ⚠️ Treat the Bot Token as a secret — never commit it to version control.

**Step 5 — Enable DMs from Server Members**

In your Discord server's **Privacy Settings**, enable "Allow direct messages from server members". This is required for the pairing workflow.

**Step 6 — Store Bot Token & Configure OpenClaw**

Set the token in your OpenClaw config (or as an environment variable `DISCORD_BOT_TOKEN`) and restart the gateway.

**Step 7 — Pair via DM**

1. DM your bot in Discord
2. The bot will send back a pairing code
3. Approve the code through your agent or via CLI to activate the channel

#### After Pairing

- **DM sessions:** Full long-term memory, pairing mode by default
- **Guild channels:** Allowlisted by default — you must explicitly register your server to enable it. Each channel gets its own isolated session. Use memory tools to access context.
- Slash commands and native commands are both supported with auth enforcement
- Mention requirement can be disabled for private guild workspaces

---

### WhatsApp

> **Source:** https://docs.openclaw.ai/channels/whatsapp

Production-ready via WhatsApp Web protocol (Baileys). Requires QR code pairing on first setup.

#### Setup

```bash
openclaw channels login --channel whatsapp
# Scan the QR code with WhatsApp on your phone
```

#### Key Notes

- **DM policy:** `pairing | allowlist | open | disabled`
- **Credentials stored at:** `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Multi-account:** supported
- **Text chunk limit:** 4000 chars (default)
- **Media limit:** 50 MB (default)
- **Groups:** sender allowlists supported

#### Config

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      dmPolicy: "allowlist",
      groups: {
        "*": { requireMention: true },
      },
    },
  },
}
```

---

### Slack

> **Source:** https://docs.openclaw.ai/channels/slack

#### Token Model

- **Socket Mode** (default): `botToken` + `appToken`
- **HTTP Events API mode**: `botToken` + `signingSecret`

#### Required Scopes

`channels:history`, `channels:read`, `chat:write`, `files:write`, `im:history`, `im:read`, `im:write`, `users:read`, `groups:history`, `groups:read`, `mpim:history`, `mpim:read`

#### Setup

```json5
{
  channels: {
    slack: {
      botToken: "xoxb-...",
      appToken: "xapp-...", // for Socket Mode
      dmPolicy: "pairing",
    },
  },
}
```

#### Interactive Replies

```
[[slack_buttons: Yes | No | Cancel]]
[[slack_select: Option A | Option B | Option C]]
```

#### Key Notes

- DM policy: `pairing | allowlist | open | disabled`
- Text streaming supported via native Slack streaming API
- Threading: each Slack thread gets its own session
- Delivery targets: `user:<id>`, `channel:<id>`

---

### iMessage

> **Source:** https://docs.openclaw.ai/channels/imessage

Two options:

1. **BlueBubbles** (recommended for new setups) — runs on a Mac you control, exposes an HTTP API
2. **Legacy imsg** integration — direct macOS Automation access

#### BlueBubbles Setup

1. Install BlueBubbles on a Mac
2. Configure OpenClaw to connect to it:

```json5
{
  channels: {
    bluebubbles: {
      serverUrl: "http://localhost:1234",
      password: "your-api-password",
      webhookPath: "/bluebubbles-webhook",
    },
  },
}
```

#### Legacy imsg Requirements

- macOS with Full Disk Access granted to Terminal/node
- Automation permission for Messages app

#### Deployment Patterns

- Dedicated bot macOS user on the same machine
- Remote Mac over Tailscale (SSH tunnel for gateway access)

---

### Web UI (Control UI / Dashboard)

The built-in web dashboard provides a browser-based chat interface to interact with your OpenClaw agent.

#### Getting the Dashboard URL & Token

```bash
# Print the dashboard URL + token without auto-opening the browser
openclaw dashboard --no-open
```

This outputs the full URL including the auth token, e.g.:

```
http://localhost:18789/#token=xxxxxxxxxxxx
```

Use `--no-open` when you're on a remote/VM machine and want to copy the URL to open it elsewhere.

#### Accessing the Dashboard from a Remote Machine / VM

When OpenClaw is running inside a **macOS VM (Lume)** or any remote machine, the gateway binds to `127.0.0.1` (loopback) inside the VM. This means the URL `http://192.168.64.X:18789` is **not reachable** from your host Mac — the port isn't exposed on the VM's external interface.

**Fix: SSH tunnel**

Set up a local port forward from your main Mac:

```bash
ssh -N -L 18789:127.0.0.1:18789 <your-vm-user>@192.168.64.X
```

Then open the dashboard using `localhost` instead of the VM IP:

```bash
http://localhost:18789/#token=xxxxxxxxxxxx
```

| Flag                       | Meaning                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `-N`                       | Don't execute a remote command — tunnel only               |
| `-L 18789:127.0.0.1:18789` | Forward local port 18789 → port 18789 on the VM's loopback |

> 💡 This same SSH tunnel pattern applies to any remote machine (VPS, Linux server, etc.) where the gateway is bound to loopback.

> ⚠️ Keep the tunnel terminal open while using the dashboard — closing it drops the connection.

---

### Terminal UI (Hatch / TUI)

```bash
openclaw tui
# or
openclaw hatch
```

Opens an interactive terminal UI. The wizard uses TUI mode at the end of onboarding to bootstrap the agent with `"Wake up, my friend!"`.

---

### Signal

> Requires `signal-cli` installed and linked device. More setup involved.

### IRC

Classic IRC networks with DM/channel routing and pairing controls.

### Google Chat

Google Workspace Chat app via HTTP webhook.

### LINE

LINE Messaging API webhook bot.

### Feishu / Lark

> Plugin channel — install separately.

飞书/Lark enterprise messaging with doc/wiki/drive tools.

### Nostr

> Plugin channel — install separately.

Decentralized protocol; encrypted DMs via NIP-04.

### Microsoft Teams

> Plugin channel — install separately.

Bot Framework; enterprise support.

### Mattermost

> Plugin channel — install separately.

Self-hosted Slack-style chat.

### Nextcloud Talk

> Plugin channel — install separately.

Self-hosted chat via Nextcloud Talk webhook bots.

### Matrix

> Plugin channel — install separately.

Open protocol.

### Zalo / Zalo Personal

> Plugin channel — install separately.

Vietnam-focused messaging platform. Zalo Personal uses QR code login.

### Synology Chat

> Plugin channel — install separately.

Connect your Synology NAS Chat to OpenClaw.

### Tlon

> Plugin channel — install separately.

Decentralized messaging on Urbit.

---

## Security

> **Source:** https://docs.openclaw.ai/security

### Security Model

OpenClaw is **personal-by-default** — designed for a single user or small trusted group. It is **not** a hardened multi-tenant system out of the box. Shared or team deployments require additional hardening.

### Quick Security Audit

```bash
openclaw security audit --deep
openclaw security audit --fix
```

### Hardening Checklist

- `chmod 700 ~/.openclaw` — restrict directory access
- `chmod 600 ~/.openclaw/openclaw.json` — restrict config file
- Use strong auto-generated token auth (`gateway.auth.mode: "token"`)
- Set `dmPolicy: "pairing"` or `"allowlist"` (never `"open"` in production)
- Set `groupPolicy: "allowlist"` with explicit group IDs
- Use `requireMention: true` in group channels
- Never bind to `0.0.0.0` on a public VPS without a firewall
- Prefer Tailscale or SSH tunnels for remote access

### File Locations

| Path                                     | Contents                                      |
| ---------------------------------------- | --------------------------------------------- |
| `~/.openclaw/credentials/`               | Channel credentials (WhatsApp sessions, etc.) |
| `~/.openclaw/agents/<agentId>/sessions/` | Session transcripts                           |
| `~/.openclaw/openclaw.json`              | Main config including API keys                |

### Prompt Injection Risk

Smaller/cheaper models are more susceptible to prompt injection attacks from untrusted content. Use stronger models for higher-trust environments and be cautious about what content the agent can access.

### Reporting Security Issues

security@openclaw.ai

---

## Skills & ClawHub

> **Source:** https://docs.openclaw.ai/skills, https://docs.openclaw.ai/clawhub

### What are Skills?

Skills are AgentSkills-compatible directories containing a `SKILL.md` file with YAML frontmatter + instructions. They extend the agent's capabilities with new tools, behaviors, or slash commands.

### Load Precedence

1. `<workspace>/skills/` — workspace-local skills (highest priority)
2. `~/.openclaw/skills/` — user-global skills
3. Bundled skills (lowest priority)

Extra directories via `skills.load.extraDirs` in config.

### SKILL.md Fields

```yaml
---
name: my-skill
description: What this skill does
homepage: https://example.com
user-invocable: true # can user invoke with /skill-name?
disable-model-invocation: false
command-dispatch: true # enable command dispatch
command-tool: shell # shell | node | etc.
command-arg-mode: append # how args are passed
requires:
  bins: [git, gh] # required binaries
  anyBins: [node, bun] # at least one of these
  env: [GITHUB_TOKEN] # required env vars
  config: [channels.telegram]
os: [darwin, linux] # platform restriction
---
Your skill instructions here...
```

### Token Impact

Each loaded skill adds ~195 chars base overhead + ~97 chars per skill to the context. Keep skills lean.

### ClawHub

Public skill registry at https://clawhub.com

```bash
# Install ClawHub CLI
npm i -g clawhub

# Find skills
clawhub search "github"

# Install a skill
clawhub install <slug>

# Sync installed skills
clawhub sync

# Publish your own skill
clawhub publish <path>
```

Skills install to `./skills` by default. Set `CLAWHUB_DISABLE_TELEMETRY=1` to disable telemetry.

---

## Memory System

> **Sources:**
>
> - https://docs.openclaw.ai/concepts/memory#memory
> - https://docs.openclaw.ai/reference/memory-config
> - https://lumadock.com/tutorials/openclaw-advanced-memory-management
> - https://velvetshark.com/openclaw-memory-masterclass
> - https://milvus.io/blog/we-extracted-openclaws-memory-system-and-opensourced-it-memsearch.md

OpenClaw uses a **markdown-first, file-based memory system**. All memory lives as plain Markdown files — human-readable, editable, and version-controllable. The vector store is a derived index that can be rebuilt anytime from these source files.

### Memory Architecture — Four Layers

| Layer                                                                  | What it is                                                              | Survives compaction?                                     |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| **Bootstrap Files** (SOUL.md, USER.md, MEMORY.md, TOOLS.md, AGENTS.md) | Injected at every session start from disk                               | ✅ Yes — reloads from disk                               |
| **Session Transcript** (JSONL on disk)                                 | Conversation history at `~/.openclaw/agents/<agentId>/sessions/*.jsonl` | ⚠️ Compacted — summary replaces detailed history (lossy) |
| **LLM Context Window** (in-memory)                                     | The fixed ~200K token container where all content competes              | ❌ Temporary — cleared on session end                    |
| **Retrieval Index** (SQLite + embeddings)                              | Searchable layer — vector + keyword (BM25) hybrid search                | ✅ Yes — rebuilt from files                              |

> **Golden rule:** "If it's not written to a file, it doesn't exist." Chat-only instructions disappear on compaction or session end.

### Memory Files

| File                                         | Purpose                                | Loaded at session start?                                                         |
| -------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| `~/.openclaw/workspace/SOUL.md`              | Agent identity + standing instructions | ✅ Always                                                                        |
| `~/.openclaw/workspace/USER.md`              | User preferences and profile           | ✅ Always                                                                        |
| `~/.openclaw/workspace/MEMORY.md`            | Long-term persistent memory (curated)  | ⚠️ Prioritized over lowercase `memory.md`; query via `memory_search()` on demand |
| `~/.openclaw/workspace/memory/YYYY-MM-DD.md` | Daily memory logs (append-only)        | ✅ Today's + yesterday's loaded                                                  |
| `~/.openclaw/agents/<agentId>/sessions/`     | Per-session conversation transcripts   | ❌ Not auto-loaded; searchable if session memory enabled                         |

**Bootstrap file limits:** Per-file max **20,000 characters**; aggregate cap **150,000 characters** (~50K tokens).

### How It Works

- **SOUL.md**: Agent identity + routing rules + behavioral instructions. Any change resets the prompt cache — avoid mid-session edits.
- **USER.md**: User-specific preferences and profile context. Also resets cache on change.
- **MEMORY.md**: Curated persistent memory for decisions, preferences, durable facts. Keep concise (under ~100 lines). Weekly, promote durable rules from daily logs here.
- **Daily memory files** (`memory/YYYY-MM-DD.md`): Append-only session summaries. The agent writes a bullet-point summary (<500 words) at session end. System reads today's + yesterday's logs at session start.
- **Session transcripts**: Each channel+peer combination gets its own session. Stored as JSONL.

### Memory Tools

| Tool            | Purpose                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `memory_search` | Semantic recall across indexed snippets — hybrid search (BM25 + vector). Returns ~700 char snippets with file path, line range, relevance score |
| `memory_get`    | Targeted reading of specific Markdown files or line ranges. Rejects paths outside `MEMORY.md`/`memory/`                                         |

Both tools require `memorySearch.enabled: true` (default).

### Three Critical Failure Modes

Understanding how memory is lost helps prevent it:

| Failure             | What happens                                                                    | Prevention                                                   |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Never Stored**    | Instructions exist only in conversation, disappear on session end or compaction | Always write important info to files explicitly              |
| **Compaction Loss** | Details/nuance drop during summarization; agent works from lossy summaries      | Use memory flush (see below) + explicit `/remember` commands |
| **Pruning Trimmed** | Tool outputs cleared from context to optimize caching                           | Temporary — re-run tools or write summaries to memory files  |

### Pre-Compaction Memory Flush

Automatically saves important context before context overflow triggers compaction:

```json5
{
  agents: {
    defaults: {
      reserveTokensFloor: 40000, // headroom before compaction triggers
      memoryFlush: {
        enabled: true,
        softThresholdTokens: 4000, // triggers silent agentic turn to save memories
        systemPrompt: "Session nearing compaction. Store durable memories now.",
      },
    },
  },
}
```

> 💡 **Compaction timing trick:** Before switching tasks — save context to memory, manually run `/compact`, then add new instructions. This gives max lifespan in fresh context.

### Session Isolation

| Setting                               | Behavior                                        |
| ------------------------------------- | ----------------------------------------------- |
| `session.dmScope: "per-channel-peer"` | Each channel+peer has its own session (default) |
| `session.dmScope: "global"`           | All DMs share one session across channels       |

### Memory in Multi-Channel Setups

- DM sessions (Telegram, WhatsApp, Discord DMs): long-term memory auto-loaded
- Group/guild channels: use `/memory` or memory tools to access persistent context
- Per-topic sessions in Telegram forums: isolated by topic ID

### Memory Search Configuration

#### Embedding Providers (auto-selected in order)

1. `local` — if GGUF model file exists (~0.6 GB `embeddinggemma-300m-qat-Q8_0.gguf`; auto-downloads)
2. `openai` — if API key available (`text-embedding-3-small` default)
3. `gemini` — if API key available (`gemini-embedding-001` default)
4. `voyage` — if API key available
5. `mistral` — if API key available
6. Disabled until manually configured

Set explicitly: `memorySearch.provider = "local" | "openai" | "gemini" | "voyage" | "mistral" | "ollama"`

#### Basic Configuration

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        enabled: true, // default
        provider: "local", // or "openai", "gemini", etc.
        fallback: "openai", // fallback if primary fails; "none" to disable

        // Local embeddings
        local: {
          modelPath: "path/to/model.gguf",
          modelCacheDir: "~/.cache/embeddings",
        },

        // Remote embeddings (OpenAI, Gemini, Voyage, etc.)
        remote: {
          baseUrl: "https://api.example.com/v1/",
          apiKey: "YOUR_KEY",
          headers: { "X-Custom-Header": "value" },
        },

        // Index storage
        store: {
          path: "~/.openclaw/memory/{agentId}.sqlite", // supports {agentId} token
          vector: {
            enabled: true, // SQLite-vec acceleration; falls back to in-process cosine
            extensionPath: "/path/to/sqlite-vec", // optional
          },
        },

        // Embedding cache
        cache: {
          enabled: true,
          maxEntries: 50000, // reduces re-embedding cost
        },

        // Extra paths to index (beyond MEMORY.md + memory/**/*.md)
        extraPaths: ["../team-docs", "/srv/shared-notes/overview.md"],
      },
    },
  },
}
```

#### Hybrid Search (BM25 + Vector)

```json5
memorySearch: {
  query: {
    hybrid: {
      enabled: true,
      vectorWeight: 0.7,          // weights normalize to 1.0
      textWeight: 0.3,
      candidateMultiplier: 4,

      // MMR re-ranking (diversity) — prevents near-duplicate results
      mmr: {
        enabled: true,            // default: false
        lambda: 0.7,              // 0 = max diversity, 1 = max relevance
      },

      // Temporal decay (recency boost)
      temporalDecay: {
        enabled: true,            // default: false
        halfLifeDays: 30,         // score halves every 30 days
      },
    },
  },
}
```

**Temporal decay details:**

- **Never decays:** `MEMORY.md` and non-dated files in `memory/`
- **Applies to:** Dated daily files (`memory/YYYY-MM-DD.md`) and session transcripts
- Score = `original × e^(-λ × ageInDays)` — e.g., 7 days ago → ~84%, 30 days → 50%, 90 days → 12.5%

**Chunking:** ~400 token target, 80-token overlap. File watcher syncs with 1.5s debounce.

#### Batch Indexing (for large corpus)

```json5
memorySearch: {
  remote: {
    batch: {
      enabled: true,           // default: false
      concurrency: 2,
      wait: true,
      pollIntervalMs: 5000,
      timeoutMinutes: 60,
    },
  },
}
```

Useful for initial large-corpus indexing. OpenAI offers discounted batch pricing.

#### Multimodal Memory (Gemini only)

```json5
memorySearch: {
  provider: "gemini",
  model: "gemini-embedding-2-preview",
  multimodal: {
    enabled: true,
    modalities: ["image", "audio"],  // or ["all"]
    maxFileBytes: 10000000,
  },
}
```

Supported: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif`, `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac`. Searchable but `memory_get` still returns Markdown only.

#### Session Memory (Experimental)

```json5
memorySearch: {
  experimental: { sessionMemory: true },
  sources: ["memory", "sessions"],
}
```

Indexes session transcripts for cross-session search. Off by default. Debounced and async — results may be temporarily stale.

Session transcript sync thresholds:

```json5
sync: {
  sessions: {
    deltaBytes: 100000,    // ~100 KB
    deltaMessages: 50,
  },
}
```

#### Citations

```json5
memory: {
  citations: "auto",   // "auto" | "on" | "off"
}
```

When `auto`/`on`: `memory_search` includes `Source: <path#line>` footer in snippets.

### Memory Backend Options

#### Option A — Built-in SQLite (Default)

The default backend. Local hybrid search with BM25 + vector embeddings. Free, runs locally with ~300M parameter GGUF model.

**Best for:** Most users. Simple setup, no external dependencies, good enough recall for personal agents.

```json5
// No special config needed — this is the default
memorySearch: {
  enabled: true,
  provider: "local",
}
```

#### Option B — QMD Backend (Advanced)

> **Source:** https://docs.openclaw.ai/reference/memory-config | https://docs.openclaw.ai/concepts/memory-qmd
> **Upstream:** https://github.com/tobi/qmd

QMD is an on-device search engine for everything you need to remember — markdown notes, meeting transcripts, documentation, and knowledge bases. It combines **BM25 full-text search**, **vector semantic search** (embeddings), and **LLM re-ranking** into a hybrid retrieval pipeline. All processing runs locally via `node-llama-cpp` with GGUF models — no external API calls, full privacy, works offline.

A query like "gateway server setup" matches notes about "running the gateway on the Mac Mini" even if exact words don't appear.

**Best for:** Power users outgrowing default memory. Large knowledge bases, past session transcript search, multiple independent collections.

**Prerequisites:** Install QMD separately (`npm install -g @tobilu/qmd` or `bun install -g @tobilu/qmd`), requires Bun runtime (QMD runs via Bun + `node-llama-cpp`), SQLite build supporting extensions, must be accessible on the gateway's PATH. Native support for macOS/Linux; Windows best via WSL2.

**QMD search modes:**

| Command         | Mode             | Description                                               |
| --------------- | ---------------- | --------------------------------------------------------- |
| `qmd search`    | BM25 keyword     | Fast keyword-only searching                               |
| `qmd vsearch`   | Semantic vector  | Embedding-based similarity search                         |
| `qmd query`     | Hybrid + rerank  | Combines BM25 + vector + LLM re-ranking (highest quality) |
| `qmd get`       | Direct retrieval | Retrieve specific documents by path or ID                 |
| `qmd multi-get` | Batch retrieval  | Retrieve multiple docs via glob patterns                  |

**Advanced search features:**

- **Query expansion:** LLM auto-expands a single query into BM25, vector, and HyDE sub-queries for broader recall
- **Context hierarchies:** Tree-structured metadata attached to collections improves LLM decision-making and relevance
- **AST-based chunking:** Smart segmentation for code documents
- **Explainability:** Detailed scoring breakdowns (`--explain` flag) for transparency
- **Output formats:** JSON (`--json`), file list (`--files`), score thresholds (`--min-score`)

**QMD standalone CLI usage:**

```bash
# Create a collection
qmd collection add ~/notes --name notes

# Add context metadata (improves search relevance)
qmd context add qmd://notes "Personal notes about projects and ideas"

# Generate embeddings (required for vsearch/query)
qmd embed

# Search
qmd search "authentication"          # keyword search
qmd vsearch "how auth works"         # semantic search
qmd query "authentication setup"     # hybrid + rerank (best quality)
```

**QMD as MCP server:**

QMD exposes an MCP server for AI agent integration with these tools:

- `query` — typed sub-queries with RRF + reranking
- `get` — document retrieval with fuzzy matching
- `multi_get` — batch retrieval by pattern
- `status` — index health information

Deployment modes: stdio (default subprocess), HTTP (shared long-lived server), or daemon (`qmd mcp --http --daemon`).

**QMD SDK/library usage:**

```typescript
import { createStore } from "@tobilu/qmd";

const store = await createStore({
  dbPath: "./index.sqlite",
  config: { collections: { docs: { path: "/docs" } } },
});

const results = await store.search({ query: "authentication" });
```

**OpenClaw integration config:**

```json5
{
  memory: {
    backend: "qmd",
    citations: "auto",
    qmd: {
      command: "qmd",
      searchMode: "search", // "search" | "vsearch" | "query"
      includeDefaultMemory: true,
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
      update: {
        interval: "5m",
        debounceMs: 15000,
        onBoot: true,
        waitForBootSync: false, // set true to block until indexed
        commandTimeoutMs: 30000,
        updateTimeoutMs: 120000,
        embedTimeoutMs: 300000,
      },
      limits: {
        maxResults: 6,
        maxSnippetChars: 2000,
        maxInjectedChars: 4000,
        timeoutMs: 4000,
      },
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
      sessions: {
        enabled: true,
        retentionDays: 90,
        exportDir: "~/.openclaw/agents/<id>/qmd/sessions/",
      },
    },
  },
}
```

**Key integration features:**

- Searches across entire knowledge bases, past sessions, and multiple collections
- Results appear as `qmd/<collection>/<relative-path>` with `memory_get` supporting this prefix
- Scope rules limit indexing (e.g., DM-only — avoid noisy group chats)
- Automatic fallback to built-in SQLite if QMD fails or binary missing
- Self-contained XDG home at `~/.openclaw/agents/<agentId>/qmd/` — OpenClaw manages collections, updates, and embeddings automatically
- When `memory.citations` is `auto` or `on`, results include "Source: <path#line>" footers; set to `"off"` to suppress display while retaining internal path data

**Performance notes:**

- First search downloads ~2GB GGUF models automatically
- Boot refresh runs in background without blocking startup (unless `waitForBootSync: true`)
- Increase `limits.timeoutMs` to 120000 for slower hardware
- Pre-warm with `qmd query "test"` using matching XDG directories (see below)

**Known limitations:**

- Temporary monorepo checkouts should remain under hidden directories (`.tmp/`) or outside indexed roots to avoid path-length errors and indexing issues

**Pre-warming models (optional):**

```bash
STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
export XDG_CONFIG_HOME="$STATE_DIR/agents/main/qmd/xdg-config"
export XDG_CACHE_HOME="$STATE_DIR/agents/main/qmd/xdg-cache"
qmd update && qmd embed
qmd query "test" -c memory-root --json >/dev/null 2>&1
```

#### Option C — Cognee (Knowledge Graphs)

> **Source:** https://lumadock.com/tutorials/openclaw-advanced-memory-management

Cognee builds **relational knowledge graphs** from Markdown files — extracting entities and connections rather than just text chunks. Operates in three phases: indexing on startup, injecting graph context before agent runs, and updating after sessions complete.

**Best for:** Relationship-heavy projects where understanding connections between concepts matters (e.g., "which decisions affected which components").

**Key notes:**

- Runs as a separate server
- Use distinct `datasetName` values per project to prevent entity confusion across contexts
- Can be layered with QMD for combined recall + relational reasoning

#### Option D — Mem0 (Automatic Fact Extraction)

> **Source:** https://lumadock.com/tutorials/openclaw-advanced-memory-management

Mem0 automatically extracts structured facts from conversations without manual curation. Supports both cloud (app.mem0.ai) and self-hosted (ChromaDB) deployments with per-user namespacing.

**Best for:** Users who want "set and forget" memory — no manual `/remember` commands needed.

**Key notes:**

- Cloud mode: API key from app.mem0.ai
- Self-hosted: FastAPI server with ChromaDB
- Tune `captureMode` and `autoCapture` to reduce irrelevant fact storage
- Use explicit `/remember` for high-priority information alongside auto-capture

#### Option E — MemSearch (Standalone Library)

> **Source:** https://milvus.io/blog/we-extracted-openclaws-memory-system-and-opensourced-it-memsearch.md
> **Repo:** https://github.com/zilliztech/memsearch

MemSearch is OpenClaw's memory system extracted into a standalone, framework-agnostic Python library by Zilliz (MIT licensed). Same markdown-first philosophy but usable outside OpenClaw.

**Best for:** Building custom agents that need OpenClaw-style memory without using OpenClaw itself. Also useful as a reference implementation.

**Key features:**

- SHA-256 content hashing for deduplication (unchanged content skips re-embedding)
- Hybrid search: dense vector + BM25 with Reciprocal Rank Fusion (RRF) reranking
- Live file watcher with configurable debounce
- Backends: Milvus (distributed) or SQLite (local)
- Embedding providers: ONNX (local/CPU), Gemini, Voyage, Ollama, sentence-transformers
- CLI tools + async Python API
- Claude Code plugin available

```python
mem = MemSearch(paths=["./memory"])
await mem.index()
results = await mem.search("query", top_k=3)
```

### Memory Strategy Recommendations

#### By Use Case

| Use case                           | Recommended setup                  | Why                                                           |
| ---------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| **Solo dev, simple agent**         | Built-in SQLite + local embeddings | Zero cost, no deps, good enough recall                        |
| **Solo dev, heavy knowledge base** | QMD backend                        | Searches across sessions, external docs, multiple collections |
| **Team/multi-project**             | QMD + Cognee                       | Relational graphs help track cross-project decisions          |
| **"Set and forget" memory**        | Mem0 (cloud or self-hosted)        | Auto-captures facts without manual curation                   |
| **Custom agent framework**         | MemSearch library                  | Standalone, framework-agnostic, same architecture             |
| **Cost-sensitive, lots of media**  | Built-in + Gemini multimodal       | Search images/audio without separate pipeline                 |

#### Optimization Best Practices

1. **Enable memory flush** — `memoryFlush.enabled: true` is the single most impactful setting. Without it, context silently disappears on compaction.

2. **Use temporal decay for long-running agents** — Set `temporalDecay.halfLifeDays: 30` to automatically de-prioritize stale daily logs while keeping MEMORY.md evergreen.

3. **Enable hybrid search** — The default `vectorWeight: 0.7, textWeight: 0.3` split works well. Pure vector misses exact keywords; pure BM25 misses semantic similarity.

4. **Keep MEMORY.md lean** — Under ~100 lines. Promote durable rules weekly from daily logs. Delete outdated entries.

5. **Scope your indexing** — Avoid indexing noisy group chats alongside curated knowledge. Use `scope.default: "deny"` + explicit allow rules.

6. **Use local embeddings when possible** — The built-in ~300M GGUF model is free and fast enough for personal agents. Only switch to remote providers for large-corpus batch indexing or multimodal search.

7. **Enable embedding cache** — `cache.enabled: true` with `maxEntries: 50000` reduces re-embedding cost, especially with frequent session transcript updates.

8. **Back up memory regularly** — `~/.openclaw/workspace/` and `~/.openclaw/memory/` should be in your backup routine. QMD/Cognee databases too.

9. **Write a memory protocol in AGENTS.md** — Instruct the agent to:
   - Search memory before answering past-work questions
   - Check today's memory logs before starting new tasks
   - Write important learnings to files immediately
   - Add corrections as rules to MEMORY.md after mistakes
   - Summarize to daily logs when sessions end or context grows large

10. **Start simple, layer up** — Start with built-in SQLite. Add QMD when outgrowing default. Add Cognee only for relationship-dependent projects.

### Diagnostic Commands

```bash
/context list    # reveals loaded files, truncation status, injection success
/compact [instructions]  # manual compaction with optional focus guidance
/verbose         # verifies memory search fires and returns results
```

---

## SOUL.md

The agent's identity file. Lives at `~/.openclaw/workspace/SOUL.md` (or the workspace path you configured).

```bash
nano ~/.openclaw/workspace/SOUL.md
```

### What It Does

- Defines the agent's **personality, role, and behavioral rules**
- Injected as a system prompt component at **every session start**
- The "soul" of your agent — who it is, how it communicates, what it cares about
- Also used to embed **standing instructions** like model routing rules, load limits, and spending caps
- ⚠️ Any change to SOUL.md resets the prompt cache — avoid mid-session edits

### Three Patterns to Add (from the routing guide)

#### Pattern 1 — Model Routing Rules

Paste at the **top** of SOUL.md (before any other content):

```
===================================================
MODEL ROUTING RULES — READ BEFORE EVERY TASK
===================================================

DEFAULT MODEL: Always start with "haiku" (Claude Haiku 4.5).

SWITCH TO "sonnet" (Claude Sonnet 4.5) only when the task requires:
- Designing or reviewing system architecture
- Reviewing production code
- Security analysis or vulnerability scanning
- Debugging after 2 failed attempts with Haiku
- A major decision affecting multiple projects

IF ANTHROPIC IS UNAVAILABLE, switch to these models in order:
1. "gpt-5-mini"  (OpenAI)   — for standard tasks
2. "gemini-flash" (Google)  — for standard tasks
3. "deepseek"    (DeepSeek) — for standard tasks

For complex tasks that need Sonnet-level capability:
1. "gpt-5.1"     (OpenAI)
2. "gemini-pro"  (Google)
3. "deepseek-r1" (DeepSeek)

NEVER switch models mid-task unless you hit a rate limit error.
NEVER use a premium model for: writing/reading files, simple questions,
status updates, formatting, or anything Haiku handles in one attempt.

===================================================
```

#### Pattern 2 — Session Initialization Limits

Paste **after** the routing rules block:

```
===================================================
SESSION INITIALIZATION — LOAD LIMITS
===================================================

AT THE START OF EVERY SESSION, load ONLY:
- SOUL.md              (core identity and principles)
- USER.md              (user preferences and profile)
- memory/YYYY-MM-DD.md (today's memory file, if it exists)

DO NOT automatically load:
- Full conversation history
- MEMORY.md (the full memory file)
- Sessions or logs from previous days
- Tool outputs from past sessions

WHEN THE USER ASKS ABOUT PAST CONTEXT:
1. Run: memory_search("relevant keyword")
2. If found, run: memory_get("entry id")
3. Return only the relevant snippet — do not load the whole file

AT THE END OF EVERY SESSION:
- Write a summary to memory/YYYY-MM-DD.md
- Keep it under 500 words
- Format: bullet points only

===================================================
```

#### Pattern 3 — Rate Limits & Budget Rules

Paste **at the bottom** of SOUL.md:

```
===================================================
RATE LIMITS & BUDGET RULES
===================================================

API CALL PACING:
- Minimum 5 seconds between consecutive API calls
- Minimum 10 seconds between web search requests
- After 5 web searches in a row: pause for 2 full minutes

TASK BATCHING:
- Group similar tasks into a single message when possible
- Never make multiple separate API calls when one will do

DAILY SPEND TARGET: $5.00
- At $3.75 (75%): Notify the user before continuing
- At $5.00 (100%): Stop and ask the user to confirm before proceeding

MONTHLY SPEND TARGET: $150.00
- At $112.50 (75%): Send a summary and ask whether to continue
- At $150.00 (100%): Halt all non-essential operations

IF YOU HIT A RATE LIMIT ERROR:
1. Switch to the next available model in the fallback list
2. Note which model you switched to
3. Retry the same task on the new model
4. Tell the user what happened at the end of the session

===================================================
```

### Basic Identity Template

```markdown
# Identity

You are [name], a personal AI assistant.

## Role

[Describe the agent's primary purpose]

## Communication Style

[How the agent speaks — tone, verbosity, formality]

## Behavioral Rules

- [Rule 1]
- [Rule 2]

## Context

[Any persistent background context the agent should always know]
```

> 📝 **To explore:** Does SOUL.md support any special directives or frontmatter? Check https://docs.openclaw.ai/soul when the page comes online.

---

## Cron Jobs & Heartbeats

> **Source:** https://docs.openclaw.ai/cron

### Overview

OpenClaw has a built-in **Gateway scheduler** that runs cron jobs. Jobs persist in `~/.openclaw/cron/jobs.json`.

### Two Execution Styles

| Style            | How it works                                                                           |
| ---------------- | -------------------------------------------------------------------------------------- |
| **Main session** | Injects a system event into the main agent session at the scheduled time               |
| **Isolated**     | Spins up a dedicated agent turn with its own context — can deliver output to a channel |

### Session Targets

| Target                | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `main`                | Main agent session                                          |
| `isolated`            | Fresh isolated session per run                              |
| `current`             | Resolved to the current session at job creation time        |
| `session:<custom-id>` | A persistent custom session — maintains context across runs |

### Schedule Types

| Kind    | Format                                       | Example                                 |
| ------- | -------------------------------------------- | --------------------------------------- |
| `at`    | ISO 8601 datetime                            | `"2026-01-15T09:00:00Z"`                |
| `every` | Milliseconds interval                        | `300000` (5 minutes)                    |
| `cron`  | 5 or 6-field cron expression + IANA timezone | `"0 7 * * *"` + `"America/Los_Angeles"` |

### Delivery Modes (Isolated Jobs)

| Mode       | Behavior                                                  |
| ---------- | --------------------------------------------------------- |
| `announce` | Delivers to a channel (Telegram, WhatsApp, Discord, etc.) |
| `webhook`  | HTTP POST to a URL                                        |
| `none`     | No external delivery                                      |

### CLI Examples

```bash
# One-shot reminder in 20 minutes
openclaw cron add \
  --name "Reminder" \
  --at "20m" \
  --session main \
  --system-event "Check your calendar." \
  --wake now

# Recurring isolated job, announce to WhatsApp
openclaw cron add \
  --name "Morning brief" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize inbox + calendar for today." \
  --announce \
  --channel whatsapp \
  --to "+15551234567"

# Deliver to a Telegram forum topic
openclaw cron add \
  --name "Nightly summary" \
  --cron "0 22 * * *" \
  --session isolated \
  --message "Summarize today." \
  --announce \
  --channel telegram \
  --to "-1001234567890:topic:123"

# List jobs
openclaw cron list

# View run history
openclaw cron runs --id <jobId> --limit 50

# Manual run
openclaw cron run <jobId>

# Edit a job
openclaw cron edit <jobId> --message "Updated prompt"

# Remove a job
openclaw cron remove <jobId>
```

### Model and Thinking Overrides

Isolated jobs can override the model:

```bash
openclaw cron add \
  --name "Weekly deep analysis" \
  --cron "0 6 * * 1" \
  --session isolated \
  --message "Weekly analysis." \
  --model "opus" \
  --thinking high \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

### Lightweight Context

```bash
# For scheduled chores that don't need full workspace bootstrap
openclaw cron add --light-context ...
```

### Storage

| Path                                  | Contents                  |
| ------------------------------------- | ------------------------- |
| `~/.openclaw/cron/jobs.json`          | Job definitions           |
| `~/.openclaw/cron/runs/<jobId>.jsonl` | Run history (auto-pruned) |

### Retry Policy

- **One-shot jobs:** retry up to 3× on transient errors (rate limit, network, 5xx), disable on permanent errors
- **Recurring jobs:** exponential backoff (30s → 1m → 5m → 15m → 60m) after failures; resets on success

### Configuration

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 1,
    sessionRetention: "24h", // how long isolated run sessions are kept
    runLog: {
      maxBytes: "2mb",
      keepLines: 2000,
    },
  },
}
```

### Heartbeats

Two ways to configure heartbeats:

#### Option A — Config-based heartbeat (inside `agents.defaults`)

Lives in `openclaw.json` under `agents → defaults`. This is the built-in heartbeat, not a cron job.

```json
"defaults": {
  "model": {
    "primary": "anthropic/claude-haiku-4-5"
  },
  "heartbeat": {
    "every":   "1h",
    "model":   "ollama/llama3.2:3b",
    "session": "main",
    "target":  "slack",
    "prompt":  "Briefly check: any blockers, pending tasks, or reminders?"
  },
  "models": { ... }
}
```

| Field     | Description                                                       |
| --------- | ----------------------------------------------------------------- |
| `every`   | Interval (e.g. `"1h"`, `"55m"`, `"30m"`)                          |
| `model`   | Which model to use — use Ollama for free local heartbeats         |
| `session` | Session target: `"main"` or a session ID                          |
| `target`  | Channel for delivery: `"slack"`, `"telegram"`, `"whatsapp"`, etc. |
| `prompt`  | The heartbeat message sent to the agent                           |

> 💡 You can also set per-agent heartbeat inside a specific `agents.list[]` entry using the same `"heartbeat"` block.
> 💡 Do **not** add `heartbeat` as a top-level key — OpenClaw will reject it. It belongs inside `agents → defaults`.

#### Option B — Cron-based heartbeat

Implement with cron jobs targeting the main session:

```bash
openclaw cron add \
  --name "Daily heartbeat" \
  --cron "0 9 * * *" \
  --tz "America/New_York" \
  --session main \
  --system-event "Daily heartbeat. Review any pending tasks or notifications." \
  --wake now
```

Or for immediate system events without creating a persistent job:

```bash
openclaw system event --mode now --text "Check battery levels."
```

#### Free Heartbeats via Ollama (Local LLM)

Route heartbeats to Ollama to avoid paying API credits for routine check-ins:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start and enable the service
systemctl start ollama
systemctl enable ollama
systemctl status ollama   # should show: active (running)

# Download a small model (~2 GB)
ollama pull llama3.2:3b

# Test it
ollama run llama3.2:3b "Respond with only the word OK"
# Expected output: OK

# If ollama not found after install:
source ~/.bashrc && ollama --version
```

Then set `"model": "ollama/llama3.2:3b"` in the heartbeat config. Ollama runs locally — no API cost.

---

## Model Providers

> **Source:** https://docs.openclaw.ai/models

### Model Selection Order

1. **Primary** model (`agents.defaults.model.primary`)
2. **Fallbacks** in `agents.defaults.model.fallbacks` (in order)
3. **Provider auth failover** within a provider before moving to next

### Provider Support

| Provider              | Notes                                                        |
| --------------------- | ------------------------------------------------------------ |
| Anthropic             | API key or OAuth (Claude Code CLI) or setup-token            |
| OpenAI                | API key or OAuth (Code subscription)                         |
| xAI (Grok)            | API key                                                      |
| OpenRouter            | API key — access to many models; `models scan` for free tier |
| Ollama                | Local models — no API key needed                             |
| Qwen                  | Free tier available                                          |
| MiniMax               | API key                                                      |
| Moonshot/Kimi         | API key                                                      |
| OpenCode              | OAuth                                                        |
| Vercel AI Gateway     | API key                                                      |
| Cloudflare AI Gateway | API key                                                      |
| Custom                | `--custom-base-url` + `--custom-model-id`                    |

### ⚠️ Critical Config Rules

| Rule                                           | Detail                                                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"primary"` must be a **full model path**      | Use `"anthropic/claude-haiku-4-5"`, not an alias like `"haiku"`. Using an alias causes `Invalid input` on startup.                                |
| Cache lives under `params`, not top-level      | Correct: `"params": { "cacheRetention": "short" }` inside the model entry. Wrong: top-level cache block or `"cache": true` directly on the model. |
| `heartbeat` belongs inside `agents → defaults` | Do **not** add `heartbeat` as a new top-level section — OpenClaw will reject it.                                                                  |
| `diagnostics` **is** a top-level section       | The `diagnostics` block is a sibling of `"agents"` and `"commands"` — not nested inside agents.                                                   |
| Invalid fields                                 | `tier`, `role`, `cache` (bare boolean), `cache_ttl`, `fallback_chain` — remove these if present anywhere.                                         |

### Config

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-haiku-4-5", // full path — NOT alias
        fallbacks: [
          "openai/gpt-5-mini",
          "google/gemini-2.0-flash",
          "deepseek/deepseek-chat",
        ],
      },
      imageModel: {
        primary: "openai/gpt-4o", // used when primary can't handle images
      },
      heartbeat: { every: "55m" }, // inside defaults, NOT top-level
      contextPruning: {
        mode: "cache-ttl",
        ttl: "1h",
      },
      models: {
        // ⚠️ keys must be full provider/model paths
        "anthropic/claude-opus-4-6": {
          alias: "opus",
          params: { cacheRetention: "long" },
        },
        "anthropic/claude-sonnet-4-6": {
          alias: "sonnet",
          params: { cacheRetention: "short" },
        },
        "anthropic/claude-haiku-4-5": {
          alias: "haiku" /* no cache — cheap enough */,
        },
        "openai/gpt-5-mini": { alias: "gpt-5-mini" },
        "openai/gpt-5.1": { alias: "gpt-5.1" },
        "google/gemini-2.0-flash": { alias: "gemini-flash" },
        "google/gemini-2.0-pro": { alias: "gemini-pro" },
        "deepseek/deepseek-chat": { alias: "deepseek" },
        "deepseek/deepseek-reasoner": { alias: "deepseek-r1" },
      },
    },
  },
}
```

### `cacheRetention` Values

| Value     | Meaning                                          |
| --------- | ------------------------------------------------ |
| `"none"`  | Caching disabled — every message pays full price |
| `"short"` | Cache held for ~5 minutes of inactivity          |
| `"long"`  | Cache held for ~1 hour of inactivity             |

> 💡 `cacheRetention` only works with **Anthropic models** (direct API or Amazon Bedrock). For OpenAI, Google, and DeepSeek models, the setting has no effect — just omit it.

### Switching Models in Chat

```
/model                    # list available models
/model list               # same
/model 3                  # select by number
/model openai/gpt-4o      # select by ref
/model status             # detailed auth + provider status
```

### CLI Commands

```bash
openclaw models list [--all] [--provider <name>]
openclaw models status [--check]
openclaw models set <provider/model>
openclaw models set-image <provider/model>
openclaw models aliases list
openclaw models aliases add <alias> <provider/model>
openclaw models fallbacks list
openclaw models fallbacks add <provider/model>
openclaw models scan [--no-probe] [--min-params 7]  # scan OpenRouter free tier
```

---

## Ollama (Local Models)

> **Sources:**
>
> - https://docs.openclaw.ai/providers/ollama
> - https://docs.ollama.com/integrations/openclaw
> - https://ollama.com/blog/openclaw

Ollama lets you run OpenClaw with **fully local models at zero API cost**. Useful as a primary provider for privacy-sensitive or budget-conscious setups, or as a free fallback/heartbeat model alongside cloud providers.

### Quick Start (via `ollama launch`)

The fastest way to get OpenClaw running with Ollama:

```bash
ollama launch openclaw
```

This single command automates: npm install (if needed), security acknowledgment, model selection, provider configuration, daemon install, and web search plugin setup.

```bash
# Reconfigure model/provider without full re-onboard
ollama launch openclaw --config

# Specify a model directly
ollama launch openclaw --model glm-4.7-flash

# Headless / CI / Docker (skip interactive prompts, auto-download model)
ollama launch openclaw --model kimi-k2.5:cloud --yes

# Stop the gateway
openclaw gateway stop
```

> **Legacy alias:** `ollama launch clawdbot` still works (OpenClaw was previously called Clawdbot).

---

### Setup via OpenClaw Onboarding

```bash
openclaw onboard
# Select "Ollama" from the provider list
```

The wizard discovers available models, auto-pulls selected ones, and detects context window sizes.

Non-interactive:

```bash
openclaw onboard --non-interactive --auth-choice ollama --accept-risk
```

---

### Manual Setup

**Step 1 — Install Ollama**

```bash
# macOS
brew install ollama
# or
curl -fsSL https://ollama.com/install.sh | sh

# Linux
curl -fsSL https://ollama.com/install.sh | sh
systemctl start ollama
systemctl enable ollama
```

**Step 2 — Pull a model**

```bash
ollama pull glm-4.7-flash       # ~25 GB VRAM, good general-purpose
ollama pull qwen3-coder          # coding-optimized
ollama pull llama3.2:3b          # tiny, good for heartbeats (~2 GB)
```

**Step 3 — Configure OpenClaw**

---

### Configuration

#### Option A — Implicit Discovery (simplest)

Set a single environment variable and OpenClaw auto-discovers local models:

```bash
export OLLAMA_API_KEY="ollama-local"
```

OpenClaw queries Ollama's `/api/tags` endpoint, discovers all pulled models, and detects context window sizes automatically.

#### Option B — Explicit Provider Config

Use when Ollama runs on a different host, or you need specific model settings:

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
        apiKey: "ollama-local",
        api: "ollama",
        models: [
          {
            id: "glm-4.7-flash",
            name: "GLM 4.7 Flash",
            contextWindow: 65536,
            maxTokens: 65536,
          },
          {
            id: "qwen3-coder",
            name: "Qwen3 Coder",
            contextWindow: 65536,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

#### Setting the Primary Model

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/glm-4.7-flash",
        fallbacks: ["ollama/qwen3-coder", "anthropic/claude-haiku-4-5"],
      },
    },
  },
}
```

---

### ⚠️ Critical: Use Native Ollama API, Not OpenAI-Compatible Mode

**Always use the native Ollama URL** (`http://host:11434`) — do **NOT** append `/v1`.

| Mode                       | URL                    | Tool calling                                    | Streaming             |
| -------------------------- | ---------------------- | ----------------------------------------------- | --------------------- |
| **Native (correct)**       | `http://host:11434`    | ✅ Works                                        | ✅ Works              |
| **OpenAI-compat (broken)** | `http://host:11434/v1` | ❌ Breaks — outputs raw tool JSON as plain text | ⚠️ May need disabling |

The native `/api/chat` endpoint fully supports streaming and tool calling simultaneously. The OpenAI-compatible `/v1` mode has unreliable tool calling and may require disabling streaming.

---

### Context Window Requirements

> ⚠️ **OpenClaw requires at least 64K token context window for local models.**

This is a hard constraint — models with smaller context windows will truncate conversations and lose critical context.

| Model           | Context | VRAM   | Notes                                       |
| --------------- | ------- | ------ | ------------------------------------------- |
| `glm-4.7-flash` | 128K    | ~25 GB | Good general-purpose + reasoning            |
| `glm-4.7`       | 128K    | ~25 GB | General-purpose                             |
| `qwen3-coder`   | 128K    | varies | Coding-optimized                            |
| `gpt-oss:20b`   | 128K    | ~12 GB | Smaller variant                             |
| `gpt-oss:120b`  | 128K    | ~70 GB | Large variant                               |
| `llama3.2:3b`   | 8K      | ~2 GB  | Too small for primary — **heartbeats only** |

Auto-discovered models use context windows reported by Ollama. For explicit configs, set both `contextWindow` and `maxTokens`.

---

### Cloud Models via Ollama

Ollama also offers cloud-hosted models that don't require local VRAM:

```bash
# Sign in for cloud model access
ollama signin
```

| Model                | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `kimi-k2.5:cloud`    | 1T parameter agentic model, multimodal reasoning with subagents |
| `minimax-m2.7:cloud` | Fast, efficient coding and real-world productivity              |
| `glm-5:cloud`        | Reasoning and code generation                                   |

Select during setup:

```bash
ollama launch openclaw --model kimi-k2.5:cloud
```

Cloud models don't require local GPU resources but need `ollama signin`.

---

### Web Search Plugin

Local Ollama models can use web search via the built-in plugin:

```bash
# Requires Ollama sign-in for local models
ollama signin

# Install the plugin
openclaw plugins install @ollama/openclaw-web-search
```

---

### Reasoning Model Detection

Ollama models with reasoning capabilities are auto-detected by heuristics matching names containing "r1", "reasoning", or "think". All Ollama models show as $0 cost since they run locally.

---

### Troubleshooting

#### `ollama: command not found`

```bash
source ~/.bashrc && ollama --version
# If still failing after install:
sudo reboot
```

#### `ollama pull` fails or stalls

Check disk space (need at least 3 GB free for small models, 25+ GB for larger ones):

```bash
df -h
```

#### Ollama service won't start

```bash
# Check logs
journalctl -u ollama -n 50

# Low-RAM fallback — run manually
ollama serve &
```

#### Model produces raw JSON instead of using tools

You're using the OpenAI-compatible endpoint (`/v1`). Switch to the native URL:

```json5
// ❌ Wrong
baseUrl: "http://localhost:11434/v1"

// ✅ Correct
baseUrl: "http://localhost:11434"
```

---

## CLI Reference

> **Source:** https://docs.openclaw.ai/cli

### Global Flags

| Flag                | Description                    |
| ------------------- | ------------------------------ |
| `--dev`             | Dev mode                       |
| `--profile <name>`  | Use a named config profile     |
| `--no-color`        | Disable color output           |
| `--update`          | Check for updates              |
| `-V` / `--version`  | Show version                   |
| `--json`            | Machine-readable JSON output   |
| `--plain`           | Plain text output              |
| `--non-interactive` | No prompts                     |
| `--dry-run`         | Preview destructive operations |

### Commands

| Command                            | What it does                                |
| ---------------------------------- | ------------------------------------------- |
| `openclaw onboard`                 | Interactive setup wizard                    |
| `openclaw doctor`                  | Health check — diagnoses common issues      |
| `openclaw status`                  | Show gateway + channel status               |
| `openclaw status --all`            | Full status including all channels          |
| `openclaw dashboard`               | Open web UI (auto-opens browser)            |
| `openclaw dashboard --no-open`     | Print dashboard URL + token without opening |
| `openclaw gateway`                 | Start the gateway                           |
| `openclaw gateway probe`           | Test gateway connectivity                   |
| `openclaw gateway status`          | Show gateway status                         |
| `openclaw daemon logs`             | Show daemon logs                            |
| `openclaw logs --follow`           | Tail gateway logs live                      |
| `openclaw config`                  | View/edit config                            |
| `openclaw models list`             | List configured models                      |
| `openclaw models status`           | Show active model + auth status             |
| `openclaw models set <model>`      | Change primary model                        |
| `openclaw channels status`         | Check channel connectivity                  |
| `openclaw channels status --probe` | Probe specific channel IDs                  |
| `openclaw channels login`          | Authenticate a channel                      |
| `openclaw cron list`               | List scheduled jobs                         |
| `openclaw cron add`                | Add a cron job                              |
| `openclaw cron edit <id>`          | Edit a cron job                             |
| `openclaw cron run <id>`           | Manually trigger a job                      |
| `openclaw cron runs --id <id>`     | View run history                            |
| `openclaw cron remove <id>`        | Remove a job                                |
| `openclaw system event`            | Inject an immediate system event            |
| `openclaw tui`                     | Open terminal UI                            |
| `openclaw agents add <name>`       | Add a new agent                             |
| `openclaw sessions`                | List sessions                               |
| `openclaw memory`                  | Access memory tools                         |
| `openclaw skills`                  | Manage skills                               |
| `openclaw security audit`          | Run security audit                          |
| `openclaw security audit --deep`   | Deep security audit                         |
| `openclaw security audit --fix`    | Deep audit + apply fixes automatically      |
| `openclaw reset`                   | Reset config/credentials                    |
| `openclaw uninstall`               | Remove OpenClaw                             |
| `openclaw update`                  | Update to latest version                    |
| `openclaw health`                  | Quick health check                          |
| `openclaw completion --install`    | Install shell tab completion                |

---

## Troubleshooting

### Quick Diagnostic Commands

```bash
openclaw status
openclaw status --all
openclaw gateway probe
openclaw gateway status
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

### macOS VM (Lume)

---

#### VNC window doesn't appear after `lume create`

**Error / Symptom:** After running `lume create openclaw --os macos --ipsw latest`, no VNC window opens and it's unclear how to interact with the VM.

**Cause:** The docs imply VNC auto-opens, but this doesn't always happen.

**Fix:** Manually launch the VM with its display:

```bash
lume run openclaw
```

---

#### VM fails to start — "Failed to lock auxiliary storage"

**Full error:**

```
[2026-03-14T11:22:39Z] ERROR: Failed to run VM error=Invalid virtual machine configuration.
Failed to lock auxiliary storage. Error: Invalid virtual machine configuration.
Failed to lock auxiliary storage.
```

**Cause:** macOS is locking the VM's auxiliary storage file, likely because a previous VM process didn't shut down cleanly (e.g. a crash or force-quit).

**Fix:** Restart your Mac. The lock is released on reboot and the VM starts normally afterwards.

> 📝 **Note for playbook:** Worth investigating whether `lume stop openclaw` + a short wait resolves it without a full restart — needs more testing.

---

#### SSH — "Host key verification failed"

**Full error:**

```
The authenticity of host '192.168.64.x (192.168.64.x)' can't be established.
ED25519 key fingerprint is SHA256:xxxxxx.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
Host key verification failed.
```

**Cause:** This is a standard SSH first-connection prompt. Pressing Enter without typing anything counts as a blank/rejected response, which fails the connection.

**Fix:** Type `yes` explicitly and press Enter. SSH will add the host to `~/.ssh/known_hosts` and connect successfully.

```
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
```

---

#### OpenClaw install fails — Node.js not found

**Symptom:** `npm install -g openclaw@latest` throws a command-not-found error or fails because Node is missing.

**Cause:** The official macOS VM guide doesn't mention installing Node.js, but it's a required dependency.

**Fix:** Install Node.js (22+) inside the VM before installing OpenClaw:

```bash
brew install node
node --version  # should be v22+
```

### Control UI / Dashboard

---

#### Dashboard unreachable at `http://192.168.64.X:18789` from host Mac

**Symptom:** OpenClaw is running inside a Lume macOS VM. Trying to open `http://192.168.64.X:18789/#token=xxx` in the browser on the host Mac fails — the page doesn't load.

**Cause:** The gateway binds to `127.0.0.1` (loopback) inside the VM by default. Loopback traffic stays inside the VM and is never routed to the VM's external network interface (`192.168.64.X`), so the host Mac can't reach it directly.

**Fix:** Create an SSH tunnel from the host Mac that forwards a local port to the VM's loopback:

```bash
ssh -N -L 18789:127.0.0.1:18789 <your-vm-user>@192.168.64.X
```

Then access the dashboard using `localhost`:

```
http://localhost:18789/#token=xxxxxxxxxxxx
```

To get the correct token/URL from inside the VM:

```bash
openclaw dashboard --no-open
```

Keep the tunnel terminal open for the duration of your session.

---

#### Dashboard shows "pairing required" after clicking Connect

**Symptom:** The Control UI loads and you can see the WebSocket URL and Gateway Token fields, but after clicking "Connect" it shows "pairing required" instead of connecting.

**Cause:** The dashboard web client is treated as a new device that needs to be approved (paired) on the gateway side. This is part of OpenClaw's security model — new devices must be explicitly approved before they can interact with the gateway.

**Fix:** Approve the pending device pairing from the CLI:

```bash
# List pending device pairing requests
openclaw devices list

# Approve the most recent pairing request
openclaw devices approve --latest
```

After approving, click "Connect" again in the dashboard — it should connect successfully and show the main chat interface.

> **Note:** This is different from channel pairing (e.g. Telegram/Discord DM pairing). Device pairing applies to any new client connecting to the gateway, including the web dashboard.

---

### Discord

---

#### Bot invite URL shows no servers to add the bot to

**Symptom:** After generating the OAuth2 invite URL in the Discord Developer Portal and opening it in the browser, the server dropdown is empty — there's nowhere to add the bot.

**Cause:** The dropdown only shows Discord servers where you have admin/manage permissions. If you haven't created a server yet, it will be empty.

**Fix:** Create a Discord server first (**+ icon in the Discord sidebar → Create My Own**), then open the invite URL again. Your new server will appear in the dropdown.

---

### General

---

#### No replies at all

1. `openclaw status` — is the gateway running?
2. `openclaw channels status --probe` — are channels connected?
3. `openclaw logs --follow` — look for auth failures or routing errors
4. Check DM policy isn't set to `disabled`
5. For groups: check `groupPolicy` and `groupAllowFrom` settings

---

#### "Invalid input" on startup / "Invalid config" validation error

Common causes and fixes:

| Rule violated                                | Symptom                    | Fix                                                                                                                            |
| -------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `"primary"` set to an alias                  | `Invalid input` at startup | Change to full model path: `"anthropic/claude-haiku-4-5"`                                                                      |
| Cache set incorrectly                        | Validation error           | Use `"params": { "cacheRetention": "short" }` inside the model entry — not a top-level `"cache"` block or bare `"cache": true` |
| `heartbeat` added as top-level key           | Rejected config            | Move `heartbeat` inside `agents → defaults`                                                                                    |
| Invalid fields present                       | Validation error           | Remove `tier`, `role`, `cache_ttl`, `fallback_chain` — these are not valid anywhere                                            |
| `diagnostics` nested inside `agents`         | Rejected config            | Move `diagnostics` to top level (sibling of `"agents"`)                                                                        |
| Missing comma after `"defaults"` closing `}` | JSON parse error           | The `"list"` block that follows `"defaults"` requires a comma after `"defaults": { ... },`                                     |

**API key not being picked up:** OpenClaw only reads config on startup — restart after changing API keys.

---

#### "Model is not allowed" error

When `agents.defaults.models` is set, it becomes an allowlist. If a user (or `/model` command) picks a model not in the list, the agent silently stops responding.

**Fix:** Add the model to `agents.defaults.models`, clear the allowlist, or pick from `/model list`.

---

#### Cron jobs not running

- Check `cron.enabled` is not `false`
- Check `OPENCLAW_SKIP_CRON` env var isn't set
- Gateway must be running continuously — cron runs inside the Gateway process
- For `cron` schedules: verify timezone with `--tz`

---

#### "ollama: command not found"

Shell hasn't loaded the updated PATH after install:

```bash
source ~/.bashrc && ollama --version
# If still failing:
sudo reboot
```

#### `ollama pull` fails or stalls

Check available disk space (need at least 3 GB free):

```bash
df -h
```

#### Ollama service won't start

View error logs:

```bash
journalctl -u ollama -n 50
```

If server has very low RAM, run Ollama manually instead:

```bash
ollama serve &
```

---

## Cost Optimization

### Strategy Summary

| Lever                       | What it does                                                    | Where to configure                            |
| --------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| **Model routing**           | Use Haiku by default; only escalate to Sonnet for complex tasks | SOUL.md routing rules                         |
| **Prompt caching**          | Reuse SOUL.md/USER.md across messages at ~90% lower cost        | `params.cacheRetention` on model entries      |
| **Cache warm heartbeat**    | 55-minute ping prevents cache expiry, avoids rebuild cost       | `agents.defaults.heartbeat.every: "55m"`      |
| **Context pruning**         | Removes stale tool outputs after cache TTL window               | `agents.defaults.contextPruning`              |
| **Load limits**             | Only load today's memory file, not full history                 | SOUL.md session init block                    |
| **Ollama as primary**       | Run entirely on local models — $0 API cost                      | `model.primary: "ollama/glm-4.7-flash"`       |
| **Ollama for heartbeats**   | Free local model for routine check-ins                          | `heartbeat.model: "ollama/llama3.2:3b"`       |
| **Ollama for cron jobs**    | Free local model for scheduled tasks                            | `--model ollama/llama3.2:3b` on cron jobs     |
| **Hybrid: local + cloud**   | Ollama primary with cloud fallback for complex tasks            | `fallbacks: ["anthropic/claude-haiku-4-5"]`   |
| **Skill pruning**           | Each skill adds ~97 chars to context — remove unused ones       | `openclaw skills`                             |
| **Light context cron jobs** | Skip workspace bootstrap for routine scheduled tasks            | `--light-context` flag                        |
| **OpenRouter free tier**    | Free models for non-critical fallback tasks                     | `openclaw models scan`                        |
| **LiteLLM proxy**           | Cache deterministic calls, rate-limit, auto-failover            | Docker sidecar between Gateway and providers  |
| **Session isolation**       | Prevent history accumulation on automation tasks                | `--session isolated` on cron jobs             |
| **Budget monitoring**       | Track spend per session, set alert thresholds                   | `session_status` API + daily cron aggregation |
| **Concurrency cap**         | Smooth rate-limit exposure and cost spikes                      | `maxConcurrentRuns` in Gateway config         |

---

### Cost Drivers

Understanding where tokens go helps prioritize optimizations:

| Driver                       | Impact                                                           | Notes                                                                              |
| ---------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Model selection**          | Up to **50× price difference** between budget and premium models | Biggest lever — tier ruthlessly                                                    |
| **Session history**          | Full history re-sent every turn                                  | Long sessions compound cost; use compaction or `--session isolated` for automation |
| **Unlimited concurrency**    | Parallel agents multiply spend linearly                          | Cap with `maxConcurrentRuns`                                                       |
| **Multi-agent coordination** | ~**3.5× token multiplier** vs. single-agent                      | Coordinators should compress task briefings; use tool allowlists to trim context   |

### Model Tiering

Route tasks to the cheapest model that can handle them:

| Tier        | Price range (input)  | Models                                                            | Use for                                                      |
| ----------- | -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| **Free**    | $0                   | Ollama (Qwen 2.5, Llama 3.2, Mistral), Google AI Studio free tier | Heartbeats, simple cron jobs, local dev                      |
| **Budget**  | $0.10–$0.50/M tokens | Gemini 1.5 Flash, Claude Haiku                                    | Classification, simple tasks, routine automation             |
| **Mid**     | $1–$5/M tokens       | Claude Sonnet, GPT-4o Mini                                        | Reasoning tasks, code review                                 |
| **Premium** | $10+/M tokens        | Claude Opus, GPT-4                                                | Complex code generation, difficult reasoning — use sparingly |

Config example for tiered defaults:

```yaml
agents:
  defaults:
    models:
      - "google/gemini-1.5-flash-latest" # budget default
      - "anthropic/claude-3-5-sonnet-20241022" # escalation
```

For cron jobs, pin to budget: `--model google/gemini-1.5-flash-latest --session isolated`

---

### LiteLLM API Proxy

Insert a LiteLLM proxy between the Gateway and API providers to get:

- **Prompt caching** for deterministic calls (heartbeats, routine checks) — **70–90% cost reduction** on repetitive tasks
- **Rate limiting** and concurrency management
- **Fallback routing** — automatic failover between providers
- **Usage tracking** across all providers in one place

Run as a Docker sidecar alongside the Gateway. Point OpenClaw's API base URL at the proxy instead of directly at providers.

---

### Prompt Caching (Anthropic only)

The provider caches your system prompt (SOUL.md + USER.md) after the first message in a session. Every subsequent message reads from that cache at ~90% lower cost for the cached portion.

**Setup:** Add `params.cacheRetention` to each model entry (Anthropic models only):

```json
"models": {
  "anthropic/claude-opus-4-6":   { "alias": "opus",   "params": { "cacheRetention": "long"  } },
  "anthropic/claude-sonnet-4-6": { "alias": "sonnet", "params": { "cacheRetention": "short" } },
  "anthropic/claude-haiku-4-5":  { "alias": "haiku"  }
}
```

**Keep the cache warm:** if there's a gap >1 hour between messages, the cache expires and the next message rebuilds it at full cost. Set a heartbeat at 55 minutes to prevent this:

```json
"heartbeat": { "every": "55m" }
```

**Cache resets when:** SOUL.md or USER.md changes between messages — avoid editing these files mid-session.

---

### Context Pruning

As a session grows, old tool outputs accumulate and get sent with every message even when irrelevant. Context pruning removes them after the cache TTL window.

```json
"contextPruning": {
  "mode": "cache-ttl",
  "ttl":  "1h"
}
```

Add this inside `agents → defaults` alongside `model` and `heartbeat`.

---

### Cache Diagnostics

Enable cache trace logging to see exactly how many tokens are served from cache vs. rebuilt fresh:

```json
"diagnostics": {
  "cacheTrace": { "enabled": true }
}
```

> ⚠️ `diagnostics` is a **top-level section** — sibling of `"agents"`, not nested inside it.

Logs written to: `~/.openclaw/logs/cache-trace.jsonl`

Each line is a JSON event. Key fields:

- `cacheRead` — tokens served cheaply from cache
- `cacheWrite` — tokens charged at full price to build/rebuild the cache

**High `cacheWrite` on most turns** (not just the first) = your system prompt is changing between messages. Check that nothing modifies SOUL.md or USER.md during a session.

Check cache performance per session:

```
openclaw shell → /usage full
```

---

### Local Models for Zero-Cost Operation (Ollama)

Running Ollama as your primary provider eliminates API costs entirely. All Ollama models are $0 — they run on your hardware.

#### Full Local Setup (zero cloud spend)

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/glm-4.7-flash", // $0 — 64K+ context, tool calling
        fallbacks: ["ollama/qwen3-coder"], // $0 fallback
      },
      heartbeat: {
        every: "55m",
        model: "ollama/llama3.2:3b", // $0 — tiny model for pings
      },
    },
  },
}
```

**Trade-offs:**

- ✅ Zero API cost, full privacy, no rate limits
- ⚠️ Requires capable GPU (25+ GB VRAM for recommended models)
- ⚠️ Local models are weaker at complex reasoning vs. cloud frontier models
- ⚠️ Prompt caching (`cacheRetention`) has no effect — Ollama doesn't charge per-token

#### Hybrid Setup (local primary + cloud fallback)

Best balance of cost and capability — use local for routine tasks, escalate to cloud for complex ones:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/glm-4.7-flash", // $0 for most tasks
        fallbacks: ["anthropic/claude-haiku-4-5"], // paid fallback for hard tasks
      },
      heartbeat: {
        every: "55m",
        model: "ollama/llama3.2:3b", // $0 heartbeats
      },
    },
  },
}
```

Add model routing rules in SOUL.md to control when the agent escalates:

```
SWITCH TO cloud fallback only when:
- Local model fails the task after 2 attempts
- Task requires advanced reasoning or code review
- Security analysis or vulnerability scanning
```

#### Cloud Models via Ollama (no local GPU needed)

If you lack GPU resources but still want to use Ollama as the provider layer, use Ollama cloud models:

```bash
ollama signin
ollama launch openclaw --model kimi-k2.5:cloud
```

These models run on Ollama's infrastructure. They may have usage limits but don't require local VRAM.

#### Cost Comparison

| Setup                          | Monthly cost (est.)                  | Requirements                       |
| ------------------------------ | ------------------------------------ | ---------------------------------- |
| **Full Ollama local**          | $0                                   | GPU with 25+ GB VRAM               |
| **Ollama + cloud fallback**    | $5–30                                | GPU + API key                      |
| **Ollama heartbeats only**     | Saves ~$5–15/mo vs. cloud heartbeats | Any machine (3B model needs ~2 GB) |
| **Cloud only (Haiku primary)** | $30–150                              | API key only                       |

---

### Session & Context Management

Long sessions are a hidden cost driver — full history re-sends on every turn. Strategies:

- **Aggressive compaction:** reduces token count but loses detail — acceptable for non-critical sessions
- **Session resets:** use `--session isolated` for cron jobs and automation to start fresh each run
- **Multi-agent briefings:** coordinators should compress task briefings to minimize input tokens per delegation
- **Tool allowlists:** reduce unused tool definitions per agent to trim context size

### Budget Monitoring

Track spend and set alerts before costs surprise you:

- **`session_status` API:** returns token counts and estimated cost per session — poll this programmatically
- **Daily aggregation cron:** collect session costs into a daily summary, store alert thresholds in MEMORY.md
- **`maxConcurrentRuns`:** set in Gateway config to cap parallel agent runs, smoothing rate-limit exposure and cost spikes

### Other Strategies

- **Limit context window:** keep MEMORY.md concise; use `lightContext: true` for cron jobs that don't need full workspace
- **Cron job frequency:** isolated cron jobs spin up full agent turns; prefer less frequent schedules for expensive tasks
- **Task batching:** group similar tasks into a single message — never make multiple separate API calls when one will do

### Community Cost Benchmarks

Reported results from the OpenClaw community:

- **80–95% cost reduction** when tiering models properly and moving automation to budget/free models
- **Realistic minimum savings:** ~20% with basic model routing
- **Optimization-heavy setups** (LiteLLM proxy + Ollama heartbeats + tiering + session isolation): **50%+ reduction**

> Source: [LumaDock — OpenClaw Cost Optimization & Budgeting](https://lumadock.com/tutorials/openclaw-cost-optimization-budgeting)

---

## Misc Notes

- Default gateway port: **18789**
- Config format: **JSON5** (comments allowed, trailing commas OK)
- OpenClaw requires Node **22.16+** (Node 24 recommended)
- MIT licensed, open source: https://github.com/openclaw/openclaw
- Docs: https://docs.openclaw.ai
- ClawHub (skills registry): https://clawhub.com
- Security contact: security@openclaw.ai
- Full docs index (for LLM consumption): https://docs.openclaw.ai/llms.txt
