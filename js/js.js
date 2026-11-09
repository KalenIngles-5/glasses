 (() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.matchMedia('(min-width: 861px)');
  const hasIO = 'IntersectionObserver' in window;

  const header = document.getElementById('siteHeader');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('primary-nav');
  const navLinks = Array.from(nav.querySelectorAll('a[href^="#"]:not(.nav-cta)'));
  const progress = document.querySelector('.scroll-progress');

  /* ---------- Hero titles: animate by line, not by letter ----------
     Splitting into letters breaks browser translation and screen readers.
     Lines are animated with CSS (see .slide-title .line). */

  /* ---------- Mobile menu ---------- */
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
  };

  toggle.addEventListener('click', () => {
    setMenu(!nav.classList.contains('is-open'));
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      setMenu(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  isDesktop.addEventListener('change', (event) => {
    if (event.matches) {
      setMenu(false);
    }
  });

  /* ---------- On scroll: header state and progress bar ---------- */
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    header.classList.toggle('is-scrolled', y > 40);

    if (progress) {
      progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }

    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Hero slider ---------- */
  const hero = document.querySelector('[data-slider]');
  const slides = Array.from(hero.querySelectorAll('.slide'));
  const thumbs = Array.from(hero.querySelectorAll('.thumb'));
  const bar = hero.querySelector('.bar i');
  const currentEl = hero.querySelector('.current');
  const SLIDE_MS = 7000;
  let current = 0;
  let timer = null;
  let paused = false;
  let onScreen = true;

  const pad = (n) => String(n + 1).padStart(2, '0');

  const restartProgress = () => {
    hero.classList.remove('is-running');
    if (reduceMotion) return;
    void bar.offsetWidth;
    hero.classList.add('is-running');
  };

  /* Autoplay: advance after SLIDE_MS unless hovered or off screen */
  const schedule = () => {
    clearTimeout(timer);
    if (reduceMotion || paused || !onScreen) return;
    timer = setTimeout(() => show(current + 1), SLIDE_MS);
  };

  const show = (n) => {
    const total = slides.length;
    const target = (n + total) % total;

    slides.forEach((slide, i) => {
      const active = i === target;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });

    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('is-active', i === target);
      thumb.setAttribute('aria-selected', String(i === target));
    });

    currentEl.textContent = pad(target);
    current = target;
    restartProgress();
    schedule();
  };

  const setPaused = (value) => {
    paused = value;
    hero.classList.toggle('is-paused', value);
    if (value) {
      clearTimeout(timer);
    } else {
      schedule();
    }
  };

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', () => show(i));
  });

  hero.querySelector('.prev').addEventListener('click', () => show(current - 1));
  hero.querySelector('.next').addEventListener('click', () => show(current + 1));

  hero.addEventListener('pointerenter', () => setPaused(true));
  hero.addEventListener('pointerleave', () => setPaused(false));

  document.addEventListener('keydown', (event) => {
    if (nav.classList.contains('is-open')) return;
    if (document.querySelector('dialog[open]')) return;

    const rect = hero.getBoundingClientRect();
    const inView = rect.bottom > 0 && rect.top < window.innerHeight * 0.5;
    if (!inView) return;

    if (event.key === 'ArrowRight') show(current + 1);
    if (event.key === 'ArrowLeft') show(current - 1);
  });

  /* Swipe on touch screens */
  let startX = null;

  hero.addEventListener('pointerdown', (event) => {
    startX = event.clientX;
  });

  hero.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 60) {
      show(current + (dx < 0 ? 1 : -1));
    }
  });

  /* Pause autoplay when the hero is off screen */
  if (hasIO) {
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        onScreen = entry.isIntersecting;
        if (onScreen) {
          schedule();
        } else {
          clearTimeout(timer);
        }
      });
    }, { threshold: 0.2 });

    heroObserver.observe(hero);
  }

  show(0);

  /* ---------- Reveal on scroll ---------- */
  const revealElements = document.querySelectorAll('.reveal');

  if (hasIO && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Count-up numbers ---------- */
  const counters = document.querySelectorAll('[data-count]');

  const countUp = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion) {
      el.textContent = target;
      return;
    }
    const duration = 1400;
    const start = performance.now();

    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if (hasIO) {
    const countObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          countUp(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    counters.forEach((el) => countObserver.observe(el));
  } else {
    counters.forEach(countUp);
  }

  /* ---------- Toast ---------- */
  const toast = document.querySelector('[data-toast]');
  let toastTimer = null;

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  };

  /* ---------- Bag count ---------- */
  const bagButton = document.querySelector('[data-bag]');
  const bagCount = document.querySelector('[data-bag-count]');
  let bagItems = 0;

  const updateBag = () => {
    bagCount.textContent = bagItems;
    bagCount.classList.toggle('has-items', bagItems > 0);
    bagButton.setAttribute('aria-label', `Bag, ${bagItems} item${bagItems === 1 ? '' : 's'}`);
  };

  const addToBag = (name) => {
    bagItems += 1;
    updateBag();
    showToast(`${name} added to your bag`);
    bagCount.animate(
      [{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }],
      { duration: 400, easing: 'cubic-bezier(.22,.61,.36,1)' }
    );
  };

  bagButton.addEventListener('click', () => {
    showToast(bagItems ? `You have ${bagItems} item${bagItems === 1 ? '' : 's'} in your bag` : 'Your bag is empty');
  });

  /* ---------- Collection: filter, sort, add, quick view ---------- */
  const grid = document.querySelector('[data-products]');
  const productItems = Array.from(grid.querySelectorAll('.product'));
  const filterButtons = Array.from(document.querySelectorAll('.filter'));
  const sortSelect = document.querySelector('[data-sort]');
  let activeFilter = 'all';

  const applyCollection = () => {
    const sort = sortSelect.value;
    const sorted = [...productItems];

    if (sort === 'price-asc') {
      sorted.sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
    } else if (sort === 'price-desc') {
      sorted.sort((a, b) => Number(b.dataset.price) - Number(a.dataset.price));
    }

    sorted.forEach((item) => {
      grid.appendChild(item);
      const visible = activeFilter === 'all' || item.dataset.material === activeFilter;
      item.classList.toggle('is-hidden', !visible);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;

      filterButtons.forEach((b) => {
        const active = b === button;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });

      applyCollection();
    });
  });

  sortSelect.addEventListener('change', applyCollection);

  productItems.forEach((item) => {
    const name = item.dataset.name;
    const addButton = item.querySelector('.product-add');

    addButton.addEventListener('click', () => {
      addButton.classList.add('is-added');
      addButton.textContent = 'Added';
      addToBag(name);
      setTimeout(() => {
        addButton.classList.remove('is-added');
        addButton.textContent = 'Add to bag';
      }, 1600);
    });

    item.querySelector('.quick-view').addEventListener('click', () => openQuickView(item));
  });

  /* ---------- Quick view dialog ---------- */
  const dialog = document.querySelector('[data-quick-view]');
  let dialogProduct = null;

  const openQuickView = (item) => {
    dialogProduct = item;
    dialog.querySelector('[data-qv-img]').src = item.dataset.img;
    dialog.querySelector('[data-qv-img]').alt = item.querySelector('img').alt;
    dialog.querySelector('[data-qv-material]').textContent = item.dataset.material === 'metal' ? 'Metal frame' : 'Acetate frame';
    dialog.querySelector('[data-qv-name]').textContent = item.dataset.name;
    dialog.querySelector('[data-qv-price]').textContent = `€${item.dataset.price}`;
    dialog.querySelector('[data-qv-desc]').textContent = item.dataset.desc;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  };

  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.querySelector('[data-qv-add]').addEventListener('click', () => {
    if (!dialogProduct) return;
    addToBag(dialogProduct.dataset.name);
    dialog.close();
  });

  /* ---------- Frame finder ---------- */
  const finderForm = document.querySelector('[data-finder]');
  const finderSteps = Array.from(finderForm.querySelectorAll('.finder-step'));
  const finderProgress = document.querySelector('[data-finder-progress]');
  const finderNext = finderForm.querySelector('[data-finder-next]');
  const finderBack = finderForm.querySelector('[data-finder-back]');
  const finderNav = finderForm.querySelector('.finder-nav');
  const finderResult = finderForm.querySelector('[data-finder-result]');
  let step = 0;

  /* Each product has tags; each answer adds points to matching tags. */
  const frames = productItems.map((item) => ({
    item,
    name: item.dataset.name,
    tags: item.dataset.tags.split(' '),
    desc: item.dataset.desc
  }));

  const descriptions = {
    'Aurora Round': 'A round metal frame with a light, classic look. It is the easiest to wear for hours at a time.',
    'Vertex Square': 'A bold, sturdy acetate square that suits everyday wear and makes a clear statement.',
    'Nova Cat-Eye': 'A lifted tortoiseshell cat-eye with a warm, classic feel and a touch of character.',
    'Ember Tortoise': 'A soft rounded-square tortoise frame that is light and easy to wear every day.'
  };

  const showStep = (index) => {
    step = index;
    finderSteps.forEach((fs, i) => fs.classList.toggle('is-active', i === index));
    finderProgress.textContent = `Question ${index + 1} of ${finderSteps.length}`;
    finderBack.hidden = index === 0;
    finderNext.textContent = index === finderSteps.length - 1 ? 'See my match' : 'Next';
  };

  const showResult = () => {
    const answers = [1, 2, 3].map((n) => {
      const checked = finderForm.querySelector(`input[name="q${n}"]:checked`);
      return checked ? checked.value : null;
    });

    const scored = frames.map((frame) => {
      const score = answers.reduce((total, answer) => {
        if (!answer || answer === 'none') return total;
        return total + (frame.tags.includes(answer) ? 1 : 0);
      }, 0);
      return { ...frame, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    finderSteps.forEach((fs) => fs.classList.remove('is-active'));
    finderNav.hidden = true;
    finderProgress.textContent = 'Your match';
    finderResult.hidden = false;
    finderResult.querySelector('[data-result-name]').textContent = best.name;
    finderResult.querySelector('[data-result-text]').textContent = descriptions[best.name] || best.desc;
    finderResult.querySelector('[data-result-view]').dataset.target = best.name;
  };

  finderForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const currentStep = finderSteps[step];
    const radio = currentStep.querySelector('input[type="radio"]:checked');

    if (!radio) {
      showToast('Please choose an option to continue');
      return;
    }

    if (step < finderSteps.length - 1) {
      showStep(step + 1);
    } else {
      showResult();
    }
  });

  finderBack.addEventListener('click', () => {
    if (step > 0) showStep(step - 1);
  });

  finderResult.querySelector('[data-result-view]').addEventListener('click', (event) => {
    const name = event.currentTarget.dataset.target;
    const item = productItems.find((p) => p.dataset.name === name);
    document.getElementById('collection').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    if (item) {
      setTimeout(() => openQuickView(item), reduceMotion ? 0 : 700);
    }
  });

  finderResult.querySelector('[data-finder-restart]').addEventListener('click', () => {
    finderForm.reset();
    finderResult.hidden = true;
    finderNav.hidden = false;
    showStep(0);
  });

  /* ---------- Lens builder ---------- */
  const builderFrames = Array.from(document.querySelectorAll('[name="frame"]'));
  const builderLenses = Array.from(document.querySelectorAll('[name="lens"]'));
  const builderExtras = Array.from(document.querySelectorAll('[name="extra"]'));
  const sumFrame = document.querySelector('[data-sum-frame]');
  const sumLens = document.querySelector('[data-sum-lens]');
  const sumExtras = document.querySelector('[data-sum-extras]');
  const sumTotal = document.querySelector('[data-sum-total]');
  const addBuilt = document.querySelector('[data-add-built]');

  const framePrice = (index) => Number(builderFrames[index].closest('label').querySelector('small').textContent.replace(/[^\d]/g, '')) || 0;

  const updateBuilder = () => {
    const frameIndex = Number(builderFrames.find((r) => r.checked).value);
    const frameName = builderFrames[frameIndex].closest('label').querySelector('span').textContent;
    const lensRadio = builderLenses.find((r) => r.checked);
    const lensName = lensRadio.closest('label').querySelector('span').textContent;
    const lensPrice = Number(lensRadio.value);

    const checkedExtras = builderExtras.filter((c) => c.checked && Number(c.value) > 0);
    const extrasPrice = checkedExtras.reduce((sum, c) => sum + Number(c.value), 0);
    const extrasNames = checkedExtras.map((c) => c.closest('label').querySelector('span').textContent);

    const total = framePrice(frameIndex) + lensPrice + extrasPrice;

    sumFrame.textContent = frameName;
    sumLens.textContent = lensName;
    sumExtras.textContent = extrasNames.length ? extrasNames.join(', ') : 'None';
    sumTotal.textContent = `€${total}`;
  };

  [...builderFrames, ...builderLenses, ...builderExtras].forEach((input) => {
    input.addEventListener('change', updateBuilder);
  });

  addBuilt.addEventListener('click', () => {
    const frameIndex = Number(builderFrames.find((r) => r.checked).value);
    addToBag(`${productItems[frameIndex].dataset.name} with ${sumLens.textContent.toLowerCase()} lenses`);
  });

  updateBuilder();

  /* ---------- Opening status (Lisbon time) ---------- */
  const statusEl = document.querySelector('[data-open-status]');
  const hourRows = Array.from(document.querySelectorAll('.hours li[data-day]'));

  const hoursFor = (weekday) => {
    if (weekday === 0) return null;
    if (weekday === 6) return { open: 9, close: 19 };
    return { open: 10, close: 20 };
  };

  const dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  const updateOpenStatus = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Lisbon',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).formatToParts(new Date());

    const get = (type) => parts.find((p) => p.type === type).value;
    const weekday = dayIndex[get('weekday')];
    const hour = Number(get('hour')) % 24;
    const minute = Number(get('minute'));
    const now = hour + minute / 60;
    const hours = hoursFor(weekday);
    const isOpen = hours && now >= hours.open && now < hours.close;

    if (isOpen) {
      statusEl.textContent = `Open now · closes ${hours.close}:00`;
      statusEl.className = 'open-status is-open';
    } else {
      statusEl.textContent = 'Closed now';
      statusEl.className = 'open-status is-closed';
    }

    hourRows.forEach((row) => {
      const days = row.dataset.day;
      let match = false;
      if (days === '1-5') match = weekday >= 1 && weekday <= 5;
      else match = Number(days) === weekday;
      row.classList.toggle('is-today', match);
    });
  };

  if (statusEl) {
    updateOpenStatus();
    setInterval(updateOpenStatus, 60 * 1000);
  }

  /* ---------- Active link in the menu ---------- */
  if (hasIO) {
    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    const activeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
          });
        }
      });
    }, {
      rootMargin: '-45% 0px -50% 0px'
    });

    sections.forEach((section) => activeObserver.observe(section));
  }

  /* ---------- Contact form (validation and local confirmation) ---------- */
  const form = document.querySelector('.contact-form');

  if (form) {
    const note = form.querySelector('.form-note');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const setError = (field, message) => {
      const wrapper = field.closest('.field');
      wrapper.classList.toggle('has-error', Boolean(message));
      wrapper.querySelector('.error').textContent = message || '';
      field.setAttribute('aria-invalid', String(Boolean(message)));
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      note.textContent = '';

      const name = form.elements.name;
      const email = form.elements.email;
      let valid = true;

      if (!name.value.trim()) {
        setError(name, 'Please tell us your name.');
        valid = false;
      } else {
        setError(name, '');
      }

      if (!emailPattern.test(email.value.trim())) {
        setError(email, 'Please enter a valid email address.');
        valid = false;
      } else {
        setError(email, '');
      }

      if (!valid) {
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      note.textContent = `Thanks, ${name.value.trim()}. We will be in touch within one working day.`;
      form.reset();
    });
  }
})();
 