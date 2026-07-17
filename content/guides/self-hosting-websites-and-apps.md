---
title: "Self-Hosting Many Apps on One Box: A Beginner's Guide to the Two-Plane Architecture"
slug: self-hosting-websites-and-apps
date: 2026-06-25
category: Self-Hosting
description: "Run many websites and apps on one server safely: the two-plane architecture with Cloudflare Tunnel, Traefik, and Tailscale, zero public inbound ports, a private admin mesh."
lead: "Run a dashboard, a wiki, an API, and a metrics stack on one box, with zero public inbound ports and a clean split between what the world reaches and what only you do."
---


If you've ever tried to run your own apps, a dashboard, wiki, side-project API, or metrics stack, on a single machine you control, you've probably hit the wall everyone hits: self-hosting gets messy fast. A port opened here, a hand-written nginx file there, a forgotten admin panel, a leaked origin IP, and suddenly your "one box" is an attack surface you can't reason about.

This guide gives you a clean, defensible architecture instead. By the end, the recommended path gives you **one box, one reverse proxy, zero *public* inbound ports, and a private mesh for everything you administer**, and a mental model that scales from one app to dozens without the security story getting worse. ("Zero *public* inbound ports" is the precise claim: Traefik still listens *inside* the box; nothing is published to the public internet.)

**Who this is for:** a capable beginner comfortable with Docker, a terminal, and editing YAML. You don't need to be a network engineer. You do need to be willing to think in terms of *planes* instead of ports.

---

## 1. Why self-host (and what you're actually signing up for)

The payoff is real: **full control, no per-seat SaaS bills, your data on your own box, and the ability to run many apps on one machine.** You also learn how the internet actually works, DNS, TLS, proxies, VPNs, which pays dividends forever.

The honest cost: **you are now the ops team.** Uptime, TLS renewal, backups, and security are yours. This guide *minimizes* that burden; it doesn't erase it.

