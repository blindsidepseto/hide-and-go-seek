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
