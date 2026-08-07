# Security Policy

## Supported versions

Security fixes land on the latest minor release of the `0.x` line. Older
versions do not receive patches — upgrade to the latest release.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

- Email **security@ogeui.com** with a description, affected package/version
  and reproduction steps, or
- use GitHub's private reporting: **Security → Report a vulnerability** on
  the [oge-ui/oge-ui](https://github.com/oge-ui/oge-ui) repository.

This is a small project; you will normally hear back within a few days. We
ask for a reasonable window (up to 90 days) to ship a fix before public
disclosure; credit is given in the release notes unless you prefer
otherwise.

## Scope notes

OGE UI components render user-supplied data as text (no `innerHTML` binding
of row data), and export helpers (`exceljs`, `jspdf`) are optional peers that
only run when you opt in. Reports about vulnerable versions of those peer
libraries should go to their maintainers; reports about how OGE UI _uses_
them are in scope here.
