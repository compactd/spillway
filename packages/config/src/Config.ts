import { homedir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import * as fs from 'fs';

export default class Config {
  constructor(private configPath = join(homedir(), '.spillway')) {}

  async ensureSetup({ mkdir } = { mkdir: fs.mkdir }) {
    try {
      await promisify(mkdir)(join(homedir(), '.spillway'));
    } catch {}
  }

  async addRemote(
    name: string,
    target: string,
    token: string,
    { mkdir, writeFile } = fs,
  ) {
    await this.ensureSetup({ mkdir });
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

  async getRemote(name: string, { readFile, mkdir } = fs) {
    await this.ensureSetup({ mkdir });
    const dir = join(this.configPath, 'remotes');

    const data = await promisify(readFile)(join(dir, name));

    const [target, token] = data.toString('utf-8').split('\n');

    return { target, token };
  }

  getSecret({ readFile } = fs) {
    return promisify(readFile)(join(this.configPath, 'secret'), 'utf-8');
  }

  async setSecret(secret: string, { mkdir, writeFile } = fs) {
    await this.ensureSetup({ mkdir });
    await promisify(writeFile)(
      join(this.configPath, 'secret'),
      secret,
      'utf-8',
    );
  }

  getPath() {
    return this.configPath;
  }
}
