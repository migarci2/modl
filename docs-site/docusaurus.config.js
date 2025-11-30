// @ts-check
const {themes} = require("prism-react-renderer");
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

const config = {
  title: "MODL Docs",
  tagline: "Composable Uniswap v4 hooks for power users",
  url: "https://migarci2.github.io",
  baseUrl: process.env.BASE_URL || "/modl/",
  favicon: "img/logo.svg",
  organizationName: "migarci2",
  projectName: "modl",
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn"
    }
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/migarci2/modl/tree/main/docs-site/",
        },
        blog: false,
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      })
    ]
  ],
  themeConfig: {
    image: "img/logo.svg",
    navbar: {
      title: "MODL",
      items: [
        {type: "docSidebar", sidebarId: "docsSidebar", position: "left", label: "Docs"},
        {
          href: "https://migarci2.github.io/modl/deck/",
          label: "Deck",
          position: "left",
          target: "_self",
        },
        {
          href: "https://github.com/migarci2/modl",
          label: "GitHub",
          position: "right"
        }
      ]
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/migarci2/modl"
            }
          ]
        }
      ]
    },
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,
      additionalLanguages: ["solidity", "toml", "bash"]
    }
  }
};

module.exports = config;
