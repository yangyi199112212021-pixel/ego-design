(function () {
  const STORAGE_KEY = "portfolioEditableData";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getData() {
    const defaults = clone(window.PORTFOLIO_DEFAULT_DATA);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") {
        return defaults;
      }
      const projects = Array.isArray(saved.projects) ? saved.projects : defaults.projects;
      return {
        ...defaults,
        ...saved,
        navPills: Array.isArray(saved.navPills) ? saved.navPills : defaults.navPills,
        tags: Array.isArray(saved.tags) ? saved.tags : defaults.tags,
        heroImages: Array.isArray(saved.heroImages) ? saved.heroImages : defaults.heroImages,
        groupLogos: Array.isArray(saved.groupLogos) ? saved.groupLogos : defaults.groupLogos,
        about: saved.about && typeof saved.about === "object" ? saved.about : defaults.about,
        projects: projects.map((project) => ({
          group: "Haagen-Dazs",
          ...project,
          detailImages: Array.isArray(project.detailImages) ? project.detailImages : []
        }))
      };
    } catch (error) {
      return defaults;
    }
  }

  function text(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value || "";
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function renderTags(data) {
    document.querySelectorAll("[data-tags]").forEach((track) => {
      track.innerHTML = "";
      [...data.tags, ...data.tags].forEach((tag) => {
        const span = document.createElement("span");
        span.textContent = tag;
        track.appendChild(span);
      });
    });
  }

  function renderHome(data) {
    text('[data-field="projectsTitleStrong"]', data.projectsTitleStrong);
    text('[data-field="projectsTitleLight"]', data.projectsTitleLight);
    renderTags(data);

    const heroGrid = document.querySelector("[data-hero-image-grid]");
    if (heroGrid) {
      const items = data.heroImages.length ? data.heroImages : [];
      let currentLaneCount = 0;

      function renderHeroImages() {
        const laneCount = window.matchMedia("(max-width: 620px)").matches ? 3 : 2;
        if (laneCount === currentLaneCount && heroGrid.children.length) return;
        currentLaneCount = laneCount;
        heroGrid.innerHTML = "";

        for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
          const lane = document.createElement("div");
          lane.className = "hero-image-lane";
          lane.style.setProperty("--lane-duration", `${28 + laneIndex * 6}s`);
          if (laneIndex % 2 === 1) {
            lane.classList.add("is-reverse");
          }

          const track = document.createElement("div");
          track.className = "hero-image-track";
          const laneItems = items.filter((_, index) => index % laneCount === laneIndex);
          const imageSet = [...laneItems, ...laneItems, ...laneItems];

          imageSet.forEach((item) => {
            const image = document.createElement("img");
            image.className = "hero-image-module";
            image.src = item.image;
            image.alt = item.name || "";
            track.appendChild(image);
          });

          lane.appendChild(track);
          heroGrid.appendChild(lane);
        }
      }
      renderHeroImages();
      window.addEventListener("resize", renderHeroImages);
    }

    const logo = document.querySelector("[data-logo]");
    if (logo) {
      logo.src = data.logoUrl;
    }

    const nav = document.querySelector("[data-nav-pills]");
    if (nav) {
      nav.innerHTML = "";
      data.navPills.forEach((item) => {
        const link = document.createElement("a");
        const label = item.label || "";
        const normalizedLabel = label.toLowerCase();
        const normalizedSublabel = String(item.sublabel || "").toLowerCase();
        const isInfo = normalizedLabel === "info" || normalizedSublabel.includes("个人信息");
        const isContact = normalizedLabel === "contact" || normalizedSublabel.includes("联系方式");
        link.href = isInfo ? "#about" : isContact ? "#contact" : "#projects";
        if (isInfo) {
          link.dataset.aboutToggle = "";
        }
        if (isContact) {
          link.dataset.contactToggle = "";
        }
        link.textContent = item.label || "";
        const sub = document.createElement("span");
        sub.textContent = item.sublabel || "";
        link.appendChild(sub);
        nav.appendChild(link);
      });
    }

    const grid = document.querySelector("[data-project-grid]");
    if (grid) {
      grid.innerHTML = "";
      const groups = [];
      data.projects.forEach((project) => {
        const label = project.group || "Other";
        let group = groups.find((item) => item.label === label);
        if (!group) {
          group = { label, projects: [] };
          groups.push(group);
        }
        group.projects.push(project);
      });

      groups.forEach((group) => {
        const section = document.createElement("section");
        section.className = "project-group";
        section.dataset.projectGroup = group.label;

        const list = document.createElement("div");
        list.className = "project-grid";

        group.projects.forEach((project) => {
          const card = document.createElement("a");
          card.className = "project-card";
          card.href = `project.html?work=${encodeURIComponent(project.id)}`;
          const video = project.hoverVideo
            ? `<video class="project-card-video" src="${escapeHtml(project.hoverVideo)}" muted playsinline loop preload="none"></video>`
            : "";
          card.innerHTML = `
            <span class="project-media">
              <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}">
              ${video}
            </span>
            <span class="project-title">${escapeHtml(project.title)}</span>
            <span class="project-meta-line">
              <span class="project-pill">${escapeHtml(project.category)}</span>
              <time>${escapeHtml(project.date || project.year)}</time>
            </span>
            <span class="project-summary">${escapeHtml(project.summary || project.client || "")}</span>
          `;
          const videoNode = card.querySelector("video");
          if (videoNode) {
            card.addEventListener("mouseenter", () => {
              videoNode.play().catch(() => {});
            });
            card.addEventListener("mouseleave", () => {
              videoNode.pause();
              videoNode.currentTime = 0;
            });
          }
          list.appendChild(card);
        });

        section.appendChild(list);
        grid.appendChild(section);
      });
    }
  }

  function setupHeaderScroll() {
    const header = document.querySelector(".site-header");
    const activeGroup = document.querySelector("[data-active-project-group]");
    const activeGroupImage = document.querySelector("[data-active-project-group-image]");
    const projects = document.querySelector("#projects");
    const projectTicker = document.querySelector(".ticker-projects");
    if (!header) return;
    const data = getData();
    const groupImages = Object.fromEntries((data.groupLogos || []).map((item) => [item.group, item.image]));

    function syncHeader() {
      header.classList.toggle("is-scrolled", window.scrollY > 80);
      const headerRect = header.getBoundingClientRect();

      let label = "";
      document.querySelectorAll("[data-project-group]").forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.45 && rect.bottom > 160) {
          label = section.dataset.projectGroup || "";
        }
      });
      const visibleLabel = header.classList.contains("is-scrolled") && label ? label : "";
      const imageSrc = groupImages[visibleLabel];
      if (activeGroup) {
        activeGroup.textContent = imageSrc ? "" : visibleLabel;
      }
      if (activeGroupImage) {
        activeGroupImage.src = imageSrc || "";
        activeGroupImage.alt = visibleLabel || "";
        activeGroupImage.hidden = !imageSrc;
      }

      if (projects && projectTicker) {
        const projectsRect = projects.getBoundingClientRect();
        const shouldPinTicker =
          header.classList.contains("is-scrolled") &&
          projectsRect.top <= headerRect.bottom &&
          projectsRect.bottom > headerRect.bottom + projectTicker.offsetHeight;
        projectTicker.classList.toggle("is-fixed-under-header", shouldPinTicker);
        projectTicker.style.setProperty("--fixed-top", `${headerRect.bottom}px`);
      }
    }

    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
  }

  function setupProjectReveal() {
    const cards = document.querySelectorAll(".project-card");
    if (!cards.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      cards.forEach((card) => card.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    cards.forEach((card, index) => {
      card.style.transitionDelay = `${Math.min(index % 3, 2) * 80}ms`;
      observer.observe(card);
    });
  }

  function renderDetail(data) {
    const template = document.querySelector(".detail-template");
    if (!template) return;

    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("work");
    const project = data.projects.find((item) => item.id === requestedId) || data.projects[0];

    if (project) {
      document.title = `${data.siteTitle} | ${project.title}`;
      text("[data-detail-group]", project.group || "");
      text("[data-detail-project-title]", project.title || "");
      text("[data-detail-category]", project.category || "");
      text("[data-detail-client]", project.client || "");
      text("[data-detail-year]", project.year || "");
      text("[data-detail-description]", project.detailDescription || project.summary || "");

      const gallery = document.querySelector("[data-detail-gallery]");
      if (gallery) {
        gallery.innerHTML = "";
        const defaultDetailImage = "assets/project-detail-hero.png";
        const sourceImages = Array.isArray(project.detailImages) && project.detailImages.length
          ? project.detailImages
          : [project.detailBackground];
        const images = sourceImages.filter((src) => src && src !== defaultDetailImage);
        [...new Set(images)].forEach((src) => {
          const image = document.createElement("img");
          image.src = src;
          image.alt = project.title || "";
          gallery.appendChild(image);
        });
      }
    }
  }

  function setupAboutPanel() {
    const panel = document.querySelector(".about-panel");
    const toggles = document.querySelectorAll("[data-about-toggle]");
    const close = document.querySelector("[data-about-close]");
    if (!panel || !toggles.length) return;

    function setOpen(open) {
      panel.classList.toggle("is-open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      document.body.classList.toggle("about-open", open);
    }

    toggles.forEach((toggle) => {
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        setOpen(!panel.classList.contains("is-open"));
      });
    });
    close?.addEventListener("click", () => setOpen(false));
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });
  }

  function setupContactPanel() {
    const panel = document.querySelector(".contact-panel");
    const toggles = document.querySelectorAll("[data-contact-toggle]");
    const close = document.querySelector("[data-contact-close]");
    if (!panel || !toggles.length) return;

    function setOpen(open) {
      panel.classList.toggle("is-open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      document.body.classList.toggle("contact-open", open);
    }

    toggles.forEach((toggle) => {
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        setOpen(!panel.classList.contains("is-open"));
      });
    });
    close?.addEventListener("click", () => setOpen(false));
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });
  }

  function renderAbout(data) {
    const grid = document.querySelector("[data-about-grid]");
    const title = document.querySelector("[data-about-title]");
    if (!grid || !data.about) return;
    grid.innerHTML = "";
    if (title) {
      title.textContent = data.about.title || "About ...";
    }
    (data.about.columns || []).forEach((column) => {
      const columnNode = document.createElement("div");
      columnNode.className = "about-column";
      column.forEach((block) => {
        const blockNode = document.createElement("div");
        blockNode.className = "about-block";
        const lines = String(block.body || "")
          .split("\n")
          .map(escapeHtml)
          .join("<br>");
        blockNode.innerHTML = `<h2>${escapeHtml(block.heading)}</h2><p>${lines}</p>`;
        columnNode.appendChild(blockNode);
      });
      grid.appendChild(columnNode);
    });
  }

  window.PortfolioData = {
    storageKey: STORAGE_KEY,
    getData,
    saveData(data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },
    resetData() {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const data = getData();
  renderAbout(data);
  renderHome(data);
  renderDetail(data);
  setupHeaderScroll();
  setupProjectReveal();
  setupAboutPanel();
  setupContactPanel();
})();
