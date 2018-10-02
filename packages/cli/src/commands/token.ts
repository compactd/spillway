import { Command, flags as Flags } from '@oclif/command';
import { Config } from '@spillway/config';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export default class Token extends Command {
  static description = 'Generate various token for the server';

  static examples = [
    `$ spillway token auth "My desktop computer" --expires=3w
Generate a auth token for My desktop computer that expires in 3 weeks
`,
  ];

  static flags = {
    help: Flags.help({ char: 'h' }),
    expires: Flags.string({
      char: 'e',
      description: 'Expire time (see https://www.npmjs.com/package/ms)',
      default: '3w',
    }),
    hostId: Flags.string({
      char: 'i',
      description: 'Host id, generated if not specified',
    }),
  };

  static args = [
    {
      name: 'type',
      options: ['auth'],
    },
    {
      name: 'hostname',
      description: 'A friendly name for the host',
    },
  ];

  async run() {
    const { args, flags } = this.parse(Token);

    switch (args.type) {
      case 'auth':
        const config = new Config();
        const secret = await config.getSecret();
        const token = jwt.sign(
          {
            hi: flags.hostId || randomBytes(6).toString('hex'),
            hn: args.hostname,
          },
          secret,
          { expiresIn: flags.expires || '3w' },
        );

        this.log(`
Successfully generated a new auth token, please keep this very private!

    ${token}`);
    }
  }
}
