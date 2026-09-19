/**
 * Site interactions for karthik.qzz.io
 *
 * All libraries are vendored in js/vendor and loaded with `defer`.
 * Every integration is feature-detected: if a script fails to load,
 * the page must still render all of its content (this is also what
 * keeps the site crawlable by search engines).
 */
document.addEventListener("DOMContentLoaded", () => {
    // The vendored Lenis UMD build exposes a lowercase global; keep both.
    const Lenis = window.Lenis || window.lenis;

    let lenis = null;
    if (typeof Lenis === "function") {
        try {
            lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                direction: "vertical",
                gestureDirection: "vertical",
                smooth: true,
                mouseMultiplier: 1,
                smoothTouch: false,
                touchMultiplier: 2,
                infinite: false,
            });
            const raf = (time) => {
                lenis.raf(time);
                requestAnimationFrame(raf);
            };
            requestAnimationFrame(raf);
        } catch (e) {
            lenis = null;
        }
    }

    // Smooth scroll for anchor links (fallback = native jump if no Lenis).
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
            const target = document.querySelector(this.getAttribute("href"));
            if (!target) return;
            e.preventDefault();
            if (lenis) {
                lenis.scrollTo(this.getAttribute("href"), {
                    duration: 1.5,
                    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                });
            } else {
                target.scrollIntoView({ behavior: "smooth" });
            }
        });
    });

    // The remaining work all depends on GSAP. Bail gracefully if absent.
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") {
        return;
    }
    const gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    if (lenis) {
        lenis.on("scroll", window.ScrollTrigger.update);
        gsap.ticker.add((time) => { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
    }

    // Advanced text splitting (hero characters / about words).
    let heroChars = [];
    let aboutWords = [];
    if (typeof window.SplitType === "function") {
        try {
            heroChars = new SplitType(".split-hero", { types: "chars" }).chars || [];
            aboutWords = new SplitType(".split-about", { types: "words" }).words || [];
        } catch (e) {
            heroChars = [];
            aboutWords = [];
        }
    }

    // Hero entrance: nav links drop in, hero characters pop up.
    const tl = gsap.timeline();
    tl.fromTo(".nav-link-anim",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power4.out" });

    if (heroChars.length) {
        tl.fromTo(heroChars,
            { y: 150, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.2, stagger: 0.03, ease: "expo.out" },
            "-=0.8");
    }
    tl.to(".hero-subtext", { opacity: 1, duration: 1.5, ease: "power2.out" }, "-=0.8");

    // About words fade and lift in on scroll.
    if (aboutWords.length) {
        gsap.fromTo(aboutWords,
            { opacity: 0.1, y: 20 },
            {
                opacity: 1,
                y: 0,
                stagger: 0.05,
                scrollTrigger: {
                    trigger: "#about",
                    start: "top 75%",
                    end: "top 25%",
                    scrub: true,
                },
            });
    }

    // Draw-in section header lines.
    const drawLine = (els) => {
        els.forEach((line) => {
            gsap.fromTo(line,
                { width: 0 },
                {
                    width: 48, // w-12 = 48px
                    duration: 1.5,
                    ease: "power4.out",
                    scrollTrigger: { trigger: line, start: "top 85%" },
                });
        });
    };
    drawLine(Array.from(document.querySelectorAll(".line-draw")));
    drawLine(Array.from(document.querySelectorAll(".line-draw-dark")));

    // Education items fade up.
    document.querySelectorAll(".edu-item").forEach((el, i) => {
        gsap.fromTo(el,
            { y: 50, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 1, delay: i * 0.1, ease: "power3.out",
                scrollTrigger: { trigger: el, start: "top 90%" },
            });
    });

    // Capability pills stagger in.
    const pills = document.querySelectorAll(".capability-pill");
    if (pills.length) {
        gsap.fromTo(pills,
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: "back.out(1.2)",
                scrollTrigger: { trigger: pills[0], start: "top 85%" },
            });
    }

    // Experience rows.
    document.querySelectorAll(".exp-row").forEach((item) => {
        gsap.fromTo(item,
            { y: 40, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 1, ease: "power2.out",
                scrollTrigger: { trigger: item, start: "top 85%" },
            });
    });

    // Project cards.
    document.querySelectorAll(".project-card").forEach((card) => {
        gsap.fromTo(card,
            { y: 80, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 1.2, ease: "power3.out",
                scrollTrigger: { trigger: card, start: "top 85%" },
            });
    });

    // Blog / journal entrance accents.
    gsap.fromTo(".reveal-fade",
        { y: 24, opacity: 0 },
        {
            y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: "power3.out",
            scrollTrigger: { trigger: "#main", start: "top 80%" },
        });
    document.querySelectorAll(".reveal-item").forEach((el) => {
        gsap.fromTo(el,
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
                scrollTrigger: { trigger: el, start: "top 90%" },
            });
    });
});
