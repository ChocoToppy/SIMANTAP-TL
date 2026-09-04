# Deploying to cPanel (main hosting)

Firebase Hosting deploys via `firebase deploy`. The cPanel-hosted site
deploys via SSH instead of manual zip/upload/extract.

## Day-to-day usage

```bash
npm run deploy                # build:production (kp-only mode) + push to cPanel
npm run deploy:experimental   # build:experimental (full mode) + push to cPanel
```

This builds with Vite and copies `dist/` to `/home/simantap/public_html`
on the cPanel server over SSH (`scp -r`). It only overwrites/adds files —
it never deletes anything remotely, so server-managed files
(`.well-known`, `.user.ini`) are always safe. One side effect: stale old
hashed asset files (e.g. old `index-XXXX.js`) are never cleaned up
automatically — clear them out manually via cPanel File Manager
occasionally if it matters.

Connection details (see `scripts/deploy-cpanel.mjs`):
- Host: `103.185.53.36` (port 22), user `simantap`
- Remote path: `/home/simantap/public_html/`
- Auth: SSH key at `~/.ssh/simantap_cpanel` (private key, local only)

## Setting up a new device

The private key never leaves the machine it was created on, so a new
device needs its own key pair authorized in cPanel.

1. Generate a key pair on the new device:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/simantap_cpanel -N "" -C "simantap-deploy"
   ```
2. Copy the contents of `~/.ssh/simantap_cpanel.pub`.
3. In cPanel: **SSH Access → Manage SSH Keys → Import Key**. Paste the
   public key, save it, then click **Authorize** next to it in the
   Public Keys list (an unauthorized key can't log in).
4. Test it:
   ```bash
   ssh -i ~/.ssh/simantap_cpanel -p 22 simantap@103.185.53.36 "echo ok"
   ```
5. Pull this repo and run `npm run deploy` as usual — `scripts/deploy-cpanel.mjs`
   already points at the right key path, host, and remote directory.

If a device is lost or retired, revoke just its key in cPanel's Public
Keys list — no need to touch anything on other devices.

## Why not rsync?

The cPanel server is shared hosting with no root access, and has no
`rsync` binary and no rsync daemon — installing one isn't an option.
`scp -r` was used instead since both ends already have OpenSSH.
