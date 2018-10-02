import { Command, flags as Flags } from '@oclif/command';
import { Config } from '@spillway/config';
import { WirePool, DownstreamWire } from '@spillway/protocol';
import * as io from 'socket.io-client';
import * as parseTorrent from 'parse-torrent';
import { promisify } from 'util';
import { readFile } from 'fs';
import * as ProgressBar from 'progress';
import { join } from 'path';
import * as prettyBytes from 'pretty-bytes';

const FSChunkStore = require('fs-chunk-store');

export default class Torrents extends Command {
  static description = 'Generate various token for the server';

  static examples = [
    `$ spillway torrents download ./debian-9.5.0-amd64-netinst.iso.torrent
`,
  ];

  static flags = {
    help: Flags.help({ char: 'h' }),
    remote: Flags.string({ char: 'r', default: 'default' }),
  };

  static args = [
    {
      name: 'op',
      options: ['download'],
    },
    {
      name: 'file',
      description: 'A torrent file/magnet',
    },
  ];

  async run() {
    const { args, flags } = this.parse(Torrents);

    switch (args.op) {
      case 'download':
        const config = new Config();

        const remote = await config.getRemote(flags.remote || 'default');

        this.log(`\n  Connecting to ${remote.target}\n`);

        const pool = new WirePool(
          {
            maxConnections: 50,
            target: 'http://' + remote.target,
          },
          r => {
            const socket = io(r, {
              query: 'auth_token=' + remote.token,
            });

            socket.on('error', this.log);
            return new DownstreamWire(socket as any);
          },
        );

        const content = await promisify(readFile)(args.file);

        const { infoHash, pieceLength, files, pieces, length } = parseTorrent(
          content,
        ) as parseTorrent.Instance;

        if (!infoHash) return;

        const bar = new ProgressBar('  [:bar] :curr/:tot :srate/s eta: :etas', {
          total: (pieces || []).length,
          width: 20,
        });

        const store = new FSChunkStore(pieceLength, {
          files: (files || []).map(file =>
            Object.assign({}, file, {
              path: join(process.cwd(), file.path),
            }),
          ),
        });

        const time = Date.now();
        const totalSize = length || 1;
        let done = 0;

        pool.retrieveTorrent(infoHash, (index, offset, piece) => {
          store.put(index, piece, (err: any) => {
            if (err) {
              this.log(err);
            }
            done += piece.length;
            bar.tick({
              curr: `       ${prettyBytes(done)}`.slice(-7),
              tot: `       ${prettyBytes(totalSize)}`.slice(-7),
              srate: prettyBytes((1000 * done) / (Date.now() - time + 1)),
            });
          });
        });

        pool.addTorrent(content);

        return;
    }
  }
}
