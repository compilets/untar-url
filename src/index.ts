import path from 'node:path';
import {Readable} from 'node:stream';
import {finished} from 'node:stream/promises';
import {createGunzip} from 'node:zlib';
import {createReadStream} from 'node:fs';
import {mkdirSync} from 'node:fs';
import {symlink, writeFile} from 'node:fs/promises';
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
    const target = `${targetDir}/${head.name}`;
    // Create parent directory.
    if (head.typeflag == tar.TypeFlag.DIR_TYPE) {
      mkdirSync(target, {recursive: true});
      return;
    }
    // Create symbol link.
    if (head.typeflag == tar.TypeFlag.SYM_TYPE) {
      queue.add(() => symlink(head.linkname!, target));
      return;
    }
    // Write file.
    queue.add(() => writeFile(target, file, {mode: head.mode}));
  });
  await finished(readable.pipe(extract.receiver));
  await queue.done();
}
