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

  function isVideo(src) {
    return /\.(mp4|webm|mov)(\?.*)?$/i.test(String(src || ""));
  }

  function mobileAssetSrc(src) {
    if (!src || /\.(mp4|webm|mov|svg)(\?.*)?$/i.test(src)) return "";
    const cleanSrc = String(src).split("?")[0];
    const fileName = cleanSrc.split("/").pop() || "";
    const dotIndex = fileName.lastIndexOf(".");
    if (dotIndex < 0) return "";
    const base = fileName.slice(0, dotIndex).replace(/[^a-zA-Z0-9._-]/g, "_");
    return `assets/mobile/${base}-mobile.jpg`;
  }

  function applyResponsiveImage(image, src, sizes) {
    const mobileSrc = mobileAssetSrc(src);
    const useMobile = mobileSrc && window.matchMedia("(max-width: 760px)").matches;
    image.src = useMobile ? mobileSrc : src;
    image.dataset.fullSrc = src;
    image.dataset.mobileSrc = mobileSrc || "";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      if (image.src !== image.dataset.fullSrc) {
        image.src = image.dataset.fullSrc;
      }
    });
  }

  function responsiveImageMarkup(src, alt, className = "", sizes = "(max-width: 760px) 100vw, 33vw") {
    const mobileSrc = mobileAssetSrc(src);
    const classAttr = className ? ` class="${escapeHtml(className)}"` : "";
    const mobileAttr = mobileSrc ? ` data-mobile-src="${escapeHtml(mobileSrc)}"` : "";
    return `<img${classAttr} src="${escapeHtml(src)}" data-full-src="${escapeHtml(src)}"${mobileAttr} alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
  }

  function activateMobileImages(scope = document) {
    if (!window.matchMedia("(max-width: 760px)").matches) return;
    scope.querySelectorAll("img[data-mobile-src]").forEach((image) => {
      const fullSrc = image.dataset.fullSrc || image.src;
      const mobileSrc = image.dataset.mobileSrc;
      if (!mobileSrc) return;
      image.addEventListener("error", () => {
        if (image.src !== fullSrc) {
          image.src = fullSrc;
        }
      });
      image.src = mobileSrc;
    });
  }

  function projectInitials(project) {
    const source = project.title || project.group || "Work";
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  function heroProjectId(item, data, index) {
    const explicitId = item.projectId || item.workId || item.project || "";
    if (data.projects.some((project) => project.id === explicitId)) {
      return explicitId;
    }
    if (data.projects.some((project) => project.id === item.id)) {
      return item.id;
    }
    return data.projects.length ? data.projects[index % data.projects.length].id : "";
  }

  function createMediaNode(src, alt, className) {
    if (!src) return null;
    if (isVideo(src)) {
      const video = document.createElement("video");
      video.className = className;
      video.src = src;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.controls = true;
      video.preload = "metadata";
      return video;
    }
    const image = document.createElement("img");
    image.className = className;
    image.alt = alt || "";
    applyResponsiveImage(image, src);
    return image;
  }

  function normalizeDetailImage(item) {
    if (!item) return null;
    if (typeof item === "string") {
      return { src: item, width: "full" };
    }
    const width = ["full", "half", "third"].includes(item.width) ? item.width : "full";
    return {
      src: item.src || item.path || item.image || "",
      width
    };
  }

  function splitDetailDescription(description) {
    const text = String(description || "")
      .replace(/\u0002/g, "")
      .replace(/\r/g, "")
      .trim();
    const result = { en: [], zh: [] };
    if (!text) return result;

    text
      .split(/\n+/)
      .flatMap((line) => line.split(/(?<=[\u3400-\u9fff。！？；，、])(?=[A-Za-z])/g))
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const chineseCount = (line.match(/[\u3400-\u9fff]/g) || []).length;
        const latinCount = (line.match(/[A-Za-z]/g) || []).length;
        if (chineseCount > latinCount * 0.35) {
          result.zh.push(line);
        } else {
          result.en.push(line);
        }
      });

    if (!result.en.length && result.zh.length > 1) {
      result.en.push(result.zh.pop());
    }
    if (!result.zh.length && result.en.length > 1) {
      result.zh.push(result.en.pop());
    }
    return result;
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
          const laneItems = items
            .map((item, index) => ({ item, index }))
            .filter((entry) => entry.index % laneCount === laneIndex);
          const imageSet = [...laneItems, ...laneItems, ...laneItems];

          imageSet.forEach((entry) => {
            const item = entry.item;
            const projectId = heroProjectId(item, data, entry.index);
            const link = document.createElement(projectId ? "a" : "span");
            link.className = "hero-image-link";
            if (projectId) {
              link.href = `project.html?work=${encodeURIComponent(projectId)}`;
              link.setAttribute("aria-label", `Open ${item.name || "project"}`);
            }
            const image = document.createElement("img");
            image.className = "hero-image-module";
            image.alt = item.name || "";
            applyResponsiveImage(image, item.image, "(max-width: 760px) 144px, 264px");
            link.appendChild(image);
            track.appendChild(link);
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
        const isWork = normalizedLabel === "work" || normalizedSublabel.includes("项目");
        link.href = isInfo ? "#about" : isContact ? "#contact" : "#projects";
        if (isInfo) {
          link.dataset.aboutToggle = "";
        }
        if (isContact) {
          link.dataset.contactToggle = "";
        }
        if (isWork) {
          link.dataset.workJump = "";
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
          if (!project.image) {
            card.classList.add("has-empty-media");
          }
          card.href = `project.html?work=${encodeURIComponent(project.id)}`;
          const video = project.hoverVideo
            ? `<video class="project-card-video" data-src="${escapeHtml(project.hoverVideo)}" muted playsinline loop preload="none"></video>`
            : "";
          card.innerHTML = `
            <span class="project-media">
              ${
                project.image
                  ? responsiveImageMarkup(project.image, project.title, "", "(max-width: 760px) 100vw, 33vw")
                  : `<span class="project-placeholder" aria-hidden="true">${escapeHtml(projectInitials(project))}</span>`
              }
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
              if (!videoNode.src) {
                videoNode.src = videoNode.dataset.src || "";
              }
              videoNode.play().catch(() => {});
            });
            card.addEventListener("mouseleave", () => {
              videoNode.pause();
              videoNode.currentTime = 0;
            });
          }
          activateMobileImages(card);
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

  function setupWorkJump() {
    const projects = document.querySelector("#projects");
    const projectGrid = document.querySelector("[data-project-grid]");
    const header = document.querySelector(".site-header");
    const projectTicker = document.querySelector(".ticker-projects");
    const toggles = document.querySelectorAll("[data-work-jump]");
    if (!projects || !projectGrid || !toggles.length) return;

    function jumpToWork() {
      const headerHeight = header?.offsetHeight || 0;
      const tickerHeight = projectTicker?.offsetHeight || 0;
      const top = window.scrollY + projectGrid.getBoundingClientRect().top - headerHeight - tickerHeight - 24;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }

    toggles.forEach((toggle) => {
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        history.replaceState(null, "", "#projects");
        jumpToWork();
      });
    });

    if (window.location.hash === "#projects") {
      window.setTimeout(jumpToWork, 80);
    }
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

  function setupDetailMediaReveal() {
    const mediaItems = document.querySelectorAll(".detail-gallery-media");
    if (!mediaItems.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      mediaItems.forEach((media) => media.classList.add("is-visible"));
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
        threshold: 0.18,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    mediaItems.forEach((media, index) => {
      media.style.transitionDelay = `${Math.min(index, 3) * 80}ms`;
      observer.observe(media);
    });
  }

  function setupDetailLightbox() {
    const images = document.querySelectorAll("img.detail-gallery-media");
    if (!images.length) return;

    const lightbox = document.createElement("div");
    lightbox.className = "detail-lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML = `
      <button class="detail-lightbox-close" type="button" aria-label="Close image preview">Close</button>
      <img class="detail-lightbox-image" alt="" />
    `;
    document.body.appendChild(lightbox);

    const preview = lightbox.querySelector(".detail-lightbox-image");
    const close = lightbox.querySelector(".detail-lightbox-close");

    function setOpen(open) {
      lightbox.classList.toggle("is-open", open);
      lightbox.setAttribute("aria-hidden", open ? "false" : "true");
      document.body.classList.toggle("detail-lightbox-open", open);
    }

    images.forEach((image) => {
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.setAttribute("aria-label", "Open image preview");
      image.addEventListener("click", () => {
        preview.src = image.dataset.fullSrc || image.src;
        preview.alt = image.alt || "";
        setOpen(true);
      });
      image.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          image.click();
        }
      });
    });

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        setOpen(false);
      }
    });
    close.addEventListener("click", () => setOpen(false));
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
        setOpen(false);
      }
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
      text("[data-detail-project-title]", project.title || "");
      text("[data-detail-category]", project.category || "");
      text("[data-detail-client]", project.client || "");
      const detailCopy = splitDetailDescription(project.detailDescription || project.summary || "");
      text("[data-detail-description-en]", detailCopy.en.join("\n"));
      text("[data-detail-description-zh]", detailCopy.zh.join("\n"));

      const gallery = document.querySelector("[data-detail-gallery]");
      if (gallery) {
        gallery.innerHTML = "";
        const defaultDetailImage = "assets/project-detail-hero.png";
        const sourceImages = Array.isArray(project.detailImages) && project.detailImages.length
          ? project.detailImages
          : [project.detailBackground];
        const images = sourceImages
          .map(normalizeDetailImage)
          .filter((image) => image && image.src && image.src !== defaultDetailImage);
        const uniqueImages = [];
        const seenImages = new Set();
        images.forEach((image) => {
          const key = `${image.src}::${image.width}`;
          if (!seenImages.has(key)) {
            seenImages.add(key);
            uniqueImages.push(image);
          }
        });
        template.classList.toggle("has-empty-gallery", !uniqueImages.length);
        uniqueImages.forEach((image) => {
          const media = createMediaNode(image.src, project.title, `detail-gallery-media detail-gallery-media-${image.width}`);
          if (media) {
            gallery.appendChild(media);
          }
        });
        if (!uniqueImages.length) {
          const empty = document.createElement("div");
          empty.className = "detail-empty";
          empty.innerHTML = `<span>${escapeHtml(projectInitials(project))}</span><p>Project images coming soon.</p>`;
          gallery.appendChild(empty);
        }
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
    const photo = document.querySelector("[data-about-photo]");
    if (!grid || !data.about) return;
    grid.innerHTML = "";
    if (title) {
      title.textContent = data.about.title || "About ...";
    }
    if (photo) {
      const photoSrc = data.about.photo || "assets/about-photo.jpg";
      photo.alt = "ego portrait";
      applyResponsiveImage(photo, photoSrc, "(max-width: 760px) 132px, 420px");
    }
    const columns = clone(data.about.columns || []);
    const experienceHeading = "professional experience";
    let experienceBlock = null;
    columns.forEach((column) => {
      const index = column.findIndex((block) => String(block.heading || "").trim().toLowerCase() === experienceHeading);
      if (index >= 0) {
        experienceBlock = column.splice(index, 1)[0];
      }
    });
    if (experienceBlock) {
      columns[0] = columns[0] || [];
      columns[0].push(experienceBlock);
    }
    columns.forEach((column) => {
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
  setupWorkJump();
  setupProjectReveal();
  setupDetailMediaReveal();
  setupDetailLightbox();
  setupAboutPanel();
  setupContactPanel();
})();
