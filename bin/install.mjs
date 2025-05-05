#!/usr/bin/env node

import fs from 'fs'
import { ensureFileSync } from "fs-extra"
import Handlebars from "handlebars"
import path from 'path'
import stream from 'stream'
import util from 'util'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { execSync } from 'child_process'
import helpers from 'handlebars-helpers'

helpers();
const pipeline = util.promisify(stream.pipeline);

const argv = yargs(hideBin(process.argv))
  .usage('Usage: npx @nocd/f <src> <dst> [pth] [options]')
  .command('$0 <src> <dst> [pth]', 't', (yargs) => {
    yargs.positional('src', {
      describe: 'Url or path of input',
      type: 'string'
    })
    yargs.positional('dst', {
      describe: 'Url or path of template',
      type: 'string'
    })
    yargs.positional('pth', {
      describe: 'Path of file',
      type: 'string'
    })
  })
  .options({
    o: {
      describe: 'Overwrite (default: false)',
      type: 'boolean'
    }
  })
  .help('h')
  .demandCommand(1)
  .parse();

function ret(output) {
  // console.log("OUTPUTSTART");
  console.log(Buffer.from(output).toString('base64'));
  // console.log("OUTPUTEND");
}

const normalize = (src, fun=JSON.parse) => {
  const cmd0 = `npx @nocd/n ${src}`
  const esc = execSync(cmd0).toString();
  const o = Buffer.from(esc, 'base64').toString('utf-8')
  if(!o) {
    throw new Error("Not Found!");
  }
  return fun ? fun(o) : o;
}

(async () => {

  const src = normalize(argv.src);
  const dst = normalize(argv.dst, null);
  const pth = argv.pth ? path.resolve(argv.pth) : undefined;
  const ovr = argv.o;

  console.log(src);
  const template = Handlebars.compile(dst);
  const output = template(src);

  if (pth) {
    let isdir;
    let filename = pth;
    try {
      isdir = fs.lstatSync(pth).isDirectory();
    } catch (e) {
      isdir = false;
    }
    if (isdir) {
      filename = path.resolve(pth, path.basename(argv.dst));
    }
    if (fs.existsSync(filename) && !ovr) {
      ret(output);
      return;
    }
    ensureFileSync(filename);
    await pipeline(output, fs.createWriteStream(filename));
    ret(output);
  } else {
    ret(output);
  }

})();
