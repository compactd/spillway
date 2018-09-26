import { homedir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs';

export default class Config {
  constructor(private configPath = join(homedir(), '.spillway')) {}

  getSecret() {
    return promisify(readFile)(join(this.configPath, 'secret'), 'utf-8');
  }

  setSecret(secret: string) {
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
