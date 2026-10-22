import * as fs from 'fs';
import * as path from 'path';

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
const channel = (name: string) => manifest.dataChannels
  .find((c: { name: string }) => c.name === name);

describe('manifest.json', () => {
  it('Given the game channel, then only the presenter or a moderator can start or end a game', () => {
    expect(channel('game')).toEqual({
      name: 'game',
      pushPermission: ['moderator', 'presenter'],
      replaceOrDeletePermission: ['moderator', 'presenter'],
    });
  });

  it('Given the results channel, then every player can report, and only the presenter or a moderator can clear it', () => {
    expect(channel('results')).toEqual({
      name: 'results',
      pushPermission: ['all'],
      replaceOrDeletePermission: ['moderator', 'presenter'],
    });
  });
});

describe('manifest requiredSdkVersion', () => {
  // BBB checks this with npm-style semver rules (akka-bbb-apps .../core/util/SemverRange.scala,
  // identical in v4.0.x-release and v4.1.x-develop); npm's semver package follows the same rules.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const semver = require('semver');
  const range = manifest.requiredSdkVersion;

  it('Given the SDK of BBB 4.0.0 and 4.1-develop, or any later 1.x SDK, then the plugin loads', () => {
    ['1.0.0-beta.3', '1.0.0-beta.4', '1.0.0-rc.1', '1.0.0', '1.3.2']
      .forEach((version) => {
        expect({ version, ok: semver.satisfies(version, range) }).toEqual({ version, ok: true });
      });
  });

  it('Given an SDK from another major line, an older beta, or an unrelated pre-release, then the plugin is refused', () => {
    ['2.0.0', '0.1.26', '0.1.20', '1.0.0-beta.2', '1.1.0-alpha.1']
      .forEach((version) => {
        expect({ version, ok: semver.satisfies(version, range) }).toEqual({ version, ok: false });
      });
  });
});
