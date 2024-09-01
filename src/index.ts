import {Readable} from 'node:stream';
import {createReadStream} from 'node:fs';
import {mkdirSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

import * as Throttle from 'promise-parallel-throttle';
import {Tsunami} from './tsunami';

interface UntarOptions {
  filter?: (fileName: string) => boolean;
  fileTypes?: RegExp[],
}

export async function untar(url: string, targetDir: string, options?: UntarOptions) {
  // Fetch url.
  let readable: ReadableStream;
  if (new URL(url).protocol == 'file:') {
    readable = Readable.toWeb(createReadStream(fileURLToPath(url))) as ReadableStream;
  } else {
    const response = await fetch(url);
    if (!response.ok || !response.body)
      throw new Error(`fetch failed with status code: ${response.status}`);
    readable = response.body;
  }
  // Handle gzip decompression.
  if (url.endsWith('.gz') || url.endsWith('.tgz')) {
    readable = readable.pipeThrough(new DecompressionStream('gzip'));
  }
  // Parse the files.
  const tsunami = new Tsunami(options?.fileTypes ?? [ /.*/ ], true);
  const blob = await new Response(readable).blob();
  await tsunami.untar(new File([ blob ], url));
  // Write files.
  const tasks = [];
  for (const file of tsunami.files) {
    // Filter files.
    if (options?.filter && !options.filter(file.name)) {
      continue;
    }
    // Create parent directory.
    if (file.name.endsWith('/')) {
      mkdirSync(`${targetDir}/${file.name}`, {recursive: true});
      continue;
    }
    // Write file.
    tasks.push(() => writeFile(`${targetDir}/${file.name}`, Buffer.from(file.buffer), {mode: file.mode}));
  }
  await Throttle.all(tasks);
}
