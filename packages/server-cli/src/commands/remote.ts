import { Command, flags as Flags } from '@oclif/command';
import { Config } from '@spillway/config';
import cli from 'cli-ux';

export default class Remote extends Command {
  static description = 'Generate various token for the server';

  static examples = [
    `$ spillway remote add default localhost:5979
`,
  ];

  static flags = {
    help: Flags.help({ char: 'h' }),
  };

  static args = [
    {
      name: 'op',
      options: ['add'],
    },
    {
      name: 'name',
      description: 'An identifier. default is recommended',
    },
    {
      name: 'target',
      description: 'hostname:port',
    },
  ];

  async run() {
    const { args, flags } = this.parse(Remote);

    switch (args.op) {
      case 'add':
        const config = new Config();
        this.log('\n');
        const token = await cli.prompt('  Please enter the auth token', {
          type: 'mask',
        });

        await config.addRemote(args.name, args.target, token);

        this.log(`
  Added entry to the remote list`);
    }
  }
}
