const cryptoAsync = require('@ronomon/crypto-async');

const algorithm = 'SHA1';

export function checkIntegrity(hash: string, content: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    cryptoAsync.hash(algorithm, content, (err: any, res: Buffer) => {
      if (err) {
        return reject(err);
      }
      if (res.toString('hex') === hash) {
        resolve();
      } else {
        reject(new Error('Piece is invalid'));
      }
    });
  });
}