The naive approach, and why it fails: you open a firewall port per app, hand-write a vhost per app, and point public DNS straight at your home or VPS IP. This **sprawls** (every app is a config island), **leaks your origin IP** (now you're a direct DDoS and scan target), and **gives an attacker one open port per service** to probe. Three apps, three ports, three things that can be misconfigured into a breach.

![Comparison of naive self-hosting with separate public ports for apps, SSH, Grafana, and databases versus a two-plane setup using Cloudflare, Traefik, and Tailscale.](/assets/guides/self-hosting/naive-vs-two-plane-comparison.webp "Naive self-hosting exposes many doors; the two-plane model exposes one controlled front door and keeps admin access private.")

What we build instead: a single reverse proxy as the only public front door, a tunnel so you open **zero** inbound ports, and a private mesh VPN for every surface only *you* should touch.

---

## 2. The mental model: two planes

Here is the single idea the whole guide rests on. Every service you run answers **one question**:

> Does the public need to reach this?

- **Yes** → it lives on the **PUBLIC INGRESS plane**. (Your apps, your APIs, anything a visitor uses.)
- **No** → it lives on the **PRIVATE ADMIN plane**. (Dashboards, metrics, databases, secrets stores, SSH, everything *you* touch as the operator.)

These two planes have **separate entry points, separate failure domains, and separate trust models.** That separation *is* the security story: a misconfigured public route cannot expose an admin tool that has no public listener at all.

The load-bearing rule, stated up front:

> **Admin/internal services bind only to loopback (`127.0.0.1`) or the mesh interface, never `0.0.0.0`.** You defend by *not exposing*, not by hardening an exposed port.

`0.0.0.0` means "every interface, including the public one." If a database only listens on the mesh, there is literally no public port for anyone to scan or brute-force.

One thing to get right from the start: **the "mesh interface" is your Tailscale interface, whose IP comes from Tailscale's CGNAT range `100.64.0.0/10`** (addresses `100.64.x`, `100.127.x`), *not* a private-LAN range like `10.0.0.0/8` or `192.168.0.0/16`. Those LAN ranges are a different network entirely (often routable on your physical network), so allowlisting them is a security hole, not the mesh. Everywhere this guide says "mesh range," it means `100.64.0.0/10`.

Here's the whole architecture in one diagram:

![Two-plane self-hosting architecture showing public visitors routed through Cloudflare edge, Cloudflare Tunnel, Traefik, and app containers, while operators reach SSH, dashboards, and databases through a private Tailscale mesh.](/assets/guides/self-hosting/two-plane-architecture.webp "Public users enter through Cloudflare and Traefik; operators enter through the private Tailscale mesh.")

Visitors take the five-layer public path. You take the mesh. **The two planes meet only through explicitly declared routes, a public route for a public app, or a mesh-only route for an admin tool. No service gets both by accident.**

**Known-good default stack**, keep every example matching this and you avoid the configuration drift that breaks beginner setups:

```text
Recommended default for this guide
──────────────────────────────────
• cloudflared      → Docker container (same network as Traefik)
• Traefik          → Docker container, the only front door
• Public apps      → Docker containers behind Traefik
• Admin apps       → loopback or Tailscale only, never published
• Public DNS       → Cloudflare proxied hostname → Tunnel
• Public ports     → NONE published to the host's public interface
```

---

## 3. Prerequisites and one-time setup

You'll need:

- **A Linux box** (VPS or home server) with **Docker** and **Docker Compose** installed.
- **A domain you control**, with DNS managed by a free **Cloudflare** account.
- **Cloudflare Zero Trust enabled** (the free tier covers Tunnels and Access).
- **A Tailscale account** with the client installed on both the box and your laptop. One login enrolls a node.
- **A secrets habit from day one.** Decide where secrets live, an env file kept out of git, or a secrets manager, *before* you wire anything. Never commit a key.

**Sanity check before going further:** confirm `docker run hello-world` works, the box has outbound internet, and you can `ssh` to it over Tailscale. If those three pass, you're ready.

---

## 4. Cloudflare Tunnel: reaching the box with zero open ports

**The problem it solves.** Port-forwarding is the classic way to expose a home server, but it requires an open inbound port (a permanent attack surface), publishes your origin IP, and simply doesn't work behind CGNAT or a dynamic IP.

**How it fits.** A small daemon, `cloudflared`, runs on your box and **dials *out*** to Cloudflare, holding the connection open. Inbound requests ride back down that existing connection. You open **nothing** inbound. Your origin IP is never in public DNS. Its only requirement is outbound egress to Cloudflare, which is why it's the recommended default for beginners.

**Bootstrap the tunnel (locally-managed path).** Before any config file means anything, you have to create the tunnel and its credentials. This sequence assumes a **locally-managed** tunnel, created from the CLI, configured by your on-box `config.yml`:

```bash
# 1. Authenticate cloudflared to your Cloudflare account (opens a browser).
cloudflared tunnel login

# 2. Create the tunnel. This PRINTS the <tunnel-id> and WRITES the
#    credentials file (~/.cloudflared/<tunnel-id>.json) that config.yml points at.
cloudflared tunnel create my-box

# 3. Create the proxied CNAME for your hostname (see the DNS note below).
cloudflared tunnel route dns my-box app.example.com

# 4A. DEFAULT for this guide, run cloudflared as a Docker container on the
#     SAME network as Traefik (so the name "traefik" resolves). See the
#     cloudflared compose service below (mounts config.yml + <tunnel-id>.json).
cloudflared tunnel run my-box          # optional quick foreground test
# 4B. Host alternative, install as a systemd service. Use this ONLY if your
#     ingress routes to http://127.0.0.1:<port>, never to a Docker name.
sudo cloudflared service install
```

For the default stack, run `cloudflared` as a container on the same `proxy` network as Traefik:

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --config /etc/cloudflared/config.yml run
    volumes:
      - ./cloudflared/config.yml:/etc/cloudflared/config.yml:ro
      - ./cloudflared/<tunnel-id>.json:/etc/cloudflared/<tunnel-id>.json:ro
    networks: [proxy]
    restart: unless-stopped

networks:
  proxy:
    external: true
```

Step 2 is what produces the `<tunnel-id>` and the credentials JSON referenced below, without it, the `config.yml` points at a file that doesn't exist. The daemon must actually be running, however you run it; this guide assumes the **container** path.

A generic tunnel ingress config (`config.yml`):

```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/<tunnel-id>.json   # the file `tunnel create` wrote

ingress:
  # DEFAULT, cloudflared and Traefik are containers on the same Docker network,
  # so the name "traefik" resolves. Cloudflare terminates the browser-facing TLS
  # at its edge, so the tunnel's hop to Traefik's plain :80 entrypoint is fine.
  - hostname: app.example.com
    service: http://traefik:80
  # Catch-all MUST be last (required whenever you define ingress rules).
  - service: http_status:404
```

> **The addressing fork, get this right or nothing routes.** The service URL depends entirely on *where `cloudflared` runs*:
> - **`cloudflared` as a Docker container** (this guide's default): use `service: http://traefik:80`. The name `traefik` resolves *only* because both containers share the Docker network.
> - **`cloudflared` as a host systemd service** (`cloudflared service install`): a host process **cannot** resolve Docker service names. Use `service: http://127.0.0.1:<port>`, and have Traefik publish a host port bound to loopback only, e.g. `ports: ["127.0.0.1:8080:80"]`. Loopback isn't public, so the *zero public inbound ports* story holds.
>
> **Do not mix the two.** A host-installed `cloudflared` pointing at `http://traefik:80` is the single most common way this setup fails, that name resolves only *inside* Docker. On the host, route to loopback or a real host IP, never a Docker service name.

![Cloudflared deployment fork showing Docker mode routing tunnel ingress to http://traefik:80 on a shared Docker network, and host systemd mode routing to http://127.0.0.1 on a loopback-bound Traefik port.](/assets/guides/self-hosting/cloudflared-deployment-modes.webp "Where cloudflared runs determines whether the tunnel targets Docker DNS or loopback.")

*Two things people conflate here:*
> - **(a) Encrypting the `cloudflared → Traefik` hop.** Point the ingress at `https://traefik:443` and define a `websecure` (:443) entrypoint (§5). If Traefik serves an internal/self-signed cert, `originRequest.noTLSVerify: true` makes that work, but it *disables* origin-cert verification, so this is **not** "validated" origin TLS.
> - **(b) Cloudflare-validated origin TLS.** Use the **published-:443-origin variant**: publish only 443, present a Cloudflare **Origin Certificate** (or a publicly-trusted cert), and set Cloudflare SSL/TLS mode to **Full (strict)**, the only mode that actually validates the origin cert.
>
> Through a tunnel the browser always validates **Cloudflare's edge cert**, never Traefik's, so "browser-validated origin TLS" only exists on the published-origin path. The default tunnel + edge-TLS path needs none of this.

**DNS wiring, and who creates the record.** For a CLI-created (locally-managed) tunnel, `cloudflared tunnel route dns` (step 3 above) **creates the proxied CNAME for you**, already orange-cloud, mapping `app.example.com` to `<tunnel-id>.cfargotunnel.com`. Don't *also* hand-create it, a second record risks a duplicate or a wrong-`tunnel-id` conflict. Hand-create the proxied CNAME yourself **only** for dashboard/remotely-managed tunnels or when you're routing manually. Note that `cfargotunnel.com` records are **proxied-only by design**, Cloudflare won't let you grey-cloud them, so the orange-cloud "master switch" is a real operator choice on the *published-:443-origin* path, not on the tunnel path.

**The #1 gotcha, locally-managed vs remotely-managed tunnels.** Cloudflare now nudges most people toward **remotely-managed** tunnels (configured in the dashboard); this guide uses the **locally-managed** (CLI + `config.yml`) path because config-as-code is easier to version, review, and reason about. The catch: if you created the tunnel in the Cloudflare dashboard (or via the API), the **remote config is authoritative** and your local `config.yml` is *ignored*. Edit ingress in the dashboard/API in that case. And when you update a remotely-managed tunnel via API, you must re-send the **entire** ingress list, it's a replace, not a merge. Everything else in this section assumes the locally-managed (CLI) path above.

**Optional identity gate.** Put Cloudflare Access in front of a hostname for SSO/OTP login *at the edge*, with zero app code. Carve a path-scoped policy with action **Bypass** (e.g. `/healthz`) so uptime probes stay green without logging in.

**Verify correctly:**
- A redirect to the Access login page is the healthy gated state, not a failure: **browser flows get a 302; API/service-token flows get a 401 or 403.** Any of those means "gated," not "broken."
- To prove your origin actually routes, `curl` the *bypassed* path through real public DNS and expect a real **200**, but this only holds if that path is covered by a policy whose action is **Bypass** (evaluated first, no identity, no logging). An **Allow** policy still challenges for identity, so it will 302 even on the "bypassed" path.
- An **empty-body 404 with `server: cloudflare`** means the hostname has no ingress rule and never reached your origin.

---

## 5. Traefik: route every public app through one internal front door

**The problem it solves.** You have one IP and one pair of ports (:80/:443) but want to serve dozens of apps on different subdomains, without exposing a port per app or restarting anything to add a route.

**How it fits.** One Traefik container listens on internal entrypoints and routes each request to the right backend container **by Host (and optional path)**. In the **default tunnel path**, browser-facing TLS terminates at Cloudflare's edge and Traefik routes plain HTTP inside the Docker network; in the **published-origin or mesh-TLS variants**, Traefik also serves HTTPS on `websecure`. Routes hot-reload.

**The #1 mental model: static vs dynamic config.**

- **Static** (entrypoints, ports, providers, cert resolvers) is set at startup and needs a **restart** to change.
- **Dynamic** (routers, services, middlewares, certs) is **hot-reloaded**, no restart.

Put each setting in the right layer and you'll never fight the proxy.

![Traefik static versus dynamic configuration: static config defines entrypoints, providers, cert resolvers, and logging, while dynamic config defines routers, services, middlewares, and TLS certificates that hot reload.](/assets/guides/self-hosting/traefik-static-vs-dynamic-config.webp "Static config boots Traefik; dynamic config routes traffic.")

**Static config (`traefik.yml`), entrypoints, providers, cert resolvers.** Install-time concerns: set once, restart to change. The default tunnel path dials the `web` (:80) entrypoint; the `websecure` (:443) entrypoint is here only for the published-origin TLS variant. Whichever entrypoint a route uses must exist, or `cloudflared` gets connection-refused:

```yaml
entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

providers:
  docker:
    endpoint: "tcp://dockerproxy:2375"   # the read-only socket proxy (see safety rules)
    exposedByDefault: false              # nothing is exposed unless it opts in
    network: proxy
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true

# NOTE: TLS certificates/stores are DYNAMIC config, not static, they live in
# the `tls:` block of dynamic.yml below. Static config is only entrypoints,
# providers, cert resolvers, logging, and the dashboard toggle. (The default
# tunnel path needs no origin cert at all: Cloudflare terminates TLS at its edge
# and the tunnel dials plain :80. The cert only matters for the :443 variant.)
```

A generic `docker-compose.yml` for an app declaring its own route via **labels**:

```yaml
services:
  my-app:
    image: my-app:latest
    networks: [proxy]            # shared proxy network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.my-app.rule=Host(`app.example.com`)"
      - "traefik.http.routers.my-app.entrypoints=web"   # default tunnel path (edge TLS); use websecure + tls=true only for the published-origin variant
      - "traefik.http.services.my-app.loadbalancer.server.port=8080"

networks:
  proxy:
    external: true
```

Note `traefik.enable=true` is explicit, because the static config sets `exposedByDefault=false`, **nothing** is exposed unless it opts in. Admin containers carry `traefik.enable=false`.

The same routes, expressed in a watched **dynamic file** (`dynamic.yml`), useful for backends Traefik doesn't manage (raw `IP:port`, cross-host services):

```yaml
http:
  routers:
    my-app:
      rule: "Host(`app.example.com`)"
      entrypoints: ["websecure"]
      service: my-app-svc
      priority: 1                  # catch-all: lowest priority
      tls: {}                      # NOT a no-op: "serve over TLS with the default cert"
    my-app-api:
      rule: "Host(`app.example.com`) && PathPrefix(`/api`)"
      entrypoints: ["websecure"]
      service: my-api-svc
      middlewares: ["strip-api"]
      priority: 10                 # higher than the catch-all above
      tls: {}

  services:
    my-app-svc:
      loadBalancer:
        servers:
          - url: "http://my-app:8080"
    my-api-svc:
      loadBalancer:
        servers:
          - url: "http://my-api:9000"

  middlewares:
    strip-api:
      stripPrefix:
        prefixes: ["/api"]         # backend sees a clean path, a frequent 404 fix
    mesh-only:
      ipAllowList:
        sourceRange:
          - "127.0.0.1/32"
          - "100.64.0.0/10"        # Tailscale CGNAT mesh range, NOT 10.x/192.168.x

tls:                               # top-level key, TLS certs are DYNAMIC config
  stores:
    default:
      defaultCertificate:          # served on :443 by default, published-origin variant only
        certFile: /run/secrets/origin.crt   # e.g. a Cloudflare Origin Certificate
        keyFile: /run/secrets/origin.key
```

**A few things that bite beginners:**

- **Empty `tls: {}` is not a no-op**, it means "serve this over TLS with the default cert." Omit it and the router answers plain HTTP. And note *which* cert "default" is: if you haven't configured a `defaultCertificate` or an ACME resolver, it's a generated **self-signed** cert, fine behind Cloudflare with `noTLSVerify`, but a browser hitting the origin directly will warn.
- **Priority matters** the moment a host has both a catch-all and a specific path. Give the catch-all `priority: 1` and the specific path route a higher number, or the catch-all swallows `/api`.
- **`stripPrefix`** drops `/api` before proxying, so the backend sees a clean path. Forgetting it is a classic source of 404s.
- **`ipAllowList`** restricts an admin route to loopback + the **Tailscale mesh range `100.64.0.0/10`**, but only when the request *actually arrives over the mesh* (see the caveat below). Do **not** put `10.0.0.0/8` or `192.168.0.0/16` here: those are private-LAN ranges, not your tailnet, and allowlisting them opens the route to your whole LAN instead of locking it to the mesh.

> **Critical caveat, `ipAllowList` matches the IP Traefik actually sees.** Behind a Cloudflare Tunnel, the request reaches Traefik from the `cloudflared` connector (or the Docker bridge), **not** your laptop's `100.64.0.0/10` tailnet IP. So `ipAllowList: 100.64.0.0/10` does **nothing** on a public, Cloudflare-fronted hostname. It only gates a route reached **directly over Tailscale** (a tailnet hostname / `tsnet` entrypoint, §6). Never put a mesh allowlist on a public route and assume it keeps admins-only.

The corollary: **the right control depends on how the route is reached.**

| Route type | The control that actually works |
| --- | --- |
| Public hostname via Cloudflare | Cloudflare Access (SSO), app auth, service tokens, WAF rules |
| Mesh-only hostname / listener | Tailscale ACLs + bind policy + (optionally) Traefik `ipAllowList` |
| Local-only admin tool | Bind `127.0.0.1`; reach via SSH or `tailscale serve` |

**TLS, by deployment mode** (not all at once, the default needs none of the below):

- **Default tunnel path:** Cloudflare terminates TLS at its edge; Traefik can stay plain HTTP internally.
- **Published-origin path:** a Cloudflare **Origin Certificate** (or public-CA cert) + SSL/TLS mode **Full (strict)**.
- **Private mesh HTTPS:** `tailscale serve` or Tailscale certs.
- **ACME / Let's Encrypt:** advanced, prefer **DNS-01** when the origin shouldn't expose public port 80 (HTTP-01 validates on :80).

**Two hard safety rules:**

1. **Never mount the raw Docker socket read-write.** Front it with a read-only socket proxy and point Traefik's Docker provider at it, `endpoint: tcp://dockerproxy:2375` on the shared `proxy` network, **not** `/var/run/docker.sock`. Expose only the endpoints the provider needs: label/event discovery requires `CONTAINERS=1` and `EVENTS=1`, plus `NETWORKS`, `INFO`, and `VERSION`; add `TASKS`/`SERVICES` only if you run Swarm. Read access to the socket is still privilege, minimize it. The proxy itself is one small service:

   ```yaml
   dockerproxy:
     image: tecnativa/docker-socket-proxy
     environment: { CONTAINERS: 1, EVENTS: 1, NETWORKS: 1, INFO: 1, VERSION: 1 }
     volumes:
       - /var/run/docker.sock:/var/run/docker.sock:ro   # read-only
     networks: [proxy]
     restart: unless-stopped
   ```
2. **Inject secrets at runtime.** A clean pattern: override the container entrypoint with a tiny script that materializes cert/key files from env vars (`umask 077`, atomic `mktemp`+`mv`, `chmod 600` the key), then `exec`s the real binary. Keys live only in the running container, never in git or the image.

**Maintenance hazard:** file-provider routes can outlive their backend (a "dead route"). Periodically reconcile your routers against live backends, orphans are silent until someone hits the path.

---

## 6. Tailscale: reach admin tools without public listeners

**The problem it solves.** You need to reach SSH, dashboards, metrics, and databases, but exposing any of them publicly is exactly what you're trying to avoid.

**How it fits.** Tailscale is a WireGuard mesh VPN (a "tailnet"). Every machine joins the mesh and gets a **stable private IP, from the CGNAT range `100.64.0.0/10`, reachable only by other devices on the mesh**, never from the public internet. SSH rides the mesh too: no public port 22, no bastion, no jump box.

**Bind-address cheat-sheet, *where* a service listens decides *who* can reach it.** This is the most concrete version of the two-plane rule:

![Bind-address exposure matrix showing 127.0.0.1 as local-only, 100.64.x.x as Tailscale mesh-only, 0.0.0.0 as every interface, 10.x and 192.168.x as LAN ranges, and public IPs as internet-facing.](/assets/guides/self-hosting/bind-address-exposure-matrix.webp "The bind address is the boundary: loopback, mesh, LAN, or public internet.")

| Bind address | Who can reach it | Use for |
| --- | --- | --- |
| `127.0.0.1` | Same machine only | Local-only admin; front with `tailscale serve` or SSH |
| `100.64.x.x` (tailnet IP) | Tailscale peers only | Mesh admin: dashboards, metrics, databases |
| `0.0.0.0` | **Every** interface, including public | Avoid for admin, the classic accidental exposure |
| `10.x` / `192.168.x` | LAN clients | **Not** the mesh, a different network entirely |
| Public IP | The whole internet | Only when deliberately publishing (prefer the tunnel) |

Bring the box onto the mesh:

```bash
# Enroll the node (one login)
tailscale up
```

**Two different ways to reach a service over the mesh, pick one per service, don't stack them:**

- **`tailscale serve` (HTTPS front via your tailnet DNS name).** This proxies a local port through `tailscaled` and presents a real **mesh TLS cert** on the node's MagicDNS name:

  ```bash
  tailscale serve --bg 8080
  ```

  Caveat: `tailscale serve` requires **HTTPS certificates enabled in the tailnet** (MagicDNS + HTTPS certs). On first use it opens an **interactive web-UI consent flow** to enable HTTPS, so it is *not* headless-friendly unless that's already been enabled by a tailnet admin. This is the only one of the two patterns that gives you a TLS cert.

- **Direct mesh-IP port binding (raw port, no TLS).** Bind the container's port to the node's Tailscale IP so it's reachable on the mesh but nowhere else. This exposes the raw port directly, there is no mesh cert here.

**The binding pattern, and its sharp edge.** In Docker Compose you can bind an internal service to the mesh IP, **never** `0.0.0.0`:

```yaml
services:
  metrics:
    image: my-metrics:latest
    ports:
      # mesh IP, must already exist on an interface at container start
      - "${MESH_IP:-127.0.0.1}:9090:9090"
```

> **Important, this is not a graceful fallback.** A Docker `ports:` binding to a specific host IP requires that IP to *exist on an interface when the container starts*. The `:-127.0.0.1` default only fires when `MESH_IP` is **unset or empty**, not when it's set to a stale or currently-absent Tailscale IP. If `MESH_IP` is hardcoded in an env file and `tailscaled` is down or the address has changed, Docker fails the container with `cannot assign requested address` rather than quietly serving on loopback. Two robust options: **(a)** bind to loopback only and front the service with `tailscale serve`, which survives IP churn via the tailnet name; or **(b)** if you must bind the mesh IP, ensure it exists before container start and accept that a stale/missing IP is a hard failure. Prefer referencing the node by its **MagicDNS name** over pinning a raw IP in env, consistent with the stable-names rule below.

**Make the rule a test, not a tribal convention.** Parse `ss -ltnp` and fail CI if any policy-restricted port isn't bound inside `{loopback, Tailscale mesh range}`. Use a real CIDR membership check, a substring grep is too blunt and easy to invert:

```bash
# Fail if an admin port is NOT bound to loopback or the Tailscale mesh.
# Allow-list by CIDR membership, never a substring deny-list:
#   loopback        127.0.0.0/8
#   Tailscale mesh  100.64.0.0/10   (100.64.0.0-100.127.255.255)
# NOTE: 10.x / 192.168.x are private-LAN ranges, NOT the mesh, do not allow them.
in_cidr() {  # in_cidr <ip> <network> <prefix>
  python3 - "$@" <<'PY'
import ipaddress,sys
ip,net,pfx=sys.argv[1],sys.argv[2],int(sys.argv[3])
sys.exit(0 if ipaddress.ip_address(ip) in ipaddress.ip_network(f"{net}/{pfx}") else 1)
PY
}

bind_ip=$(ss -ltnp | awk '/:9090 /{print $4}' | sed 's/:[0-9]*$//' | head -n1)
if [ -z "$bind_ip" ]; then
  echo "OK: metrics port not listening"; exit 0
fi
if in_cidr "$bind_ip" 127.0.0.0 8 || in_cidr "$bind_ip" 100.64.0.0 10; then
  echo "OK: metrics is mesh/loopback only ($bind_ip)"
else
  echo "FAIL: metrics port publicly/LAN bound ($bind_ip)"; exit 1
fi
```

**Two complementary controls**, use both for sensitive services:
- **Tailnet ACLs** decide *which peers* may reach which ports.
- **Bind-policy** decides *which interface* a service listens on.

**Stable names:** use the mesh DNS (MagicDNS) names in config and scripts so they survive IP churn. For cross-host automation, prefer the **fully-qualified** name, bare short names don't always resolve.

**When *not* to use the mesh:** a flow that needs a **public callback** (OAuth, webhooks) can't run on a raw-IP HTTP mesh endpoint, providers reject `http://` and raw IPs. Those surfaces belong on the public plane with a real domain and TLS. The mesh is for **humans-as-admins and server-to-server**.

**The verification reflex:** a `200` on `localhost` tells you *nothing* about public exposure. Check the actual bind address (`ss -ltnp`), not just that the service responds.

---

## 7. Putting it together: deploy a sample app end to end

Let's ship a real, copy-paste-runnable container, `traefik/whoami`, which just echoes the request it received, so you can *see* the chain working, at `app.example.com`.

**1. Run it on the shared proxy network.** The proxy reaches it by *service name*, not localhost (from inside the proxy, `localhost` is the *proxy* itself):

```bash
docker network create proxy      # once, if it doesn't exist
docker run -d --name whoami --network proxy --label traefik.enable=false traefik/whoami
```

**2. Give it a Traefik router.** Drop `traefik.enable=false` and add the router labels, here as a compose file you can keep. Note `entrypoints=web` (:80): the tunnel terminates browser TLS at Cloudflare's edge, so the app is plain HTTP *inside* the box.

```yaml
# whoami.compose.yml
services:
  whoami:
    image: traefik/whoami
    networks: [proxy]
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.whoami.rule=Host(`app.example.com`)"
      - "traefik.http.routers.whoami.entrypoints=web"
      - "traefik.http.services.whoami.loadbalancer.server.port=80"
networks:
  proxy:
    external: true
```

```bash
docker rm -f whoami                          # remove the enable=false test container
docker compose -f whoami.compose.yml up -d   # bring it up with its router labels
```

**3. Expose it publicly.** If you're using a tunnel, the proxied CNAME was created by `cloudflared tunnel route dns` in §4 (don't hand-make a second one); add the matching ingress rule to `config.yml`. For the published-:443-origin path instead, create the proxied DNS record yourself and set SSL mode to Full (strict). No new public port, ever.

**4. Add a second route to show fan-out.** A `/api` `PathPrefix` router at `priority: 10` to a backend, with the UI catch-all at `priority: 1`.

**5. Verify the FULL chain**, not just localhost:

```bash
# Real DNS, no --resolve pin: this exercises Cloudflare → tunnel → proxy → app
curl -I https://app.example.com   # expect 200
curl -I http://app.example.com    # 301/308 IF you enabled HTTP→HTTPS redirect
                                  # (Cloudflare or Traefik); otherwise 200
```

**Recommended:** turn on **HTTP → HTTPS redirect** for public hostnames, Cloudflare's *Always Use HTTPS*, or an explicit Traefik redirect on the published-origin path. Until you do, a `200` on plain `http://` is expected, not a failure.

**Note what the cert actually is:** via the tunnel the browser sees **Cloudflare's edge cert**, so a green padlock here does *not* prove your origin cert is real, it could be Traefik's self-signed default and you'd never know. To validate the *origin* cert end to end you need the Full (strict) published-origin path, which actually checks it.

**6. Now add an admin surface and keep it OFF the public plane.** Bind the metrics dashboard to the mesh IP (or front it with `tailscale serve`), set `traefik.enable=false` (or give it a mesh-only `ipAllowList` router scoped to `100.64.0.0/10`), and reach it **only over Tailscale.** The allowlist works *here*, and not on a public route, precisely because the request arrives directly over the mesh, so Traefik sees your tailnet IP (§5 caveat).

**Deploy hygiene:** recreating containers is what picks up changes. Flipping a release symlink alone does **not** restart them, `docker compose up -d --force-recreate`, and verify by `Created` time / image / mount, **not** just "healthy." Inject secrets at runtime so they never land on disk.

---

## 8. Authentication: which lock for which door?

"Self-hosted" doesn't mean "open." But the mistake beginners make isn't *forgetting* auth, it's reaching for **one** kind of auth and bolting it onto everything. A password prompt in front of an API that a script calls is useless friction; an OAuth login in front of a tool only *you* touch over the mesh is wasted effort. The skill is matching the lock to the door.

Two questions decide it every time:

1. **Who's knocking**, a human in a browser, a machine/script, or just you-the-operator?
2. **What's behind the door**, a public app, an internal dashboard, or a programmatic API?

You'll usually run **several of these at once**, that's correct, not over-engineering. The goal isn't to pick one lock; it's to put each one on the right door.

![Authentication comparison for self-hosted apps showing Tailscale ACLs and bind policy for operator-only tools, Cloudflare Access for human browser login, Basic Auth for small public tools, service tokens for machine callers, and app-layer login for user accounts.](/assets/guides/self-hosting/authentication-lock-comparison.webp "Match the lock to the caller: human, machine, operator, or app user.")

**1. The cheapest lock is the network itself.** For anything only *you* administer, the mesh is the first gate: keep it off the public plane and scope a Traefik `ipAllowList` to `100.64.0.0/10` (§6). A service with no public listener can't be brute-forced, there's no door to pick. For a **low-risk personal** dashboard, Tailscale ACLs + bind-policy are often enough on their own. But network reach is *access*, not *authorization*: for anything **destructive, sensitive, or multi-user**, keep the app's own auth enabled too, and still change its default credentials. The goal isn't one lock; it's matching the lock to the blast radius.

**2. Basic Auth, the one-line password wall.** When a small, low-stakes tool *is* public and you just want a gate, Traefik's `basicAuth` middleware is the least-effort option. Generate a bcrypt credential and attach the middleware:

```bash
# htpasswd ships with apache2-utils; -B = bcrypt, -n = print (don't write a file)
htpasswd -nbB admin 'choose-a-strong-unique-password'
# → admin:$2y$05$REPLACE_WITH_YOUR_OWN_BCRYPT_HASH
```

```yaml
# As a Docker label. NOTE: in docker-compose, every literal $ in the hash
# must be DOUBLED to $$ or Compose will try to interpolate it as a variable.
labels:
  - "traefik.http.routers.my-tool.middlewares=tool-auth"
  - "traefik.http.middlewares.tool-auth.basicauth.users=admin:$$2y$$05$$REPLACE_WITH_YOUR_OWN_BCRYPT_HASH"
```

```yaml
# Or in the dynamic file (single $ here, no doubling outside compose):
http:
  middlewares:
    tool-auth:
      basicAuth:
        users:
          - "admin:$2y$05$REPLACE_WITH_YOUR_OWN_BCRYPT_HASH"
```

Know its limits before you trust it: Basic Auth sends a base64 credential on **every** request, so it is **only safe when every hop carrying it is protected**. On this guide's default tunnel path, the browser-facing hop is HTTPS (Cloudflare's edge) and the final `cloudflared → Traefik` hop is plain HTTP but stays private inside the box's Docker network, never the public wire; if you instead publish the origin directly, require HTTPS end to end (the `websecure` / Full-strict variant). It has no logout, no sessions, and usually one shared credential, so **rotate it** and don't put it alone in front of anything sensitive. It's a tidy gate for a staging tool or a webhook receiver, not an identity system.

