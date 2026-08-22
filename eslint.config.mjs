import tseslint from "typescript-eslint";
import noMoneyFloat from "./eslint-rules/no-money-float.mjs";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/drizzle/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      local: { rules: { "no-money-float": noMoneyFloat } },
    },
    rules: {
      "local/no-money-float": "error",
    },
  },
);