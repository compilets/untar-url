#!/usr/bin/env node

import {untar} from './index';

if (process.argv.length != 4) {
  console.error('Usage: untar-url url-of-tar target-dir');
  process.exit(0);
}

untar(process.argv[2], process.argv[3]);
