/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    {
      type: "category",
      label: "Introduction",
      collapsible: false,
      items: ["introduction"]
    },
    {
      type: "category",
      label: "Concepts",
      items: ["concepts"]
    },
    {
      type: "category",
      label: "Getting Started",
      items: ["getting-started"]
    },
    {
      type: "category",
      label: "Writing Modules",
      items: ["writing-modules"]
    },
    {
      type: "category",
      label: "Advanced Topics",
      items: [
        "advanced/advanced-gas-performance",
        "advanced/advanced-routing",
        "advanced/advanced-limit-order-module"
      ]
    },
    {
      type: "category",
      label: "Testing & Tooling",
      items: ["testing-tooling"]
    },
    {
      type: "category",
      label: "Security Considerations",
      items: ["security"]
    },
    {
      type: "category",
      label: "API Reference",
      items: ["api-reference"]
    },
    {
      type: "category",
      label: "Examples & Recipes",
      items: ["examples-recipes"]
    }
  ]
};

module.exports = sidebars;
