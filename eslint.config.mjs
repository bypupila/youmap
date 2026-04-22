import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs", "*.config.mjs", "eslint.config.mjs"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];

export default config;