**3. Identity at the edge, SSO without writing login code.** When real humans should authenticate with an identity (Google, email OTP, a company SSO), put an **identity proxy in front of the route** so an unauthenticated request never reaches your app. Two flavors:

- **Cloudflare Access** (Zero Trust, free tier): define an application for `app.example.com`, attach an allow policy (e.g. "these emails, email-OTP, 24h session"), and Cloudflare challenges the request at its edge before the tunnel. Browser flows get a `302` to `<team>.cloudflareaccess.com`; API/service-token flows get `401`/`403`. All of those mean *gated*, not broken.
- **Self-hosted forward-auth** (Authelia, Authentik, or oauth2-proxy) when you'd rather not depend on Cloudflare for identity. Traefik calls your auth service on every request via a `forwardAuth` middleware:

  ```yaml
  http:
    middlewares:
      sso:
        forwardAuth:
          address: "http://auth:9091/api/verify?rd=https://auth.example.com/"
          trustForwardHeader: true
          authResponseHeaders: ["Remote-User", "Remote-Groups"]
  ```

  Point any route at `middlewares: ["sso"]`; the auth service owns the login UI and returns `2xx` (allow) or `401` (challenge). Your app stays login-free.

**4. Tokens for machines.** Browsers can do SSO; scripts, CI jobs, and webhook senders can't. Give them **bearer or service tokens**, **deny by default**, one token per caller, scoped and rotatable. Cloudflare Access issues **service tokens** for exactly this, a machine path behind the same edge gate, authenticated by a token header instead of a login. At the app layer, a tiny middleware that rejects any request without a valid `Authorization: Bearer …` is the same idea self-hosted. Whichever you use: never log the token, and rotate on a schedule.

