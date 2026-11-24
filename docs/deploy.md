# Deploying TravelBliss (owner setup)

The steps only the owner can do, to get from this repo to a live site and keep it running. The design and its
reasons are in [ADR 0006](adr/0006-deploy-oracle-free-tailscale-funnel.md). Everything stays on free tiers.

What you end up with:

- `https://travelbliss.<tailnet>.ts.net`: public through Tailscale Funnel. The web app and the API share this one
  origin.
- One Oracle Cloud Always Free VM, built by Terraform from [`infra/oracle/`](../infra/oracle/), with no inbound port
  open.
- Every merge to `main` that passes CI deploys itself (`.github/workflows/deploy.yml`):
  1. migrations run with the new image
  2. the stack switches to it
  3. it switches back if the site doesn't answer
- A nightly encrypted Postgres backup to Google Drive, plus one before every migration. A rebuilt VM restores the
  newest.
- A check every 6 hours that opens an `outage` issue while the site is down (`.github/workflows/uptime.yml`).

Everything below happens in WSL on your PC, except the parts in a browser.

## 1. Oracle

The same account and API key as openGym. Stay on **Free Tier**: never upgrade to Pay As You Go, which is what makes
billing possible.

- [ ] `~/.oci/config` and its key from openGym's setup work as they are. Terraform needs the `tenancy=` line.
- [ ] Free shapes: ARM `VM.Standard.A1.Flex` (TravelBliss uses 1 OCPU / 2 GB) or the AMD micro
      `VM.Standard.E2.1.Micro` (1 GB). ARM is often "out of capacity"; see step 4.

## 2. GitHub

- [ ] **Repository variables** (Settings → Secrets and variables → Actions → Variables):
  - `DEPLOY_ARCH`: `arm64` for the ARM VM, `amd64` for the micro. It picks the runner that builds the images.
  - `SITE_URL`: `https://travelbliss.<tailnet>.ts.net`. Read by the deploy's environment link and the uptime check.
- [ ] **Gotcha:** changing `DEPLOY_ARCH` doesn't rebuild what's already published. Re-run the latest **Images** run on
      `main`, or the VM's pull fails with "no matching manifest".
- [ ] After the first push to `main`, make both GHCR packages **public**: your profile → Packages →
      `travelbliss-api` / `travelbliss-web` → Package settings → Change visibility. The VM pulls without a token.
- [ ] **Repository secrets** `TS_OAUTH_CLIENT_ID` and `TS_OAUTH_SECRET`: from step 3.

## 3. Tailscale

MagicDNS and HTTPS certificates are on already, from openGym.

- [ ] **Access controls:** merge these into your policy:

  ```json
  "tagOwners": {
    "tag:travelbliss": ["autogroup:admin"],
    "tag:ci": ["autogroup:admin"]
  },
  "nodeAttrs": [
    { "target": ["tag:travelbliss"], "attr": ["funnel"] }
  ],
  "ssh": [
    { "action": "accept", "src": ["autogroup:admin"], "dst": ["tag:travelbliss"], "users": ["ubuntu", "root"] },
    { "action": "accept", "src": ["tag:ci"], "dst": ["tag:travelbliss"], "users": ["root"] }
  ]
  ```

  If the policy still has the default allow-all `acls` rule (`"src": ["*"], "dst": ["*:*"]`), a CI node could reach
  openGym and your devices. Replace it with grants, so members reach anything and CI reaches only the VM's SSH:

  ```json
  "grants": [
    { "src": ["autogroup:member"], "dst": ["*"], "ip": ["*"] },
    { "src": ["tag:ci"], "dst": ["tag:travelbliss"], "ip": ["22"] }
  ]
  ```

- [ ] **Auth key** for the VM's first boot: Settings → Keys → Generate auth key. Not reusable, tag
      `tag:travelbliss`, 1-day expiry.
- [ ] **OAuth client** for deploys: Settings → OAuth clients, scope **Auth Keys (write)**, tag `tag:ci`. Store its
      ID and secret as the GitHub secrets in step 2.

## 4. Build the VM

```bash
ssh-keygen -t ed25519 -f ~/.ssh/oracle-travelbliss -N ""   # emergency key only; day to day it's Tailscale SSH
cd infra/oracle
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars    # tenancy_ocid, tailscale_auth_key; Google's client (step 6) is easiest now
terraform init
terraform apply          # read the plan, type yes
```

- [ ] **"Out of host capacity"** is normal for ARM. Retry until it works:
      `bash -c 'until terraform apply -auto-approve; do sleep 600; done'`. Still nothing after a day or two? Set
      `shape = "micro"` and `DEPLOY_ARCH=amd64` (and re-run Images, step 2).
