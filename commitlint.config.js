// Convenção de mensagens de commit (Conventional Commits).
// Uso local/opcional: `npx commitlint --edit` ou via hook de commit.
// Tipos permitidos: feat, fix, refactor, docs, test, chore, perf, ci.
// Ver rules/common/git-workflow.md e CONTRIBUTING.md.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "docs", "test", "chore", "perf", "ci"],
    ],
  },
};