**5. App-layer login, for real accounts.** If the app has its own users, roles, and sessions, that logic belongs **in the app** (sessions, JWT, or OIDC). Keep it even when an edge gate already fronts the route: the two are **defense in depth**, and an edge policy is one misconfiguration away from `bypass`. A fail-closed app-level floor means a slipped edge rule degrades to "logged warning," not "open door."

**The rules that keep auth sane:**

- **Stack gates on sensitive surfaces:** edge identity → proxy `ipAllowList` → app auth. One wall is a single point of failure; layers survive a mistake in any one of them.
- **Deny by default.** Never "secure by obscurity", an unguessable URL is not auth.
- **Credentials only over HTTPS.** Basic Auth, bearer tokens, cookies, all of it.
- **Don't over- or under-engineer.** No OAuth on a tool only you reach over the mesh; no bare Basic Auth in front of real user data.
- **Bypass *narrowly*, and know what it costs.** Bypass turns **off** Cloudflare Access enforcement **and** request logging for matching traffic. **Health checks** are usually fine to Bypass. **Metrics should stay private** (they leak internals), keep them on the mesh, don't Bypass them onto the public plane. **Webhooks/automation** that still need auth + an audit trail belong on a **service token (Service Auth)** or an app-layer signature check, never a blanket Bypass.

