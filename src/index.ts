import {Readable} from 'node:stream';
import {finished} from 'node:stream/promises';
import {createGunzip} from 'node:zlib';
import {createReadStream} from 'node:fs';
import {mkdirSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

import * as tar from 'tar-mini';
import {newQueue} from '@henrygd/queue';

interface UntarOptions {
  filter?: (fileName: string) => boolean;
}

export async function untar(url: string, targetDir: string, options?: UntarOptions) {
  // Fetch url.
  let readable: Readable;
  if (new URL(url).protocol == 'file:') {
    readable = createReadStream(fileURLToPath(url));
  } else {
    const response = await fetch(url);
    if (!response.ok || !response.body)
      throw new Error(`fetch failed with status code: ${response.status}`);
    readable = Readable.fromWeb(response.body);
  }
  // Handle gzip decompression.
  if (url.endsWith('.gz') || url.endsWith('.tgz')) {
    readable = readable.pipe(createGunzip());
  }
  // Parse the files.
  const queue = newQueue(5);
  const extract = tar.createExtract();
  extract.on('entry', (head, file) => {
    // Filter files.
    if (options?.filter && !options.filter(head.name)) {
      return;
    }
    // Create parent directory.
    if (head.name.endsWith('/')) {
      mkdirSync(`${targetDir}/${head.name}`, {recursive: true});
      return;
    }
    // Write head.
    queue.add(() => writeFile(`${targetDir}/${head.name}`, file, {mode: head.mode}));
  });
  await finished(readable.pipe(extract.receiver));
  await queue.done();
}
