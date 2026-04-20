import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'LinkFlare',
  description: 'Multi-channel messaging PaaS for global businesses',
  lang: 'en-US',
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Guide', link: '/guide/quick-start' },
      { text: 'API', link: '/api/reference' },
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Quick Start', link: '/guide/quick-start' },
          { text: 'Webhook Integration', link: '/guide/webhook-integration' },
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'REST API', link: '/api/reference' },
        ]
      },
      {
        text: 'Self-Hosted',
        items: [
          { text: 'Edge Agent', link: '/self-hosted/edge-agent' },
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/lvdongbo/link-flare' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 LinkFlare'
    }
  }
})
