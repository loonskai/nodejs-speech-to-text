import { config } from 'dotenv';
config();
import { spawn } from 'child_process';
import { Transform, PassThrough, pipeline } from 'stream';
import { SpeechConfig, AudioConfig, AudioInputStream, SpeechRecognizer } from 'microsoft-cognitiveservices-speech-sdk';

const { SUBSCRIPTION_KEY } = process.env;
if (typeof SUBSCRIPTION_KEY !== 'string') throw new Error('SUBSCRIPTION_KEY is required');
const pushStream = AudioInputStream.createPushStream();
const speechConfig = SpeechConfig.fromSubscription(SUBSCRIPTION_KEY, 'eastus');
speechConfig.speechRecognitionLanguage = 'en-US';

const pass = new PassThrough();
pass.on('data', data => {
  console.log('DEBUG', data);
});

const transform = new Transform({
  transform(arrayBuffer, encoding, callback) {
    pushStream.write(arrayBuffer.slice());
    callback();
  },
});
transform.on('end', () => {
  console.log('end');
});

// https://github.com/microsoft/cognitive-services-speech-sdk-js/issues/91#issuecomment-534793212
const rec = spawn('rec', 
  [
    '-t', 'wav', 
    '-b', '16', 
    '-e', 'signed-integer',
    '-c', '1',
    '-r', '16000',
    '-',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);

const pipelineCallback = (err: NodeJS.ErrnoException | null): void => {
  pushStream.close();
  const audioConfig = AudioConfig.fromStreamInput(pushStream);
  const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
  recognizer.recognizeOnceAsync((result) => {
    console.log(result.text);
    recognizer.close();
  }, err => {
    console.trace('Error', err);
    recognizer.close();
  });
};

pipeline(
  rec.stdout,
  pass,
  transform,
  pipelineCallback
);

setTimeout(() => {
  rec.kill();
}, 3000);
