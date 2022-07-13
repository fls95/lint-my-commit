# lint-my-commit

Lightweight package in order to lint commit messages based on configurable rules

## Main features

- It has **zero dependencies** on other projects.
- It is **extremely lightweight** (just one small main executable `.js` file).
- It can be used as part of `commit-msg` git hook.
- **Linting rules** are purely **based on regular expressions**, which allows a great level of **customization and flexibility** (any pattern can be validated).

## Execution

In order to validate a commit message against a set of rules:

```bash
npx lint-my-commit <path-to-commit-msg-file> <path-to-linter-rules-json-file>
```

Where:

- \<path-to-commit-msg-file\>: Normally, .git/COMMIT_EDITMSG, but it could be any file containing text that must be checked.
- \<path-to-linter-rules-json-file\>: Any `.json` file containing any (or all) the rules mentioned below.

## Rules configurable through `.json` file

This file can be named as desired, the only two conditions that must meet are:

- It should contain a valid JSON object.
- It should be reachable by the executable.

Three regular expressions can be provided, one for each section of the commit (more about them in the next point), but none of them are mandatory, meaning that certain (or all) sections of the commit can be free of any form of validation.

Additional key-value pairs specified in this configuration file will be ignored by the program.

```json
{
  "subjectPattern": "^subject_regex$",
  "bodyPattern": "^body_regex$",
  "footerPattern": "^footer_regex$"
}
```

These regular expresions are checked against **each line** of **each section**.

The only lines that are completely ignored by the linter are the blank lines belonging to the footer section.

## Commit structure

`lint-my-commit` assumes the following commit structure for all commits:

```
<subject> (Mandatory)

<body> (Optional)

<footer> (Optional)
```

Which is adaptable to almost every commit convention currently in use.

## Predefined rules and assumptions

1. Commit must always at least include a subject.
2. Subject and body must be separated by at least one blank line.
3. Footer starts immediately with the first blank line after the body (this first blank line is considered a part of the footer).
4. Footer blank lines are completely ignored.

## License

[MIT](LICENSE)