---

## 9. Security checklist

> **Before you check a single box, re-ask the one question:** *Does the public need to reach this?* If the answer is no, it should have no public listener at all.

The single most important lesson: **never expose admin dashboards publicly, keep them on the Tailscale plane.** Everything else is defense in depth.

- [ ] **Every public DNS record that fronts an app is PROXIED (orange-cloud).** No grey-cloud records leaking your origin IP. (Tunnel `cfargotunnel.com` CNAMEs are proxied-only by design; the orange-cloud choice is yours to get wrong only on the published-origin path.)
- [ ] **If using origin certs with a published port: SSL mode is Full (strict)**, the only mode that *validates* the origin cert. Not Flexible, not plain Full.
- [ ] **Inbound firewall is closed except what you truly need.** A tunnel needs **zero** inbound; a published origin needs only `443`, ideally locked to Cloudflare's IP ranges.
- [ ] **Every admin/internal service binds to loopback or the Tailscale mesh IP (`100.64.0.0/10`)**, verified with `ss -ltnp`, not assumed. A CI bind-policy test enforces it with a real CIDR check, and `10.x`/`192.168.x` LAN ranges are *not* treated as the mesh.
- [ ] **`exposedByDefault=false`** on the proxy; only explicitly-labelled containers get a public router. Admin containers carry `traefik.enable=false`.
- [ ] **The Docker socket is read-only via a socket proxy**, never mounted read-write into the proxy; the Traefik provider points at `tcp://dockerproxy:2375`, not the raw socket.
- [ ] **Secrets are never in git or the image**, injected at runtime; cert/key files written `0600` by an entrypoint script at container start.
- [ ] **Change default credentials on every dashboard** before it's reachable by *anyone*, including over the mesh.
- [ ] **Public sensitive routes stack *public-plane* gates:** Cloudflare Access / Service Auth → app-layer auth or token validation. **Do not** rely on a Tailscale `ipAllowList` on a Cloudflare-fronted public hostname (Traefik sees the tunnel connector, not your tailnet IP).
- [ ] **Mesh-only sensitive routes stack *private-plane* gates:** Tailscale ACLs → bind policy → optional Traefik `ipAllowList` → app auth, for destructive/sensitive/multi-user tools.
- [ ] **Treat tunnel ingress as config-as-code and reconcile it.** A periodic diff of live config vs your declared routes catches an unexpectedly-exposed hostname *before* it's an incident.
- [ ] **Reconcile orphaned routes.** A router pointing at a dead backend is a silent maintenance hazard.
- [ ] **Tear down a sensitive route in the right order:** remove the public route (DNS + tunnel rule) and confirm the data plane no longer reaches origin **before** deleting the identity gate. An ungated live route is a breach; a stale gate on a dead route is harmless.

