# 6. Deploy to one Oracle Always Free VM, public through Tailscale Funnel

Date: 2026-11-24. Status: accepted.

## Context

TravelBliss had no deploy target (ADR 0001 left it open). It has to stay free indefinitely, be public so others can
book and sign in with Google, and keep sessions working: the API's session cookie must reach it from the web app.
The owner already runs an unrelated app on an Oracle Always Free VM reached over Tailscale.

## Decision

- **One environment, `production`, deployed on every merge to `main` that passes CI.** No staging until there are
  users whose data must not break. It runs with `NODE_ENV=production` even before real users, because it is public:
  unexpected errors are masked (ADR 0002) and cookies are `Secure`. There is no hosted `development` environment.
- **Its own Oracle Always Free VM**, ARM (1 OCPU / 2 GB of the free 4 / 24) when Oracle has capacity, the free AMD
  micro (1 GB) otherwise. Not shared with the other app. Defined by Terraform in this repo, with state only on the
  owner's machine, so a reclaimed VM is rebuilt with one command. Images are built for the VM's architecture only.
  - Small on purpose: Oracle counts an ARM VM as idle when its memory use, among other things, stays under 20%. The
    stack uses roughly 0.7 GB, which keeps a 2 GB VM above that line; on 12 GB it would look idle and be reclaimed
    sooner.
- **Public through Tailscale Funnel at `https://travelbliss.<tailnet>.ts.net`**, with no inbound port open on the VM.
  - Chosen over a bought domain (not free) and over a free dynamic-DNS name with ports 80/443 open and Caddy
    fetching certificates (more exposed, and a public IP to keep pointed at).
  - The hostname is permanent: Google's redirect URI and `API_PUBLIC_URL` are built from it.
- **Web app and API on one origin.** Caddy on the VM serves the built web app and proxies `/graphql`, `/auth/*`
  and `/health` to the API. A static host on another site would make the session cookie third-party, which Safari and others block.
- **Postgres and Redis run in Docker on the VM.** Postgres is dumped nightly, encrypted, to Google Drive (about 15
  days kept), and restored on a rebuilt VM's first boot. Redis is not backed up: it only holds sessions and
  sign-in flows, so a rebuild signs everyone out once.
- **CI pushes each deploy over Tailscale.** GitHub Actions publishes the images to GHCR, joins the tailnet as an
  ephemeral `tag:ci` node, which the tailnet policy lets reach only `tag:travelbliss` over SSH, and on the VM runs
  `migration:up` with the new image, then switches to it. Unless `GET /health` passes and reports the new commit (#201), it switches back
  to the previous image and the deploy fails. Migrations only move forward. Chosen over the VM polling for new images,
  where a failed deploy never shows in GitHub.
- **Secrets live only on the VM.** Terraform generates the random ones (JWT and refresh secrets, encryption key,
  Postgres and Redis passwords). Provider secrets come from the git-ignored `terraform.tfvars`. GitHub holds only the
  Tailscale credential it deploys with.

## Consequences

- Oracle may stop an Always Free VM that stays nearly idle for about a week. It is accepted rather than upgrading to
  Pay As You Go (which makes billing possible) or faking load: a scheduled GitHub Action checks the site every
  6 hours and opens an issue while it is down.
- Funnel traffic goes through Tailscale's relays, with their bandwidth limits: fine for a demo, not for real load.
- Production cookies are `SameSite=Lax; Secure` (`cookieOptions`, #188): with one origin, none needs to travel
  cross-site. Not `Strict`: the provider's redirect back to `/auth/<provider>/callback` is a cross-site navigation
  that must carry the `state` cookie.
- Google sign-in stays in **Testing** mode (listed test users only) until #126 stops storing unverified emails.
  Publishing it also needs a verified domain, which may not be possible for `*.ts.net`: a real domain would then be a
  cost decision. Facebook stays off until there is a privacy-policy page.
