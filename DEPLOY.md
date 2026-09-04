# Deployment & Git guide

There are two independent deploy targets:
- **Firebase Hosting** (`simantap-tl.web.app`) via `firebase deploy`
- **cPanel** (`simantaptlundip.com`) via `npm run deploy` (see below)

Plus GitHub for source control.

## First-time setup on a brand new device

1. Install Git for Windows (bundles Git Credential Manager) and Node.js.
2. Clone the repo:
   ```bash
   git clone https://github.com/ChocoToppy/SIMANTAP-TL.git
   cd SIMANTAP-TL
   npm install
   ```
3. One-time git identity:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```
4. GitHub auth: the remote is HTTPS, so no SSH key is needed. The first
   `git push` or `git pull` opens a browser window to log into GitHub;
   Credential Manager caches the token afterward.
5. Firebase auth (only needed if deploying to Firebase Hosting from this
   device): `npx firebase login` (once — opens a browser login).
6. cPanel deploy (only needed if deploying to cPanel from this device):
   see "Setting up a new device" under cPanel Deployment below — needs
   its own SSH key authorized in cPanel.

## Day-to-day

```bash
git pull                        # get latest changes
# ...make changes...
git add -A
git commit -m "message"
git push                        # pushes current branch to its tracked remote

npx firebase deploy --only hosting   # deploy to Firebase Hosting
npm run deploy                       # deploy to cPanel (kp-only build)
npm run deploy:experimental          # deploy to cPanel (full build)
```

## cPanel deployment

Deploys via SSH instead of manual zip/upload/extract.

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

### Setting up a new device for cPanel deploy

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

### Why not rsync?

The cPanel server is shared hosting with no root access, and has no
`rsync` binary and no rsync daemon — installing one isn't an option.
`scp -r` was used instead since both ends already have OpenSSH.
