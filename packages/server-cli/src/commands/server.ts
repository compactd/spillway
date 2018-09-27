import { Command, flags as Flags } from '@oclif/command';
import { SpillwayServer } from '@spillway/server';
import { Config } from '@spillway/config';

const INSTANCE_NAME = 'spillway-server';

export default class Server extends Command {
  static description = 'Run the server on the foreground';

  static examples = [
    `$ spillway server
`,
  ];

  static flags = {
    help: Flags.help({ char: 'h' }),
    port: Flags.integer({ char: 'p', description: 'Specifies port to use' }),
  };

  static args = [];

  async run() {
    const { args, flags } = this.parse(Server);

    const config = new Config();

    const server = new SpillwayServer({
      port: flags.port || 5979,
      secret: await config.getSecret(),
    });

    server.listen();
  }
}
