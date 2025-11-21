#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const allowedTypes = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert'
];

function exitWithError(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function readCommitMessage(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    exitWithError(`无法读取提交信息：${error.message}`);
  }
}

function main() {
  const file = process.argv[2];
  if (!file) {
    exitWithError('缺少提交信息路径参数。');
  }

  const absolutePath = path.resolve(file);
  const message = readCommitMessage(absolutePath);
  const firstLine = message
    .split('\n')
    .find((line) => line.trim().length > 0) || '';

  if (
    firstLine.startsWith('Merge ') ||
    firstLine.startsWith('Revert ') ||
    firstLine.startsWith('fixup! ') ||
    firstLine.startsWith('squash! ')
  ) {
    return;
  }

  const typePattern = new RegExp(
    `^(${allowedTypes.join('|')})(\\(.+\\))?:`,
    'i'
  );

  if (!typePattern.test(firstLine)) {
    exitWithError(
      `提交信息需以 ${allowedTypes.join(', ')} 之一开头，例如 "feat: add xx"。`
    );
  }
}

main();
