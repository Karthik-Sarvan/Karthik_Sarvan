document.addEventListener("DOMContentLoaded", (event) => {
    
    // 1. Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            lenis.scrollTo(this.getAttribute('href'), {
                duration: 1.5,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            });
        });
    });

    // 2. Initialize GSAP ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Update ScrollTrigger on Lenis scroll
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time)=>{ lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);


    // 3. SplitType for advanced text animations
    const heroText = new SplitType('.split-hero', { types: 'chars' });
    const aboutText = new SplitType('.split-about', { types: 'words' });

    // 4. Hero Animations (Staggered Characters)
    const tl = gsap.timeline();
    
    // Animate Nav links dropping in
    tl.fromTo(".nav-link-anim", 
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power4.out" }
    )
    // Animate Hero Characters popping up
    .fromTo(heroText.chars, 
        { y: 150, opacity: 0 },
        {
            y: 0,
            opacity: 1,
            duration: 1.2,
            stagger: 0.03,
            ease: "expo.out",
        },
        "-=0.8"
    )
    .to(".hero-subtext", {
        opacity: 1,
        duration: 1.5,
        ease: "power2.out"
    }, "-=0.8");

    // 5. Scroll Animations

    // About Section Text - Words fade and lift in as you scroll
    gsap.fromTo(aboutText.words, 
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
            }
        }
    );

    // Draw Line Animations (for section headers)
    const lines = document.querySelectorAll('.line-draw');
    lines.forEach(line => {
        gsap.fromTo(line, 
            { width: 0 },
            {
                width: 48, // w-12 is 48px
                duration: 1.5,
                ease: "power4.out",
                scrollTrigger: {
                    trigger: line,
                    start: "top 85%",
                }
            }
        );
    });

    const linesDark = document.querySelectorAll('.line-draw-dark');
    linesDark.forEach(line => {
        gsap.fromTo(line, 
            { width: 0 },
            {
                width: 48, // w-12 is 48px
                duration: 1.5,
                ease: "power4.out",
                scrollTrigger: {
                    trigger: line,
                    start: "top 85%",
                }
            }
        );
    });

    // Fade up elements (Education, Cards)
    const eduItems = document.querySelectorAll('.edu-item');
    eduItems.forEach((el, i) => {
        gsap.fromTo(el, 
            { y: 50, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1,
                delay: i * 0.1,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: el,
                    start: "top 90%",
                }
            }
        );
    });

    // Capabilities Pills Stagger
    const pills = document.querySelectorAll('.capability-pill');
    gsap.fromTo(pills, 
        { y: 30, opacity: 0 },
        {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.05,
            ease: "back.out(1.2)",
            scrollTrigger: {
                trigger: pills[0],
                start: "top 85%",
            }
        }
    );

    // Experience Items
    const experienceItems = document.querySelectorAll('.exp-row');
    experienceItems.forEach((item, i) => {
        gsap.fromTo(item,
            { y: 40, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: item,
                    start: "top 85%",
                }
            }
        );
    });

    // Project Cards
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, i) => {
        gsap.fromTo(card,
            { y: 80, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1.2,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: card,
                    start: "top 85%",
                }
            }
        );
    });
});
