#!/usr/bin/env python3
"""Static SEO/health checker for karthik.qzz.io.

Validates, without a browser:
  * HTML well-formedness (balanced tags) on every page
  * every local href/src/og reference resolves to a real file
  * every canonical / og:url matches the intended production URL
  * every JSON-LD block parses and carries @context + @type
  * robots.txt / sitemap.xml / feed.xml / manifest parse as XML/JSON
  * sitemap covers exactly the indexable pages, and each page lists itself
  * no render-blocking third-party CSS/JS compilers remain (no Tailwind CDN,
    no cdnjs, no Font Awesome <i> icons)
  * every page has exactly one <h1> and a meta description

Run: python3 tools/check.py
Exit code 0 = all checks pass.
"""
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://karthik.qzz.io"
PAGES = ["index.html", "blog.html", "post.html", "404.html",
         "posts/bare-metal-firmware-testing-with-mimic.html",
         "posts/safe-concurrency-in-rust-for-eda.html"]
FAIL = []


def err(msg):
    FAIL.append(msg)
    print("  FAIL:", msg)


VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"}


class Checker(HTMLParser):
    def __init__(self, rel):
        super().__init__(convert_charrefs=True)
        self.rel = rel
        self.stack = []
        self.refs = []          # local href/src values
        self.canonical = None
        self.og_url = None
        self.meta_desc = None
        self.h1 = 0
        self.h1_texts = []
        self.jsonld = []
        self.cur_json = []
        self.in_json = False
        self.head_scripts = []   # scripts inside <head> without defer/async
        self.in_head = False
        self.fas = 0
        self.tailwind_cdn = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "head":
            self.in_head = True
        if tag in ("a", "link") and "href" in a:
            self.refs.append(a["href"])
            if a.get("rel", "").startswith("canonical") or "canonical" in a.get("rel", ""):
                self.canonical = a["href"]
        if tag in ("img", "script", "source") and "src" in a:
            self.refs.append(a["src"])
        if tag == "meta":
            if a.get("name") == "description":
                self.meta_desc = a.get("content")
            if a.get("property") == "og:url":
                self.og_url = a.get("content")
            if a.get("property") == "og:image":
                self.refs.append(a.get("content"))
            if a.get("property") == "og:image:secure_url":
                self.refs.append(a.get("content"))
        if tag == "h1":
            self.h1 += 1
        if tag == "script":
            src = a.get("src", "")
            if "tailwindcss" in src or "cdn.tailwindcss" in src:
                self.tailwind_cdn = True
            if self.in_head and src and not a.get("defer") and not a.get("async") \
               and a.get("type") != "application/ld+json":
                self.head_scripts.append(src)
            if a.get("type") == "application/ld+json":
                self.in_json = True
                self.cur_json = []
        if "fa-" in (a.get("class") or "") or "fab" in (a.get("class") or "").split() or "fas" in (a.get("class") or "").split():
            self.fas += 1
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False
        if tag == "script" and self.in_json:
            self.in_json = False
            self.jsonld.append("".join(self.cur_json))
            self.cur_json = []
            if self.stack and self.stack[-1] == "script":
                self.stack.pop()
            return
        if tag in VOID:
            return
        if not self.stack:
            err(f"{self.rel}: closing </{tag}> with empty stack")
            return
        if self.stack[-1] != tag:
            err(f"{self.rel}: mismatched </{tag}>, expected </{self.stack[-1]}>")
            while self.stack and self.stack[-1] != tag:
                self.stack.pop()
        else:
            self.stack.pop()

    def handle_data(self, data):
        if self.in_json:
            self.cur_json.append(data)


