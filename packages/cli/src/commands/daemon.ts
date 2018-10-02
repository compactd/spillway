import { Command, flags as Flags } from '@oclif/command';
import * as pm2 from 'pm2';
import { promisify } from 'util';
import { join } from 'path';

const INSTANCE_NAME = 'spillway-server';

export default class Daemon extends Command {
  static description = 'Manage the server instance';

  static examples = [
    `$ spillway daemon start
`,
  ];

  static flags = {
    help: Flags.help({ char: 'h' }),
  };

  static args = [
    {
      name: 'op',
      options: ['start', 'stop'],
    },
  ];

  async run() {
    const { args, flags } = this.parse(Daemon);

    await promisify(pm2.connect.bind(pm2))();

    const processes = await promisify(pm2.list.bind(pm2))();

    const instance = processes.find(p => p.name === INSTANCE_NAME);

    switch (args.op) {
      case 'start':
        if (!instance) {
          await promisify(pm2.start.bind(pm2))(
            join(__dirname, '../../daemon.config.js'),
          );
          this.log(`\n  Successfully started daemon`);

          return this.exit(0);
        } else {
          this.log('\n  Daemon is already running');

          return this.exit(1);
        }
      case 'stop':
        if (!instance) {
          this.log(`  Could not stop daemon, it is not running`);
          return;
        }

        await promisify(pm2.stop.bind(pm2))(INSTANCE_NAME);

        this.log('\n  Stopped runnign daemon');
        return this.exit(0);
    }
  }
}
