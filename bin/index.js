#!/usr/bin/env node

const fs = require('fs');
const util = require('util');

const commitMsgFilePath = process.argv[2];
const lintRulesFilePath = process.argv[3];

const promisifiedReadFile = util.promisify(fs.readFile);

const getCommitMsg = async () => {
  if (!commitMsgFilePath) {
    return Promise.reject('No file path provided for commit message');
  }
  return await promisifiedReadFile(commitMsgFilePath, 'utf8');
};

const getLintRules = async () => {
  if (!lintRulesFilePath) {
    return Promise.reject('No file path provided for linting rules');
  }
  return await promisifiedReadFile(lintRulesFilePath, 'utf8');
};

// Colorized logger.
const colLogger = {
  error: (msg) => console.error('\x1b[31m%s\x1b[0m', msg),
  warn: (msg) => console.warn('\x1b[33m%s\x1b[0m', msg),
  log: (msg) => console.log('\x1b[32m%s\x1b[0m', msg),
};

const exit = (code) => {
  colLogger[code === 0 ? 'log' : 'error'](
    `lint-my-commit finished with exit code ${code}`
  );

  process.exit(code);
};

const splitCommitMsg = (commitMsg) => {
  // Sections.
  let subject, body, footer;

  // Safety check before going on.
  if (typeof commitMsg !== 'string' || !commitMsg.trim()) {
    colLogger.error('Empty commits are not allowed!');
    exit(1);
  }

  const lines = commitMsg.split(/\r?\n/g).map((line) => {
    // Harmonize blank lines (maybe they contain spaces).
    return line.trim() === '' ? line.trim() : line;
  });

  // Extract subject and check for emptiness.
  subject = lines.shift();

  if (!subject) {
    colLogger.error('Subject cannot be empty!');
    exit(1);
  }

  // Shift again, and store this possible blank or undefined line.
  const blankOrUndefinedLine = lines.shift();

  // Determine if there is a next section (body).
  const bodyStart = lines.findIndex((line) => line !== '');

  if (bodyStart !== -1) {
    // Body should be clearly separated from subject,
    // the following MUST NOT evaluate to true.
    if (blankOrUndefinedLine) {
      colLogger.error('Body should be preceeded by a blank line!');
      exit(1);
    }

    body = [];
    footer = [];

    // Iterate over the remaining lines.
    for (let i = bodyStart; i < lines.length; i++) {
      const line = lines[i];

      // Once an empty line is reached,
      // transition from body to footer.
      if (line === '' || footer.length) {
        footer.push(line);
        continue;
      }

      body.push(line);
    }
  }

  return {
    subject,
    body: body ?? [],
    footer: footer ?? [],
  };
};

const extractRules = (lintRules) => {
  // Organize them in a Map object,
  // for later ease in checking and access.
  const rulesMap = new Map();

  if (!lintRules || typeof lintRules !== 'object') {
    return rulesMap;
  }

  Object.entries(lintRules).forEach((rule) => {
    const key = rule[0];
    const value = rule[1];

    switch (key) {
      // Currently supported patterns.
      case 'subjectPattern':
      case 'bodyPattern':
      case 'footerPattern':
        rulesMap.set(key, new RegExp(value));
        break;
      default:
        colLogger.warn(`Unrecognized key "${key}" in rules config file`);
        break;
    }
  });

  return rulesMap;
};

const manageInvalidLines = (lines) => {
  colLogger.error('Following lines present linting errors:');

  lines.forEach((line) => {
    colLogger.error(`${line}`);
  });

  exit(1);
};

const validate = (commitMsgSections, extractedRules) => {
  // It makes no sense to continue in this case.
  if (!extractedRules.size) {
    colLogger.warn(
      'No available linting rules, exiting process with status code 0'
    );
    exit(0);
  }

  const { subject, body, footer } = commitMsgSections;

  const invalidLines = [];

  if (extractedRules.has('subjectPattern')) {
    const subjectValid = extractedRules.get('subjectPattern').test(subject);

    !subjectValid && invalidLines.push(subject);
  }

  if (extractedRules.has('bodyPattern')) {
    const bodyRegExp = extractedRules.get('bodyPattern');
    const bodyValid = body.every((line) => bodyRegExp.test(line));

    !bodyValid &&
      invalidLines.push(...body.filter((line) => !bodyRegExp.test(line)));
  }

  if (extractedRules.has('footerPattern')) {
    const footerRegExp = extractedRules.get('footerPattern');
    const footerValid = footer
      .filter((line) => line !== '')
      .every((line) => footerRegExp.test(line));

    !footerValid &&
      invalidLines.push(...footer.filter((line) => !footerRegExp.test(line)));
  }

  invalidLines.length && manageInvalidLines(invalidLines);

  colLogger.log('Commit message validated successfully');
  exit(0);
};

const main = async () => {
  try {
    colLogger.log('Linting commit message...');

    const [commitMsg, lintRulesJSON] = await Promise.all([
      getCommitMsg(),
      getLintRules(),
    ]);

    const commitMsgSections = splitCommitMsg(commitMsg);
    const extractedRules = extractRules(JSON.parse(lintRulesJSON));

    validate(commitMsgSections, extractedRules);
  } catch (error) {
    colLogger.error('Something went wrong. Please, review your configuration.');
    colLogger.error(error);
    exit(1);
  }
};

main();
