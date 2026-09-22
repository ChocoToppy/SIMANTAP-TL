#!/usr/bin/env node
// Builds the production bundle and copies it to cPanel over SSH.
// Requires: an authorized SSH key (see ~/.ssh/simantap_cpanel).
// Remote has no rsync (shared hosting, no root), so this uses scp -r —
// it overwrites/adds files but never deletes anything on the remote,
// so server-managed files (.well-known, .user.ini) are always safe.
import { execSync } from 'node:child_process';

const HOST = 'simantap@103.185.53.36';
const PORT = 22;
const REMOTE_PATH = '/home/simantap/public_html/';
const SSH_KEY = '~/.ssh/simantap_cpanel';

const mode = process.argv[2] === 'experimental' ? 'experimental' : 'production';
const buildScript = mode === 'experimental' ? 'build:experimental' : 'build:production';

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

console.log(`Deploying ${mode} build...`);
run(`npm run ${buildScript}`);
run(`scp -i ${SSH_KEY} -P ${PORT} -r dist/. ${HOST}:${REMOTE_PATH}`);

// scp -r run from a Windows/Git-Bash OpenSSH client creates any NEW remote
// directories with group permissions stripped (e.g. "rwx---rwx" instead of
// "rwxr-xr-x"). LiteSpeed serves requests as a process in the "nobody"
// group, so a directory with no group-execute bit can't be traversed at
// all -> the whole site 404s even though every file is actually present.
// Restore normal directory perms after every deploy so this can't recur.
run(`ssh -i ${SSH_KEY} -p ${PORT} ${HOST} "find ${REMOTE_PATH} -type d -exec chmod 755 {} \\;"`);

console.log('Deploy complete.');
