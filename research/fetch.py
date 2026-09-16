#!/usr/bin/env python3
"""Fetch a URL and print readable text (HTML stripped). For research citations."""
import sys, re, html, subprocess, os, json

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

def fetch(url):
    p = subprocess.run(["curl", "-sSL", "--max-time", "45", "-A", UA,
                        "-H", "Accept: text/html,application/json,*/*", url],
                       capture_output=True)
    if p.returncode != 0:
        return None, f"CURL ERROR {p.returncode}: {p.stderr.decode()[:300]}"
    return p.stdout, None

def strip_html(raw):
    txt = raw.decode("utf-8", "replace")
    # keep JSON as-is
    s = re.sub(r"(?is)<script.*?</script>", " ", txt)
    s = re.sub(r"(?is)<style.*?</style>", " ", s)
    s = re.sub(r"(?is)<noscript.*?</noscript>", " ", s)
    s = re.sub(r"(?is)<(br|/p|/div|/li|/h[1-6]|/tr|/pre)[^>]*>", "\n", s)
    s = re.sub(r"(?is)<li[^>]*>", "\n- ", s)
    s = re.sub(r"(?is)<h([1-6])[^>]*>", lambda m: "\n" + "#" * int(m.group(1)) + " ", s)
    s = re.sub(r"(?is)<[^>]+>", " ", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t\xa0]+", " ", s)
    s = re.sub(r"\n\s*\n\s*\n+", "\n\n", s)
    lines = [l.strip() for l in s.split("\n")]
    return "\n".join(l for l in lines if l)

def main():
    url = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 40000
    raw, err = fetch(url)
    if err:
        print(f"### FETCH FAILED {url}\n{err}")
        return
    body = raw.decode("utf-8", "replace")
    if body.lstrip().startswith(("{", "[")):
        try:
            print(f"### URL: {url}\n### (JSON)\n" + json.dumps(json.loads(body), indent=1)[:limit])
            return
        except Exception:
            pass
    print(f"### URL: {url}\n" + strip_html(raw)[:limit])

if __name__ == "__main__":
    main()