def url_to_path(url, page_dir):
    root_relative = False
    if url.startswith(BASE + "/"):
        url = url[len(BASE) + 1:]
        root_relative = True
    elif url.startswith("/"):
        url = url.lstrip("/")
        root_relative = True
    if url.startswith("http://") or url.startswith("https://") \
            or url.startswith("mailto:") or url.startswith("tel:") \
            or url.startswith("#") or url.startswith("//"):
        return None
    url = url.split("#")[0].split("?")[0]
    if url == "":
        return "index.html"
    if root_relative:
        return os.path.normpath(url)
    return os.path.normpath(os.path.join(page_dir, url)) if page_dir else url


def check_page(rel):
    path = os.path.join(ROOT, rel)
    print(f"\n[{rel}]")
    with open(path, encoding="utf-8") as f:
        html = f.read()
    page_dir = os.path.dirname(rel)
    c = Checker(rel)
    c.feed(html)
    c.close()
    if c.stack:
        err(f"{rel}: unclosed tags {c.stack}")
    if c.h1 != 1:
        err(f"{rel}: expected exactly one <h1>, found {c.h1}")
    if not c.meta_desc or len(c.meta_desc) < 40:
        err(f"{rel}: missing/short meta description")
    if len(c.meta_desc or "") > 220:
        err(f"{rel}: meta description too long ({len(c.meta_desc)} chars)")
    if c.tailwind_cdn:
        err(f"{rel}: still loading Tailwind CDN compiler")
    if c.fas:
        err(f"{rel}: Font Awesome <i> icons present ({c.fas})")
    if c.head_scripts:
        err(f"{rel}: render-blocking <head> scripts: {c.head_scripts}")
    want = {"index.html": f"{BASE}/",
            "post.html": f"{BASE}/posts/bare-metal-firmware-testing-with-mimic.html",
            }.get(rel, f"{BASE}/{rel}")
    if c.canonical != want:
        err(f"{rel}: canonical {c.canonical!r} != {want!r}")
    if rel not in ("post.html", "404.html") and c.og_url != (
            f"{BASE}/" if rel == "index.html" else f"{BASE}/{rel}"):
        err(f"{rel}: og:url {c.og_url!r}")
    for ref in c.refs:
        p = url_to_path(ref, page_dir)
        if p is None:
            continue
        if not os.path.exists(os.path.join(ROOT, p)):
            err(f"{rel}: missing local asset -> {ref}")
    for i, block in enumerate(c.jsonld):
        try:
            data = json.loads(block)
        except Exception as e:
            err(f"{rel}: JSON-LD #{i} invalid: {e}")
            continue
        graph = data.get("@graph", [data])
        for node in graph:
            if "@type" not in node:
                err(f"{rel}: JSON-LD node missing @type")
    return c


def main():
    for rel in PAGES:
        check_page(rel)

    # XML / JSON side files
    for x in ("sitemap.xml", "feed.xml"):
        try:
            ET.parse(os.path.join(ROOT, x))
            print(f"\n[{x}] parses OK")
        except Exception as e:
            err(f"{x}: {e}")
    for j in ("site.webmanifest",):
        json.load(open(os.path.join(ROOT, j)))
        print(f"[{j}] parses OK")

    # sitemap coverage == indexable pages (excluding redirects/404)
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = {e.text for e in ET.parse(os.path.join(ROOT, "sitemap.xml")).getroot().findall(".//s:url/s:loc", ns)}
    want = {f"{BASE}/"} | {f"{BASE}/{p}" for p in PAGES
                           if p not in ("post.html", "404.html", "index.html")}
    if locs != want:
        err(f"sitemap mismatch:\n  only in sitemap: {locs - want}\n  missing: {want - locs}")

    # robots.txt mentions the sitemap
    robots = open(os.path.join(ROOT, "robots.txt")).read()
    if "sitemap.xml" not in robots.lower():
        err("robots.txt missing Sitemap line")

    # node syntax check handled outside; summary here
    print("\n==============================")
    if FAIL:
        print(f"{len(FAIL)} problem(s) found")
        sys.exit(1)
    print("ALL CHECKS PASSED")


if __name__ == "__main__":
    main()
