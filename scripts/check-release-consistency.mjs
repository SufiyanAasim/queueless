import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const releases = [
  { version: '1.2.0', former: '1.0.0', codename: 'Nova' },
  { version: '1.2.5', former: '1.0.5', codename: 'Comet' },
  { version: '1.3.0', former: '1.2.0', codename: 'Eclipse' },
  { version: '1.3.5', former: '1.2.5', codename: 'Nebula' },
  { version: '1.4.0', former: '1.3.0', codename: 'Polaris' },
  { version: '1.4.5', former: '1.3.5', codename: 'Zenith' },
  { version: '1.5.0', former: '1.4.0', codename: 'Orion' },
  { version: '1.5.5', former: '1.4.5', codename: 'Pulsar' },
  { version: '1.6.0', former: '1.5.0', codename: 'Quasar' },
  { version: '1.6.5', former: '1.5.5', codename: 'Aurora' },
  { version: '1.7.0', former: '1.6.0', codename: 'Cosmos' },
];

const current = releases.at(-1);
const failures = [];

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function expectContains(relativePath, expected) {
  expect(
    read(relativePath).includes(expected),
    `${relativePath} is missing: ${expected}`,
  );
}

for (const relativePath of [
  'frontend/package.json',
  'frontend/package-lock.json',
  'backend/package.json',
  'backend/package-lock.json',
]) {
  const manifest = JSON.parse(read(relativePath));
  expect(
    manifest.version === current.version,
    `${relativePath} has version ${manifest.version ?? '(missing)'}; expected ${current.version}`,
  );
  if (relativePath.endsWith('package-lock.json')) {
    expect(
      manifest.packages?.['']?.version === current.version,
      `${relativePath} root package has version ${manifest.packages?.['']?.version ?? '(missing)'}; expected ${current.version}`,
    );
  }
}

expectContains('frontend/src/config/release.js', `version: '${current.version}'`);
expectContains('frontend/src/config/release.js', `codename: '${current.codename}'`);
expectContains('backend/src/app.js', "const { version } = require('../package.json');");

for (const relativePath of [
  'frontend/src/components/Layout.jsx',
  'frontend/src/pages/Credits.jsx',
  'frontend/src/pages/AdminReport.jsx',
]) {
  expect(
    !/\bv\d+\.\d+\.\d+\b/.test(read(relativePath)),
    `${relativePath} contains a hard-coded release version`,
  );
}

expectContains('README.md', `version-${current.version}-blue`);
expectContains('README.md', `**Latest release:** v${current.version} — ${current.codename}`);
expectContains('SUPPORT.md', `v${current.version} "${current.codename}"`);
expectContains('ROADMAP.md', `v${current.version} "${current.codename}"`);
expectContains('.github/ISSUE_TEMPLATE/bug_report.yml', `v${current.version} "${current.codename}"`);
expectContains('docs/Troubleshooting.md', `version: "${current.version}"`);

const changelogVersions = [...read('CHANGELOG.md').matchAll(/^## QueueLess v(\d+\.\d+\.\d+) —/gm)]
  .map((match) => match[1]);
const expectedDescending = releases.map(({ version }) => version).reverse();
expect(
  JSON.stringify(changelogVersions) === JSON.stringify(expectedDescending),
  `CHANGELOG.md order is ${changelogVersions.join(', ')}; expected ${expectedDescending.join(', ')}`,
);

for (const release of releases) {
  const tag = `v${release.version}`;
  const formerTag = `v${release.former}`;
  const notesPath = `docs/releases/${tag}.md`;
  expectContains(notesPath, `# QueueLess — ${tag}`);
  expectContains(notesPath, `**Codename: ${release.codename}`);
  expectContains(notesPath, `**Former label:** ${formerTag}`);
  expectContains('README.md', `| [${tag}]`);
  expectContains('README.md', `| ${formerTag} | **${release.codename}** |`);
  expectContains('RELEASE.md', `| ${tag}`);
  expectContains('RELEASE.md', `| ${formerTag}`);
}

const tags = execFileSync('git', ['tag', '--list', 'v*', '--sort=version:refname'], {
  cwd: root,
  encoding: 'utf8',
}).trim().split(/\r?\n/).filter(Boolean);
const expectedTags = releases.map(({ version }) => `v${version}`);
expect(
  JSON.stringify(tags) === JSON.stringify(expectedTags),
  `Git tags are ${tags.join(', ')}; expected ${expectedTags.join(', ')}`,
);

if (failures.length > 0) {
  console.error('Release consistency check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Release consistency verified: ${expectedTags.join(' → ')}`);
