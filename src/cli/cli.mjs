#!/usr/bin/env node

import main from '../index.mjs';

const command = process.argv[2];

await main({ command });
