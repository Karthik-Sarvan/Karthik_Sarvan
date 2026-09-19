# SEO — what was built, and what you must still do

This document is the promotion plan for **karthik.qzz.io**. The code side is
done and checked (`npm run check` / `npm run smoke`). The rest requires you to
click a few buttons in search-console accounts, which no repository can do.

> ⚠️ **An honest note on "rank #1 everywhere."**
> No amount of on-page code can *guarantee* first place. Search engines rank
> pages by relevance **and** authority (links, age, signals), and anyone can
> out-spend or out-link you. What this build does is remove every technical
> reason you *wouldn't* rank, present your identity so clearly that Google,
> Bing and Brave can build a knowledge entry for "Karthik Sarvan", and give the
> engines fast, clean, fully-crawlable pages. Combined with the off-page steps
> below, that is the realistic path to owning page one for your own name.

---

## 1. What is already in the code

- **One canonical URL per page.** Every page sets `rel=canonical` to its
  `https://karthik.qzz.io/...` URL, so `www`, `http`, and GitHub-Pages copies
  never split ranking signals. `/post.html` 301-redirects (meta refresh +
  `noindex`) to the real article so old links keep working.
- **Title + meta description per page**, written for the queries
  "Karthik Sarvan", "Sarvan Karthik", "Karthik Sarvan embedded engineer",
  "Karthik Sarvan Visakhapatnam".
- **Structured data (JSON-LD)**: a `Person`/`ProfilePage` with `sameAs` links
  to GitHub / LinkedIn / X / Instagram, plus `WebSite`, projects as
  `SoftwareApplication`, and `BlogPosting` + `BreadcrumbList` on articles.
  This is what lets an engine answer "who is Karthik Sarvan".
- **`rel="me"` links** to all four socials from every page (identity merge).
- **`robots.txt`** allowing every crawler (incl. GPTBot, ClaudeBot,
  PerplexityBot, OAI-SearchBot) + **`sitemap.xml`** + **`llms.txt`** (AI answer
  engines) + **Atom `feed.xml`**.
- **Open Graph + X cards** with a real 1200×630 image (`assets/og-image.png`),
  so links look professional on WhatsApp/LinkedIn/X.
- **Favicon / apple-touch-icon / PWA manifest** (a "K.S." monogram).
- **Performance**: the in-browser Tailwind CDN compiler (~400 KB, render-
  blocking) is gone, replaced by a 19 KB compiled stylesheet; GSAP/Lenis/
  SplitType are vendored and `defer`red; fonts load non-blocking. Fast pages
  rank better (Core Web Vitals).
- **IndexNow key** at `/f0ef108e56ad34703c4cd81389246e72.txt` (see §4).
- **404.html** so bad links don't dead-end.
- **Accessibility/semantics**: one `<h1>` per page, skip links, `aria-label`s,
  real `<time>` dates, descriptive link text — all ranking-adjacent signals.

---

## 2. Do these on day one (≈20 minutes)

1. **Google Search Console** — <https://search.google.com/search-console>
   - Add property `https://karthik.qzz.io` (URL-prefix), verify via DNS or by
     pasting the given meta tag into the placeholder in `index.html`'s head
     (search for `PASTE_GOOGLE_CODE_HERE`), deploy, then "Sitemaps →
     `https://karthik.qzz.io/sitemap.xml` → Submit".
2. **Bing Webmaster Tools** — <https://www.bing.com/webmasters>
   - It can import your GSC property. Submit the same sitemap. Paste the
     `msvalidate.01` tag into the `PASTE_BING_CODE_HERE` placeholder.
   - Bing feeds **Bing, Yahoo, DuckDuckGo** and (largely) **Brave**.
3. **Confirm the CNAME is live.** `karthik.qzz.io` must actually resolve to
   GitHub Pages. In your repo → Settings → Pages, confirm the custom domain
   shows "DNS check successful" and that `CNAME` still contains
   `karthik.qzz.io`. (The sandbox could not reach the domain; verify from your
   machine: `curl -I https://karthik.qzz.io`.)

## 3. Off-page authority (this is where "popular" is won)

- **GitHub:** rename your GitHub display *name* to "Karthik Sarvan"
  (Settings → Profile → Name), and add your website `karthik.qzz.io` to the
  Profile "URL" field. Turn the `Karthik-Sarvan/Karthik-Sarvan` repo (exact
  username match) into a profile README that links the site.
- **LinkedIn:** put `karthik.qzz.io` in the Contact info *and* the Featured
  section; use the exact name "Karthik Sarvan".
- **X / Instagram:** add the site link to the bio (Instagram "Links" + X bio).
- **Consistency = disambiguation.** Use the identical name string and photo
  across all four so engines merge you into one entity.
- **Backlinks:** publish the journal posts to LinkedIn articles / dev.to /
  Hashnode with a canonical link back; every mention of "Karthik Sarvan" on
  another domain is a vote for your page.

## 4. IndexNow (faster indexing on Bing/Naver/Yandex)

The key file is committed. After you publish a new page, POST it once:

```bash
curl -H "Content-Type: application/json" -X POST "https://api.indexnow.org/indexnow" \
  -d '{"host":"karthik.qzz.io","key":"f0ef108e56ad34703c4cd81389246e72",
       "keyLocation":"https://karthik.qzz.io/f0ef108e56ad34703c4cd81389246e72.txt",
       "urlList":["https://karthik.qzz.io/<new-page>.html"]}'
```

## 5. Keep it healthy

- Run `npm run check` and `npm run smoke` before every deploy.
- After editing any page: update `sitemap.xml` `<lastmod>`, rebuild the CSS
  (`npm run build:css`), and ping IndexNow.
- Add new journal posts by copying a file in `posts/`, updating
  `sitemap.xml`, `feed.xml`, and `blog.html`.
