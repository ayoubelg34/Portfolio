document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const navLinksContainer = document.querySelector('.nav-links');
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  const cursor = document.querySelector('.cursor');
  const siteNav = document.querySelector('.site-nav');

  if (siteNav) {
    const toggleNavScrollState = () => {
      const scrolled = window.scrollY > 24;
      siteNav.classList.toggle('is-condensed', scrolled);
    };

    let navRaf = null;
    const scheduleNavUpdate = () => {
      if (navRaf) return;
      navRaf = requestAnimationFrame(() => {
        navRaf = null;
        toggleNavScrollState();
      });
    };

    toggleNavScrollState();
    window.addEventListener('scroll', scheduleNavUpdate, { passive: true });
    window.addEventListener('resize', toggleNavScrollState);
  }

  const closeMenu = () => {
    if (!navLinksContainer) return;
    navLinksContainer.classList.remove('is-open');
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'false');
    }
  };

  if (navToggle && navLinksContainer) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinksContainer.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 960) {
        closeMenu();
      }
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 960) {
      closeMenu();
    }
  });

  const sections = [...document.querySelectorAll('[data-section]')];
  const sectionById = new Map();

  navLinks.forEach((link) => {
    const targetId = link.getAttribute('href')?.replace('#', '') ?? '';
    if (!targetId) return;
    sectionById.set(targetId, link);
  });

  const toggleActiveLink = (id) => {
    navLinks.forEach((link) => link.classList.remove('is-active'));
    const targetLink = sectionById.get(id);
    if (targetLink) {
      targetLink.classList.add('is-active');
    }
  };

  if (sections.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length === 0) return;
        const topEntry = visible[0];
        const identifier = topEntry.target.getAttribute('id') ?? topEntry.target.dataset.section;
        if (identifier) {
          toggleActiveLink(identifier);
        }
      },
      {
        threshold: [0.35, 0.5, 0.65],
        rootMargin: '-10% 0px -45% 0px',
      }
    );

    sections.forEach((section) => {
      observer.observe(section);
    });
  }

  toggleActiveLink('hero');

  if (cursor) {
    let rafId;
    const moveCursor = (event) => {
      const { clientX, clientY } = event;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        cursor.style.transform = `translate(calc(${clientX}px - 50%), calc(${clientY}px - 50%))`;
      });
    };

    window.addEventListener('mousemove', moveCursor, { passive: true });

    const interactiveElements = [
      ...document.querySelectorAll('a, button, .btn'),
    ];

    interactiveElements.forEach((element) => {
      element.addEventListener('mouseenter', () => cursor.classList.add('is-active'));
      element.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
    });

    window.addEventListener('mousedown', () => cursor.classList.add('is-active'));
    window.addEventListener('mouseup', () => cursor.classList.remove('is-active'));
  }
});

// Reveal on scroll
(() => {
  const revealItems = [...document.querySelectorAll('.reveal')];
  if (revealItems.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
  );

  revealItems.forEach((item) => observer.observe(item));
})();

// 3D tilt effect
(() => {
  const tiltItems = [...document.querySelectorAll('.tilt')];
  if (tiltItems.length === 0) return;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  tiltItems.forEach((item) => {
    const rect = { width: 0, height: 0, left: 0, top: 0 };
    const updateRect = () => {
      const r = item.getBoundingClientRect();
      rect.width = r.width;
      rect.height = r.height;
      rect.left = r.left;
      rect.top = r.top;
    };
    updateRect();
    window.addEventListener('resize', updateRect);

    const limit = Number(item.dataset.tilt || 10);

    item.addEventListener('mousemove', (event) => {
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateX = ((y / rect.height) - 0.5) * -limit;
      const rotateY = ((x / rect.width) - 0.5) * limit;

      item.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
      item.style.setProperty('--my', `${(y / rect.height) * 100}%`);
      item.style.transform = `perspective(900px) rotateX(${clamp(rotateX, -limit, limit)}deg) rotateY(${clamp(rotateY, -limit, limit)}deg)`;
    });

    item.addEventListener('mouseleave', () => {
      item.style.transform = '';
    });
  });
})();