- [ ] Watch first boot (about 5 minutes on the micro VM). It ends with `== Done: https://travelbliss.<tailnet>.ts.net`:

  ```bash
  ssh ubuntu@travelbliss sudo tail -f /var/log/cloud-init-output.log
  ```

- [ ] Tailscale → Machines → `travelbliss` → **Disable key expiry**. Otherwise the VM drops off your tailnet, and the
      site goes offline, after 180 days.
- [ ] Save the backup passphrase in your password manager. Without it, the backups can't be opened:
      `terraform output -raw backup_passphrase; echo`.
- [ ] Open the site from any device, with or without Tailscale.

Every variable is documented in `terraform.tfvars.example`: `tenancy_ocid`, `tailscale_auth_key`,
`ssh_public_key_path`, `ssh_source`, `availability_domain`, `shape`, `arm_ocpus`, `arm_memory_gbs`, the Google and
Facebook client ID and secret, and `rclone_conf_path`. The state and `terraform.tfvars` hold every production secret:
they're git-ignored, so keep them only on your machine.

## 5. Backups

They reuse openGym's `gdrive` rclone remote. Its `drive.file` scope only sees files rclone created, and TravelBliss
writes to its own folder, `travelbliss-backups`.

- [ ] A **new** VM gets `~/.config/rclone/rclone.conf` from Terraform (`rclone_conf_path`). For the VM that's
      **already running**, copy it once:

  ```bash
  ssh root@travelbliss 'mkdir -p /root/.config/rclone && cat > /root/.config/rclone/rclone.conf && chmod 600 /root/.config/rclone/rclone.conf' < ~/.config/rclone/rclone.conf
  ```

- [ ] Make the first backup and check it arrives in Drive:
      `ssh root@travelbliss /opt/travelbliss/backup.sh backup`.

From then on, a backup runs nightly at 03:30 UTC (log: `/var/log/travelbliss-backup.log`) and before every
migration. **A failed backup stops the deploy.** Until `rclone.conf` is on the VM, deploys warn "backups aren't set up"
and carry on.

## 6. Google sign-in

See [Linked sign-in setup › Production](linked-sign-in-setup.md#production).

## When something's wrong

- **`ssh: Could not resolve hostname travelbliss`:** the VM isn't on the tailnet yet (first boot takes several
  minutes), or Tailscale is off. From WSL, names resolve through Windows' Tailscale, and
  `"/mnt/c/Program Files/Tailscale/tailscale.exe" status` lists the machines.
- **`ERROR: got travelbliss-1…` in the first-boot log:** an old `travelbliss` machine is still in the tailnet.
  Delete it in Tailscale, then `terraform apply -replace=oci_core_instance.travelbliss`.
- **`WARNING: tailscale funnel did not finish`:** `ssh ubuntu@travelbliss sudo tailscale funnel --bg 8080`, then
  approve the link it prints.
- **The site is down** (an `outage` issue opened):
  1. Oracle console → Compute → Instances → `travelbliss`. If it's **Stopped** (Oracle reclaims idle Always Free
     VMs), press **Start**.
  2. Otherwise `ssh ubuntu@travelbliss`, then `cd /opt/travelbliss && sudo docker ps -a`.
  3. If the VM is gone: `terraform apply`. First boot restores the newest backup before migrating, and **stops**
     rather than start empty if it can't list the backups.
- **Deploy by hand, or redeploy:** Actions → Deploy → Run workflow redeploys the tip of `main`, even when it's
  already live. On the VM, `/opt/travelbliss/deploy.sh <sha>` does the same as CI.
- **Restore a backup:** `ssh root@travelbliss /opt/travelbliss/backup.sh restore [file]`. It restores the newest, or
  the one named. It stops `api` and `web`, and prints how to start them again.
- **A Dependabot security PR fails every job at `pnpm install --frozen-lockfile`:** a security update for an alert
  on `apps/*/package.json` changes only that file, not the lockfile. On the PR branch: merge `main` in (no
  force-push), run `pnpm install`, then commit `pnpm-lock.yaml` **by name**. An old branch may lack today's
  `.gitignore`, so `git add -A` could pick up Terraform state.

## Changing a secret or setting later

The VM reads Terraform's values **on first boot only**: Terraform ignores changes to the running VM, so it's never
replaced by surprise. To change a value later (Google's client, a cookie name):

1. `ssh ubuntu@travelbliss`, then `sudo nano /opt/travelbliss/.env.production`.
2. `cd /opt/travelbliss && sudo TAG=$(cat .deployed-tag) docker compose --env-file .env.production up -d api`.

Only a rebuild (`terraform apply -replace=oci_core_instance.travelbliss`) writes that file from Terraform again.
