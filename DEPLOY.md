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
npm run deploy                       # deploy to cPanel (prod build — KP + Magang)
npm run deploy:experimental          # deploy to cPanel (full build)
```

## Dist Files

...bash
npm run build:production - KP & Magang (for simantaptlundip.com; vite --mode prod
  — see src/utils/config.js for which programs each mode allows)
npm run build:experimental - all (for simantap-tl.web.app)

## cPanel deployment

Deploys via SSH instead of manual zip/upload/extract.

```bash
npm run deploy                # build:production (mode prod: KP + Magang) + push to cPanel
npm run deploy:experimental   # build:experimental (full mode) + push to cPanel
```

This builds with Vite and copies `dist/` to `/home/simantap/public_html`
on the cPanel server over SSH (`scp -r`). It only overwrites/adds files —
it never deletes anything remotely, so server-managed files
(`.well-known`, `.user.ini`) are always safe. One side effect: stale old
hashed asset files (e.g. old `index-XXXX.js`) are never cleaned up
automatically — clear them out manually via cPanel File Manager
occasionally if it matters.

### Known quirk: deploy causes a full-site 404 (fixed automatically since 2026-09-22)

**What happened:** after running `npm run deploy`, the whole site started
returning LiteSpeed's "404 Not Found" — not a broken page, a total outage,
even though every file (`index.html`, `assets/`, etc.) was still physically
present and untouched on the server.

**Root cause:** `scp -r` run from a Windows/Git-Bash OpenSSH client creates
any *new* remote directory with the wrong permissions — it strips the
"group" permission bucket entirely, so a folder that should be `rwxr-xr-x`
(755) ends up as `rwx---rwx` (707: owner full access, group **nothing**,
everyone else full access). LiteSpeed doesn't serve pages as "you" — it
runs the request as a process belonging to the `nobody` group. Reaching
any file requires "execute" (traverse/enter) permission on *every*
directory in its path, not just read permission on the file itself. With
group-execute stripped on `public_html`, the `nobody`-group LiteSpeed
process couldn't step inside the directory at all — the door was locked
to it specifically — so it reported 404 for literally everything, files
included, despite nothing having been deleted or moved.

**Why manual uploads (drag-drop / zip-extract via cPanel File Manager)
never hit this:** cPanel's File Manager creates directories using its own
normal defaults, never going through the Windows-OpenSSH `scp` code path
that mangles permissions. So manual upload was never exposed to the bug —
which is exactly the pattern that was observed ("scp deploy → 404, manual
upload → works").

**The fix — two parts:**
1. Immediately: restored proper permissions (`755`) on every directory
   under `public_html` over SSH, which brought the site back instantly.
2. For good: `deploy-cpanel.mjs` now runs `chmod 755` on every directory
   under `public_html` automatically, right after every `scp`. This fix
   lives in the *script*, not in any one machine's config — so it applies
   no matter which computer runs `npm run deploy`/`deploy:experimental`,
   as long as it's this repo with the current script.

**What if you deploy from a different machine?**
- Another **Windows + Git Bash** machine will likely hit the same
  underlying `scp` quirk on new folders — but the automatic `chmod` step
  self-heals it immediately afterward, same as here.
- A **Mac or Linux** machine uses a native OpenSSH client rather than the
  Windows/Git-Bash translation layer, so it probably wouldn't even
  trigger the quirk in the first place — but the `chmod` step still runs
  regardless, so it's covered either way.
- A **brand-new device** needs its own SSH key authorized in cPanel first
  (see "Setting up a new device" below) — a one-time, unrelated step.
- **The one gap:** the automatic fix only applies if you deploy through
  `npm run deploy` / `npm run deploy:experimental`. If someone ever runs a
  raw `scp -r dist/. ...` by hand, skipping the npm script, they skip the
  automatic fix-up too and could hit the same 404 again.

If this ever recurs, check permissions first
(`ssh ... "ls -la /home/simantap/public_html/"`) before assuming files
were lost — compare against `.well-known/` (never touched by deploy, so
it's always a known-good baseline). Manual fix if needed:
```bash
ssh -i ~/.ssh/simantap_cpanel -p 22 simantap@103.185.53.36 \
  "find /home/simantap/public_html -type d -exec chmod 755 {} \;"
```

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