// Hero parallax
(() => {
  const hero = document.querySelector('.hero-visual.parallax');
  if (!hero) return;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const getMax = () => parseFloat(getComputedStyle(hero).getPropertyValue('--parallax-max')) || 30;

  const onScroll = () => {
    const rect = hero.getBoundingClientRect();
    const visibility = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
    const offset = (1 - visibility) * getMax();
    hero.style.setProperty('--py', `${offset}px`);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Magnetic buttons
(() => {
  const magnets = [...document.querySelectorAll('.magnetic')];
  if (magnets.length === 0) return;

  magnets.forEach((element) => {
    const getRect = () => element.getBoundingClientRect();

    element.addEventListener('mousemove', (event) => {
      const rect = getRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      element.style.setProperty('--mx', `${x * 100}%`);
      element.style.setProperty('--my', `${y * 100}%`);
      const translateX = (x - 0.5) * 10;
      const translateY = (y - 0.5) * 10;
      element.style.transform = `translate(${translateX}px, ${translateY}px)`;
    });

    element.addEventListener('mouseleave', () => {
      element.style.transform = '';
    });
  });
})();

// Carousel (projects, testimonials)
(() => {
  const carousels = [...document.querySelectorAll('[data-carousel]')];
  if (carousels.length === 0) return;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const initCarousel = (root) => {
    const viewport = root.querySelector('.carousel-viewport');
    const track = root.querySelector('.carousel-track');
    const slides = [...root.querySelectorAll('.slide')];
    const prev = root.querySelector('.prev');
    const next = root.querySelector('.next');
    const dotsContainer = root.querySelector('.carousel-dots');

    if (!viewport || !track || slides.length === 0 || !dotsContainer) return;

    let index = 0;
    let position = 0;
    let width = viewport.clientWidth;
    let isDragging = false;
    let startX = 0;
    let startPosition = 0;
    let rafId;

    const render = () => {
      track.style.transform = `translateX(${-position}px)`;
    };

    const setWidth = () => {
      width = viewport.clientWidth;
      slides.forEach((slide) => {
        slide.style.width = `${width}px`;
      });
      goTo(index, false);
    };

    const buildDots = () => {
      dotsContainer.innerHTML = '';
      slides.forEach((_, dotIndex) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `Go to slide ${dotIndex + 1}`);
        if (dotIndex === index) {
          button.setAttribute('aria-current', 'true');
        }
        button.addEventListener('click', () => goTo(dotIndex));
        dotsContainer.appendChild(button);
      });
    };

    const updateDots = () => {
      [...dotsContainer.children].forEach((dot, dotIndex) => {
        if (dotIndex === index) {
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.removeAttribute('aria-current');
        }
      });
    };

    const goTo = (targetIndex, animate = true) => {
      index = clamp(targetIndex, 0, slides.length - 1);
      position = index * width;
      track.style.transition = animate ? 'transform .45s cubic-bezier(.2,.8,.2,1)' : 'none';
      render();
      if (animate) {
        setTimeout(() => {
          track.style.transition = 'none';
        }, 460);
      }
      updateDots();
    };

    const onPointerDown = (event) => {
      isDragging = true;
      startX = event.touches ? event.touches[0].clientX : event.clientX;
      startPosition = position;
      track.style.transition = 'none';
    };

    const onPointerMove = (event) => {
      if (!isDragging) return;
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const delta = clientX - startX;
      position = clamp(startPosition - delta, 0, (slides.length - 1) * width);
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(render);
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      const target = Math.round(position / width);
      goTo(target);
    };

    viewport.addEventListener('mousedown', onPointerDown);
    viewport.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    viewport.addEventListener('touchstart', onPointerDown, { passive: true });
    viewport.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    if (prev) prev.addEventListener('click', () => goTo(index - 1));
    if (next) next.addEventListener('click', () => goTo(index + 1));

    window.addEventListener('resize', setWidth);
    window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') goTo(index + 1);
      if (event.key === 'ArrowLeft') goTo(index - 1);
    });

    setWidth();
    buildDots();
  };

  carousels.forEach(initCarousel);
})();

// Mark HTML as ready (legacy support)
try {
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('ready');
  });
} catch (error) {
  // no-op
}
