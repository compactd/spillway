import { Command, flags as Flags } from '@oclif/command';
import { promisify } from 'util';
import * as fs from 'fs';
import { Config as ServerConfig } from '@spillway/config';
import { randomBytes } from 'crypto';
import { log } from '../logger';

export default class Config extends Command {
  static fs = fs;
  static description = 'Edit configuration fr the server';

  static examples = [
    `$ spillway config set secret --generate
`,
  ];

  static flags = {
    help: Flags.help({ char: 'h' }),
  };

  static args = [
    {
      name: 'op',
      options: ['set'],
    },
    {
      name: 'key',
      description: 'The config key to edit',
    },
    {
      name: 'value',
      required: false,
    },
  ];

  async run() {
    const { args, flags } = this.parse(Config);
    const config = new ServerConfig();

    log('writing to path %s', config.getPath());

    switch (args.op) {
      case 'set':
        if (args.key === 'secret') {
          log('setting secret');

          const secret = args.value || randomBytes(512).toString('base64');

          await config.setSecret(secret, Config.fs);

          if (!args.value) {
            this.log(
              '\n  Successfully generated a 512 bits token and saved to config',
            );
          } else {
            this.log('\n  Successfully written value to config');
          }
        }
    }
  }
}
