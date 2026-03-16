import type { ProgressSection } from '@/types'

export const PROGRESS_SECTIONS: ProgressSection[] = [
  {
    id: 'installation',
    label: 'Installation',
    description: 'Install OpenClaw (local, VPS, Docker, VM, cloud)',
  },
  {
    id: 'api-model',
    label: 'API Key & Model Setup',
    description: 'Configure provider API key and default model',
  },
  {
    id: 'gateway',
    label: 'Gateway Setup',
    description: 'Port, bind address, authentication mode',
  },
  {
    id: 'channels',
    label: 'Channels',
    description: 'Telegram, Discord, WhatsApp, Slack, iMessage, Web UI',
  },
  {
    id: 'web-search',
    label: 'Web Search',
    description: 'Configure search provider (e.g. Brave Search)',
  },
  {
    id: 'skills',
    label: 'Skills',
    description: 'Install skills from ClawHub',
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Hardening checklist and security audit',
  },
  {
    id: 'memory',
    label: 'Memory',
    description: 'SOUL.md, USER.md, MEMORY.md setup',
  },
  {
    id: 'cron',
    label: 'Cron Jobs & Heartbeats',
    description: 'Background tasks and scheduled routines',
  },
  {
    id: 'cost',
    label: 'Cost Optimization',
    description: 'Best practices for reducing API costs',
  },
  {
    id: 'first-usecase',
    label: 'Your First Use Case',
    description: 'Get your first automation running',
    useCases: [
      {
        title: 'Daily Morning Brief',
        description:
          'Get a fully customized daily briefing — emails, calendar, news, and AI-recommended actions — texted to you every morning.',
      },
      {
        title: 'Meeting Prep Assistant',
        description:
          'Before each meeting, OpenClaw researches attendees, summarizes relevant threads, and drafts talking points.',
      },
      {
        title: 'Code Review Bot',
        description:
          'Set up OpenClaw to review pull requests, suggest improvements, and post comments on GitHub.',
      },
      {
        title: 'Personal Research Agent',
        description:
          'Ask a research question and get a structured summary with sources delivered to your preferred channel.',
      },
    ],
  },
]
