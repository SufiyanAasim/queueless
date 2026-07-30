import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const releases = [
  { version: '1.0.0', codename: 'Nova', milestone: 'Sight', prerelease: true },
  { version: '1.0.5', codename: 'Comet', milestone: 'Alive' },
  { version: '1.2.0', codename: 'Eclipse', milestone: 'Crew' },
  { version: '1.2.5', codename: 'Nebula', milestone: 'Pulse' },
  { version: '1.3.0', codename: 'Polaris', milestone: 'Relay' },
  { version: '1.3.5', codename: 'Zenith', milestone: 'Intelligent Collaboration' },
  { version: '1.4.0', codename: 'Orion', milestone: 'Beacon' },
  { version: '1.4.5', codename: 'Pulsar', milestone: 'Insight' },
  { version: '1.5.0', codename: 'Quasar', milestone: 'Forge' },
  { version: '1.5.5', codename: 'Aurora', milestone: 'Summit' },
  { version: '1.6.0', codename: 'Cosmos', milestone: 'LAN Connectivity & UI Polish' },
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
  const notesPath = `docs/releases/${tag}.md`;
  expectContains(notesPath, `# 🚀 QueueLess — ${tag}`);
  expectContains(notesPath, `> Codename *${release.codename}* - ${release.milestone}`);
  expectContains('README.md', `| [${tag}]`);
  expectContains('README.md', `| **${release.codename}** | ${release.milestone} |`);
  expectContains('RELEASE.md', `| ${tag}`);
  if (release.prerelease) {
    expectContains(notesPath, 'The first pre-release of **QueueLess**');
    expectContains('README.md', `| [${tag}](${notesPath}) | **${release.codename}** | ${release.milestone} | **Pre-release**`);
    expectContains('RELEASE.md', `${tag} ${release.codename} is designated as a pre-release`);
  }
}

const expectedTags = releases.map(({ version }) => `v${version}`);
if (process.argv.includes('--tags')) {
  const tags = execFileSync('git', ['tag', '--list', 'v*', '--sort=version:refname'], {
    cwd: root,
    encoding: 'utf8',
  }).trim().split(/\r?\n/).filter(Boolean);
  expect(
    JSON.stringify(tags) === JSON.stringify(expectedTags),
    `Git tags are ${tags.join(', ')}; expected ${expectedTags.join(', ')}`,
  );
}

if (failures.length > 0) {
  console.error('Release consistency check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const scope = process.argv.includes('--tags') ? 'metadata and Git tags' : 'metadata';
console.log(`Release ${scope} verified: ${expectedTags.join(' → ')}`);
