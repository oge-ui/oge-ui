# Privacy

## The packages

The `@oge-ui/*` and `oge-ui` packages collect **nothing**. They make no
network requests of their own (data loading and uploads go only to the URLs
your application configures), set no cookies, read no storage your
application did not ask them to use (grid/tree-list state persistence writes
to the storage key you configure), and contain no telemetry, licence check or
"phone home" code.

## The documentation site (ogeui.com)

The docs site uses **Vercel Web Analytics** to count page views. It is
cookieless: it does not set cookies or use local storage, and it does not
build a profile of you across sites. What it receives per page view is the
page URL, the referrer, and coarse device data (browser, operating system,
country) derived from the request; visitors are counted with a short-lived,
daily-rotating hash rather than a stored identifier. The data is used only to
see which pages are read, so the docs can be improved.

The site sets no other trackers and no advertising scripts. Your theme and
framework choices are kept in your browser's local storage and never leave it.

Questions: open an issue on [github.com/oge-ui/oge-ui](https://github.com/oge-ui/oge-ui/issues).
