import { homedir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import * as fs from 'fs';

export default class Config {
  constructor(private configPath = join(homedir(), '.spillway')) {}

  async addRemote(
    name: string,
    target: string,
    token: string,
    { mkdir, writeFile } = fs,
  ) {
    const dir = join(this.configPath, 'remotes');
    try {
      await promisify(mkdir)(dir);
    } catch {}

    return promisify(writeFile)(
      join(dir, name),
      `${target}\n${token}`,
      'utf-8',
    );
  }

  async getRemote(name: string, { readFile } = fs) {
    const dir = join(this.configPath, 'remotes');

    const data = await promisify(readFile)(join(dir, name));

    const [target, token] = data.toString('utf-8').split('\n');

    return { target, token };
  }

  getSecret({ readFile } = fs) {
    return promisify(readFile)(join(this.configPath, 'secret'), 'utf-8');
  }

  setSecret(secret: string, { writeFile } = fs) {
    return promisify(writeFile)(
      join(this.configPath, 'secret'),
      secret,
      'utf-8',
    );
  }

  getPath() {
    return this.configPath;
  }
}