---

## 10. Advanced hardening once the base path works

You now have a defensible foundation. Once the happy path is solid, harden it in four directions:

**Observe**
- Structured JSON access logs from the proxy with a **field allowlist** (drop headers by default), shipped to a log store you reach *only* over the mesh.

**Deploy**
- A **materialize → ship → flip** release pattern with runtime secret injection, so deploys are atomic and rollback-able. Remember: flipping a symlink doesn't restart containers, `docker compose up -d --force-recreate` does.

**Scale**
- A **second box**, route cross-host backends through the proxy's **file provider**: one front door, many machines.
- **More admin surfaces**, layer Cloudflare Access policies as you add them, and keep the **mesh as the floor** for anything that doesn't *need* the public.

**Audit**
- Reconcile **orphaned routers** (routes pointing at dead backends) and **tunnel-ingress drift** (a hostname exposed that you never declared), and enforce the **bind-policy CI check** so the two-plane rule is *tested, not trusted*.

**Troubleshooting, the failure-mode tells worth knowing cold:**

| Symptom | Likely cause | Check |
| --- | --- | --- |
| Redirect to login | **Gated and healthy**, not broken | `302` (browser) or `401`/`403` (API/service-token) all mean "gated" |
| Edge `404`, empty body, `server: cloudflare` | Missing tunnel **ingress rule** | the hostname never reached your origin |
| `502` at the edge | Tunnel reached origin, origin **refused** | Traefik entrypoint + the `service:` URL (the addressing fork, §4) |
| Works on `localhost` only | Not routed through the **public chain** | `curl` real DNS, not loopback |
| Admin app reachable publicly | Wrong bind or a stray `traefik.enable=true` | `ss -ltnp` + the container's labels |
| Green padlock but origin unverified | That's **Cloudflare's edge cert** | validate the *origin* cert via the Full (strict) path |

**Further reading:** Traefik routers/middlewares and static-vs-dynamic config docs, Cloudflare Tunnel + Zero Trust docs (including `cloudflared tunnel create`/`route dns`), Tailscale ACLs, the `100.64.0.0/10` CGNAT addressing model, and `tailscale serve`, plus the Let's Encrypt/ACME challenge-type reference.

The discipline that makes all of this hold together is a single sentence: **classify every service by whether the public needs it, put it on the matching plane, and verify the bind address, not just the health check.** Do that consistently and your self-hosted estate stays sane no matter how many apps you add.

**Reference:** [Cloudflare Tunnel documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).
