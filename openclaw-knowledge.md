# OpenClaw Knowledge Base

> Personal notes and research on OpenClaw — the foundation for the ClawPath playbook.
> Add findings here as you learn, test, and experiment.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Onboarding Wizard (`openclaw onboard`)](#onboarding-wizard-openclaw-onboard)
- [Configuration](#configuration)
- [Channels](#channels)
- [Security](#security)
- [Skills & ClawHub](#skills--clawhub)
- [Memory System](#memory-system)
- [SOUL.md](#soulmd)
- [Cron Jobs & Heartbeats](#cron-jobs--heartbeats)
- [Model Providers](#model-providers)
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

- Multi-channel gateway: WhatsApp, Telegram, Discord, iMessage, Slack with a single Gateway process
- Plugin channels: Mattermost and more via extension packages
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

```bash
# Other install methods available: Docker, Podman, Nix, Ansible, Bun
# See https://docs.openclaw.ai/install for Docker Compose examples
```

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

### Two Paths: Quickstart vs Advanced

At the start of the wizard (after the risk acknowledgment), you choose your flow:

|                    | Quickstart                               | Advanced                                  |
| ------------------ | ---------------------------------------- | ----------------------------------------- |
| **Port**           | Default (18789)                          | You choose                                |
| **Bind address**   | Loopback only                            | You choose                                |
| **Auth mode**      | Token (auto-generated)                   | Token or Password                         |
| **Tailscale**      | Off                                      | You choose                                |
| **Daemon install** | Auto (yes)                               | You choose                                |
| **Best for**       | Local, single-user, getting started fast | VPS, remote access, custom network setups |

**Quickstart defaults:**

- `tools.profile: "coding"` — installs coding tool profile
- `session.dmScope: "per-channel-peer"` — isolated session per channel/peer
- Telegram + WhatsApp DM allowlists enabled

---

### Step-by-Step: Advanced (Manual) Flow

#### Step 0 — Risk Acknowledgment

Before anything else, the wizard surfaces a security acknowledgment you must confirm:

> _"I understand this is personal-by-default and shared/multi-user use requires lock-down."_

Key warnings it covers:

- OpenClaw is in beta — expect sharp edges
- Trust model is personal-by-default (not hardened for multi-user by default)
- Tools can execute real actions — understand what you're enabling
- Shared/multi-user deployments require additional security hardening
- Baseline recommendations: use pairing/allowlists, sandbox where possible, apply least-privilege

You cannot proceed without confirming this.

---

#### Step 1 — Reset Handling (if existing config detected)

If a config already exists, the wizard asks what to reset before continuing:

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

#### Step 3 — Gateway: Port

Set the port the gateway listens on.

- **Default:** `18789`
- Must be a valid port number
- Quickstart always uses the default; advanced lets you change it
- If you change it, update all channel configs and clients accordingly

---

#### Step 4 — Gateway: Bind Address

Controls which network interfaces the gateway accepts connections from. This is one of the most important security decisions.

| Option       | Binds to                | Use case                                                               |
| ------------ | ----------------------- | ---------------------------------------------------------------------- |
| **Loopback** | `127.0.0.1`             | Local machine only — most secure, recommended default                  |
| **LAN**      | `0.0.0.0`               | All network interfaces — accessible from your local network            |
| **Tailnet**  | Tailscale IP            | Remote access via Tailscale mesh — secure without exposing to internet |
| **Auto**     | Loopback → LAN fallback | Tries loopback, falls back to LAN automatically                        |
| **Custom**   | User-specified IPv4     | Bind to a specific IP address                                          |

> ⚠️ **Security note:** Never bind to `0.0.0.0` on a public VPS without a firewall or tunnel. Use Loopback + SSH tunnel or Tailnet for remote access.

> ⚠️ **Tailscale constraint:** Selecting Tailnet forces `bind=loopback` internally — Tailscale handles the network exposure layer.

---

#### Step 5 — Gateway: Authentication Mode

Controls how clients authenticate to the gateway.

| Option                | How it works                     | Notes                                     |
| --------------------- | -------------------------------- | ----------------------------------------- |
| **Token** _(default)_ | Auto-generated bearer token      | Recommended for both local and remote use |
| **Password**          | User-defined password credential | Required if using Tailscale Funnel mode   |

For token mode, the wizard can either auto-generate a token or let you provide your own.

---

#### Step 6 — Gateway: Tailscale Exposure

Only relevant if you have Tailscale installed and want remote access without SSH tunnels.

| Option              | What it does                                                               |
| ------------------- | -------------------------------------------------------------------------- |
| **Off** _(default)_ | No Tailscale — gateway only accessible via local bind address              |
| **Serve**           | Exposes gateway to your Tailnet (private mesh only)                        |
| **Funnel**          | Exposes gateway publicly via Tailscale Funnel — **requires password auth** |

If the Tailscale binary isn't detected on the system, the wizard will warn you.

The wizard also asks whether to **reset Tailscale config on exit** — useful during testing so you don't leave stale Tailscale configurations behind.

---

#### Step 7 — Workspace Directory

Sets the directory where OpenClaw stores agent files (SOUL.md, MEMORY.md, skills, etc.).

- **Default:** `~/.openclaw/workspace`
- Can be any path you have write access to
- Quickstart always uses the default; advanced lets you customise

---

#### Step 8 — API Key / Model Provider

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

#### Step 9 — Model Selection

After configuring the provider, choose the default model.

- The wizard lists available models for the selected provider
- This becomes the default model for all agents unless overridden per-agent
- Can be changed later via `openclaw config` or editing `openclaw.json`

---

#### Step 10 — Channel Setup

Add one or more communication channels (Telegram, WhatsApp, Discord, Slack, iMessage, Web UI, etc.).

- You can add multiple channels in this step or skip and add later
- Each channel walks through its own auth flow (bot tokens, QR pairing, OAuth, etc.)
- Quickstart defaults: Telegram and WhatsApp allowlists enabled by default

---

#### Step 11 — Web Search Configuration

The wizard checks for configured search providers (Brave Search, etc.) and their API keys. If none are set, it alerts you that web search won't work until configured.

---

#### Step 12 — Skills Setup

Install recommended skills from ClawHub for your use case.

- Quickstart installs a curated "coding tool profile" by default
- Advanced lets you pick skills manually
- Skills can also be installed/removed later via `openclaw skills`

---

#### Step 13 — Daemon / Service Installation

Installs OpenClaw as a persistent background service so it starts automatically.

| Platform | Service type         |
| -------- | -------------------- |
| macOS    | LaunchAgent          |
| Linux    | systemd user service |

The wizard asks whether to install the daemon (Quickstart defaults to yes).

For Linux, it also handles **systemd user lingering** — ensures the user service keeps running after you log out. If systemd isn't available, it skips this with a notification.

If a daemon is already installed, you're offered:

- **Restart** the existing service
- **Reinstall** (removes old, installs fresh)
- **Skip** (leave it as-is)

---

#### Step 14 — Health Check

The wizard runs a 15-second connectivity check to verify the gateway is reachable and responding. If it fails, it shows diagnostics to help you identify the issue.

---

#### Step 15 — Bot Hatching (First Launch)

Choose how to start interacting with your agent:

| Option                       | What happens                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------ |
| **TUI mode** _(recommended)_ | Opens the terminal UI and sends `"Wake up, my friend!"` to bootstrap the agent |
| **Web UI**                   | Opens the browser dashboard (`openclaw dashboard`) with an embedded auth token |
| **Later**                    | Defers — you can open the dashboard manually with `openclaw dashboard`         |

---

#### Step 16 — Shell Completion

Installs tab-completion for the `openclaw` CLI in your shell (bash/zsh).

- Quickstart: auto-installs without prompting
- Advanced: prompts for confirmation
- If already installed, this step is skipped
- If installation fails, it suggests running `openclaw completion --install` manually

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

| Action | Keys |
|--------|------|
| Save | `Ctrl+O` then `Enter` |
| Exit | `Ctrl+X` |
| Save and exit | `Ctrl+O` → `Enter` → `Ctrl+X` |
| Undo | `Alt+U` |
| Jump to line | `Ctrl+_` then type number |

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

### Lark

> Plugin channel — install separately. See https://docs.openclaw.ai/channels for details.

---

## Security

> **Source:** https://docs.openclaw.ai/security

### Security Model

OpenClaw is **personal-by-default** — designed for a single user or small trusted group. It is **not** a hardened multi-tenant system out of the box. Shared or team deployments require additional hardening.

### Quick Security Audit

```bash
openclaw security audit --deep
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

OpenClaw uses a file-based memory system persisted in the workspace directory.

### Files

| File | Purpose |
|------|---------|
| `~/.openclaw/workspace/SOUL.md` | Agent identity + standing instructions — loaded every session |
| `~/.openclaw/workspace/USER.md` | User preferences and profile — loaded every session |
| `~/.openclaw/workspace/MEMORY.md` | Long-term persistent memory (full) |
| `~/.openclaw/workspace/memory/YYYY-MM-DD.md` | Daily memory snapshots — only today's file loaded at session start |
| `~/.openclaw/agents/<agentId>/sessions/` | Per-session conversation transcripts |

### How It Works

- **SOUL.md**: Agent identity + routing rules + behavioral instructions. Loaded at every session start. Any change to this file resets the prompt cache.
- **USER.md**: User-specific preferences and profile context. Loaded at every session start alongside SOUL.md.
- **MEMORY.md** (full): All persistent memory — avoid loading this automatically; use `memory_search()` to query it on demand.
- **Daily memory files** (`memory/YYYY-MM-DD.md`): Lightweight session summaries. The pattern in SOUL.md instructs the agent to write a bullet-point summary (<500 words) here at the end of each session and to load only today's file at session start. This avoids loading all historical memory and keeps costs low.
- **Session context**: Each channel+peer combination gets its own session. `session.dmScope: "per-channel-peer"` (default) isolates DM sessions per channel.
- The agent can be instructed to save/recall information using memory tools.

### Session Isolation

| Setting                               | Behavior                                        |
| ------------------------------------- | ----------------------------------------------- |
| `session.dmScope: "per-channel-peer"` | Each channel+peer has its own session (default) |
| `session.dmScope: "global"`           | All DMs share one session across channels       |

### Memory in Multi-Channel Setups

- DM sessions (Telegram, WhatsApp, Discord DMs): long-term memory auto-loaded
- Group/guild channels: use `/memory` or memory tools to access persistent context
- Per-topic sessions in Telegram forums: isolated by topic ID

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

| Field | Description |
|-------|-------------|
| `every` | Interval (e.g. `"1h"`, `"55m"`, `"30m"`) |
| `model` | Which model to use — use Ollama for free local heartbeats |
| `session` | Session target: `"main"` or a session ID |
| `target` | Channel for delivery: `"slack"`, `"telegram"`, `"whatsapp"`, etc. |
| `prompt` | The heartbeat message sent to the agent |

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

| Rule | Detail |
|------|--------|
| `"primary"` must be a **full model path** | Use `"anthropic/claude-haiku-4-5"`, not an alias like `"haiku"`. Using an alias causes `Invalid input` on startup. |
| Cache lives under `params`, not top-level | Correct: `"params": { "cacheRetention": "short" }` inside the model entry. Wrong: top-level cache block or `"cache": true` directly on the model. |
| `heartbeat` belongs inside `agents → defaults` | Do **not** add `heartbeat` as a new top-level section — OpenClaw will reject it. |
| `diagnostics` **is** a top-level section | The `diagnostics` block is a sibling of `"agents"` and `"commands"` — not nested inside agents. |
| Invalid fields | `tier`, `role`, `cache` (bare boolean), `cache_ttl`, `fallback_chain` — remove these if present anywhere. |

### Config

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-haiku-4-5",   // full path — NOT alias
        fallbacks: [
          "openai/gpt-5-mini",
          "google/gemini-2.0-flash",
          "deepseek/deepseek-chat",
        ],
      },
      imageModel: {
        primary: "openai/gpt-4o", // used when primary can't handle images
      },
      heartbeat: { every: "55m" },   // inside defaults, NOT top-level
      contextPruning: {
        mode: "cache-ttl",
        ttl:  "1h",
      },
      models: {
        // ⚠️ keys must be full provider/model paths
        "anthropic/claude-opus-4-6":   { alias: "opus",         params: { cacheRetention: "long"  } },
        "anthropic/claude-sonnet-4-6": { alias: "sonnet",       params: { cacheRetention: "short" } },
        "anthropic/claude-haiku-4-5":  { alias: "haiku"         /* no cache — cheap enough */     },
        "openai/gpt-5-mini":           { alias: "gpt-5-mini"    },
        "openai/gpt-5.1":              { alias: "gpt-5.1"       },
        "google/gemini-2.0-flash":     { alias: "gemini-flash"  },
        "google/gemini-2.0-pro":       { alias: "gemini-pro"    },
        "deepseek/deepseek-chat":      { alias: "deepseek"      },
        "deepseek/deepseek-reasoner":  { alias: "deepseek-r1"   },
      },
    },
  },
}
```

### `cacheRetention` Values

| Value | Meaning |
|-------|---------|
| `"none"` | Caching disabled — every message pays full price |
| `"short"` | Cache held for ~5 minutes of inactivity |
| `"long"` | Cache held for ~1 hour of inactivity |

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

| Rule violated | Symptom | Fix |
|---------------|---------|-----|
| `"primary"` set to an alias | `Invalid input` at startup | Change to full model path: `"anthropic/claude-haiku-4-5"` |
| Cache set incorrectly | Validation error | Use `"params": { "cacheRetention": "short" }` inside the model entry — not a top-level `"cache"` block or bare `"cache": true` |
| `heartbeat` added as top-level key | Rejected config | Move `heartbeat` inside `agents → defaults` |
| Invalid fields present | Validation error | Remove `tier`, `role`, `cache_ttl`, `fallback_chain` — these are not valid anywhere |
| `diagnostics` nested inside `agents` | Rejected config | Move `diagnostics` to top level (sibling of `"agents"`) |
| Missing comma after `"defaults"` closing `}` | JSON parse error | The `"list"` block that follows `"defaults"` requires a comma after `"defaults": { ... },` |

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

| Lever | What it does | Where to configure |
|-------|-------------|-------------------|
| **Model routing** | Use Haiku by default; only escalate to Sonnet for complex tasks | SOUL.md routing rules |
| **Prompt caching** | Reuse SOUL.md/USER.md across messages at ~90% lower cost | `params.cacheRetention` on model entries |
| **Cache warm heartbeat** | 55-minute ping prevents cache expiry, avoids rebuild cost | `agents.defaults.heartbeat.every: "55m"` |
| **Context pruning** | Removes stale tool outputs after cache TTL window | `agents.defaults.contextPruning` |
| **Load limits** | Only load today's memory file, not full history | SOUL.md session init block |
| **Ollama for heartbeats** | Free local model for routine check-ins | `heartbeat.model: "ollama/llama3.2:3b"` |
| **Skill pruning** | Each skill adds ~97 chars to context — remove unused ones | `openclaw skills` |
| **Light context cron jobs** | Skip workspace bootstrap for routine scheduled tasks | `--light-context` flag |
| **OpenRouter free tier** | Free models for non-critical fallback tasks | `openclaw models scan` |

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

### Other Strategies

- **Limit context window:** keep MEMORY.md concise; use `lightContext: true` for cron jobs that don't need full workspace
- **Cron job frequency:** isolated cron jobs spin up full agent turns; prefer less frequent schedules for expensive tasks
- **Task batching:** group similar tasks into a single message — never make multiple separate API calls when one will do

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
