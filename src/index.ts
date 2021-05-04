import { spawn } from 'child_process';
import * as fs from 'fs';
import { Transform, PassThrough, pipeline } from 'stream';

const pass = new PassThrough();
pass.on('data', data => {
  console.log(data);
});

const transform = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk);
    callback();
  },
});

const rec = spawn('rec', ['-t', 'wav', '-e', 'signed-integer', '-'],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);

pipeline(
  rec.stdout,
  pass,
  transform,
  fs.createWriteStream('test.wav'),
  (err: any) => { console.log(err); }
);
