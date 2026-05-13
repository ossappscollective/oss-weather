import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "OSS Weather",
  description: "Open Source Weather App - Detailed weather data from multiple providers",
  base: '/',
  head: [
    ['link', { rel: 'icon', href: '/oss-weather/favicon.ico' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en' }],
    ['meta', { property: 'og:site_name', content: 'OSS Weather' }],
  ],
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Features', link: '/features/' },
      { text: 'Download', link: '/download' },
      { text: '❤️ Sponsor', link: 'https://github.com/sponsors/farfromrefug' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'API Keys', link: '/guide/api-keys' }
          ]
        },
        {
          text: 'Usage',
          items: [
            { text: 'Basic Usage', link: '/guide/basic-usage' },
            { text: 'Weather Providers', link: '/guide/weather-providers' },
            { text: 'Widgets', link: '/guide/widgets' },
            { text: 'Settings', link: '/guide/settings' }
          ]
        }
      ],
      '/features/': [
        {
          text: 'Features',
          items: [
            { text: 'Overview', link: '/features/' },
            { text: 'Weather Data', link: '/features/weather-data' },
            { text: 'Weather Radar', link: '/features/weather-radar' },
            { text: 'Hourly Charts', link: '/features/hourly-charts' },
            { text: 'Daily Forecasts', link: '/features/daily-forecasts' },
            { text: 'Weather Comparison', link: '/features/weather-comparison' },
            { text: 'Astronomy Data', link: '/features/astronomy' },
            { text: 'Air Quality', link: '/features/air-quality' },
            { text: 'Weather Map', link: '/features/weather-map' },
            { text: 'Home Widgets', link: '/features/home-widgets' },
            { text: 'Smartwatch Support', link: '/features/smartwatch' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/farfromrefug' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/in/martinguillon/' },
      {
        icon: {
          svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Open Collective</title><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12c2.54 0 4.894-.79 6.834-2.135l-3.107-3.109a7.715 7.715 0 1 1 0-13.512l3.107-3.109A11.943 11.943 0 0 0 12 0zm9.865 5.166l-3.109 3.107A7.67 7.67 0 0 1 19.715 12a7.682 7.682 0 0 1-.959 3.727l3.109 3.107A11.943 11.943 0 0 0 24 12c0-2.54-.79-4.894-2.135-6.834z"/></svg>'
        },
        link: 'https://opencollective.com/oss-appscollective',
        // You can include a custom label for accessibility too (optional but recommended):
        ariaLabel: 'Open Collective'
      }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present OSS Apps Collective'
    },

    search: {
      provider: 'local'
    }
  },
  // Enable sitemap generation
  sitemap: {
    hostname: 'https://ossweather.akylas.fr',
    transformItems: (items) => {
      return items
    }
  },
  transformPageData: (pageData, { siteConfig }) => {
    // Initialize the `head` frontmatter if it doesn't exist.
    pageData.frontmatter.head ??= []

    // Add basic meta tags to the frontmatter.
    pageData.frontmatter.head.push(
      [
        'meta',
        {
          property: 'og:title',
          content:
            pageData.frontmatter.title || pageData.title || siteConfig.site.title,
        },
      ],
      [
        'meta',
        {
          name: 'twitter:title',
          content:
            pageData.frontmatter.title || pageData.title || siteConfig.site.title,
        },
      ],
      [
        'meta',
        {
          property: 'og:description',
          content:
            pageData.frontmatter.description || pageData.description || siteConfig.site.description,
        },
      ],
      [
        'meta',
        {
          name: 'twitter:description',
          content:
            pageData.frontmatter.description || pageData.description || siteConfig.site.description,
        },
      ],
    )
  },
})
