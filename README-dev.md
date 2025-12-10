# Developer Guide (modDNS)

This document captures the practical steps needed to spin up the full stack locally, manage certificates, and configure browsers or operating-system DNS clients during development.

## Prerequisites

- Docker & Docker Compose
- Make
- mkcert (or an equivalent CA generation tool)
- dnsmasq (or another DNS forwarder that supports wildcard overrides)
- Access to `/etc/hosts` and `/etc/resolv.conf` (Linux/macOS) or the Windows hosts file

## Launching the full stack

1. Generate or trust the provided certificates (see the next section).
2. From the repository root, run:

    ```bash
    make up
    ```

    This builds containers, seeds databases, and exposes the web UI via Nginx at `https://ivpndns.com`.
3. Use `make logs` to tail container output, and `make down` to stop everything when you are done hacking.

## Wildcard certificate workflow

### TL;DR

1. Create or reuse a local Certificate Authority (CA).
2. Trust that CA in your OS (e.g., `/usr/local/share/ca-certificates/` on Ubuntu, Keychain Access on macOS).
3. Generate a wildcard certificate and sign it with your CA.
4. Convert the resulting `.crt` + `.key` into `.pem` files and place them in `certs/`.

### Detailed steps (mkcert)

```bash
./mkcert ivpndns.com "*.ivpndns.com" localhost 127.0.0.1 ::1
```

mkcert automatically installs its root CA into the system trust store, so browsers accept `https://ivpndns.com` when the dev proxy serves it locally.

## Local DNS overrides with dnsmasq

`/etc/hosts` cannot express wildcard records, so we rely on dnsmasq:

```bash
sudo systemctl disable systemd-resolved   # disable Ubuntu's stub resolver
sudo systemctl enable dnsmasq.service
sudo systemctl start dnsmasq.service
```

`/etc/dnsmasq.conf` snippet:

```
# Map every *.ivpndns.com host to localhost for HTTPS and DoT/DoQ tests
address=/ivpndns.com/127.0.0.1
cache-size=1000
```

Helpful `/etc/hosts` entries (in addition to dnsmasq):

```
# DNS check entry for local testing
127.0.0.1   123.test.localdnsleaktest.com
127.0.0.1   ivpndns.com
```

> [!TIP]
> `docker network inspect bridge` reveals the "Gateway" IP. Export that value as `API_ALLOW_IP`. Set `API_ALLOW_IP="*"` to bypass IP-based access control while developing.

## Browser / client configuration

1. Point your browser or OS DNS setting to the local DoH endpoint:

    ```
    https://ivpndns.com:443/dns-query/<profile-id>
    ```

2. Import `certs/ivpndns.com+4.pem` (or the certificate generated via mkcert) into the browser's trust store:
    - Chrome/Edge: Settings → Privacy and Security → Security → Manage certificates → Authorities
    - Firefox: Settings → Privacy & Security → Certificates → View Certificates → Authorities

3. If you need DoT/DoQ validation, ensure your DNS client trusts the same certificate.

## Troubleshooting

- **TLS errors**: confirm the CA is trusted and the certificate's SAN includes the host you're testing (`*.ivpndns.com`).
- **Wildcard not resolving**: restart dnsmasq after editing the config (`sudo systemctl reload dnsmasq`).
- **API allow list failures**: verify `API_ALLOW_IP` matches the docker bridge gateway or set it to `*` for local-only usage.

Keep this guide close when onboarding new contributors so the local environment stays reproducible.
