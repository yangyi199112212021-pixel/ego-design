(function () {
  const form = document.querySelector("#admin-form");
  const navList = document.querySelector("[data-nav-list]");
  const tagList = document.querySelector("[data-tag-list]");
  const aboutList = document.querySelector("[data-about-list]");
  const heroImageList = document.querySelector("[data-hero-image-list]");
  const groupLogoList = document.querySelector("[data-group-logo-list]");
  const projectList = document.querySelector("[data-project-list]");
  const projectJump = document.querySelector("[data-project-jump]");
  const status = document.querySelector("[data-status]");
  let data = PortfolioData.getData();

  function setStatus(message) {
    status.textContent = message;
  }

  function input(name) {
    return form.elements[name];
  }

  function fillGlobal() {
    input("siteTitle").value = data.siteTitle;
    input("projectsTitleStrong").value = data.projectsTitleStrong;
    input("projectsTitleLight").value = data.projectsTitleLight;
    input("logoUrl").value = data.logoUrl;
    input("aboutTitle").value = data.about?.title || "About ...";
  }

  function addNavRow(item = { label: "", sublabel: "" }) {
    const row = document.querySelector("#nav-template").content.firstElementChild.cloneNode(true);
    row.querySelector('[data-key="label"]').value = item.label || "";
    row.querySelector('[data-key="sublabel"]').value = item.sublabel || "";
    row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
    navList.appendChild(row);
  }

  function addTagRow(tag = "") {
    const row = document.querySelector("#tag-template").content.firstElementChild.cloneNode(true);
    row.querySelector('[data-key="tag"]').value = tag;
    row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
    tagList.appendChild(row);
  }

  function addAboutBlock(block = { column: 0, heading: "", body: "" }) {
    const editor = document.querySelector("#about-template").content.firstElementChild.cloneNode(true);
    editor.querySelector('[data-key="column"]').value = String(block.column || 0);
    editor.querySelector('[data-key="heading"]').value = block.heading || "";
    editor.querySelector('[data-key="body"]').value = block.body || "";
    function syncTitle() {
      editor.querySelector("[data-about-name]").textContent =
        editor.querySelector('[data-key="heading"]').value || "信息区块";
    }
    editor.querySelector('[data-key="heading"]').addEventListener("input", syncTitle);
    editor.querySelector("[data-remove-about-block]").addEventListener("click", () => editor.remove());
    syncTitle();
    aboutList.appendChild(editor);
  }

  async function saveUpload(dataUrl) {
    if (window.location.protocol === "file:") {
      return dataUrl;
    }
    const response = await fetch("/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl })
    });
    if (!response.ok) {
      throw new Error("Upload failed");
    }
    const result = await response.json();
    return result.path;
  }

  async function saveDataFile(nextData) {
    if (window.location.protocol === "file:") {
      return false;
    }
    const response = await fetch("/save-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextData)
    });
    if (!response.ok) {
      throw new Error("Save data failed");
    }
    return true;
  }

  function readRawUpload(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      saveUpload(reader.result)
        .then((path) => callback(path, file))
        .catch(() => setStatus("上传失败：视频可能太大，建议使用压缩后的 MP4/WebM。"));
    });
    reader.readAsDataURL(file);
  }

  function readUpload(file, callback, options = {}) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("请选择图片文件。");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const original = reader.result;
      const image = new Image();
      image.addEventListener("load", () => {
        const maxSize = options.padToSquare ? 1200 : 1800;
        const padding = options.padToSquare ? 120 : 0;
        const availableSize = maxSize - padding * 2;
        const scale = Math.min(1, availableSize / Math.max(image.naturalWidth, image.naturalHeight));
        const drawnWidth = Math.max(1, Math.round(image.naturalWidth * scale));
        const drawnHeight = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = options.padToSquare ? maxSize : drawnWidth;
        canvas.height = options.padToSquare ? maxSize : drawnHeight;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(
          image,
          options.padToSquare ? Math.round((maxSize - drawnWidth) / 2) : 0,
          options.padToSquare ? Math.round((maxSize - drawnHeight) / 2) : 0,
          drawnWidth,
          drawnHeight
        );
        const compressed = canvas.toDataURL("image/webp", 0.82);
        saveUpload(compressed)
          .then((path) => callback(path, file))
          .catch(() => {
            setStatus("上传失败：请确认已通过本地服务器打开后台，或换更小的图片。");
          });
      });
      image.addEventListener("error", () => {
        saveUpload(original)
          .then((path) => callback(path, file))
          .catch(() => setStatus("上传失败：请确认已通过本地服务器打开后台，或换更小的图片。"));
      });
      image.src = original;
    });
    reader.readAsDataURL(file);
  }

  function uploadMessage(file) {
    const size = file ? ` ${(file.size / 1024 / 1024).toFixed(1)}MB` : "";
    return window.location.protocol === "file:"
      ? `图片已上传并压缩${size}，点击保存后生效。`
      : `图片已保存到 assets/uploads${size}，点击保存后生效。`;
  }

  function addHeroImage(item) {
    const defaults = {
      id: `hero-image-${Date.now()}`,
      name: "New image",
      projectId: "",
      image: "assets/hero-film.png"
    };
    const imageItem = { ...defaults, ...item };
    const editor = document.querySelector("#hero-image-template").content.firstElementChild.cloneNode(true);
    const preview = editor.querySelector("[data-preview-img]");

    function syncPreview() {
      const imageInput = editor.querySelector('[data-key="image"]');
      const nameInput = editor.querySelector('[data-key="name"]');
      preview.src = imageInput.value;
      preview.alt = nameInput.value;
      editor.querySelector("[data-image-name]").textContent = nameInput.value || imageInput.value || "图片模块";
    }

    editor.querySelectorAll("[data-key]").forEach((field) => {
      const key = field.dataset.key;
      field.value = imageItem[key] ?? "";
      field.addEventListener("input", syncPreview);
    });
    editor.querySelector("[data-upload]").addEventListener("change", (event) => {
      readUpload(event.target.files[0], (result, file) => {
        editor.querySelector('[data-key="image"]').value = result;
        syncPreview();
        setStatus(uploadMessage(file));
      }, { padToSquare: true });
    });
    editor.querySelector("[data-remove-hero-image]").addEventListener("click", () => editor.remove());
    syncPreview();
    heroImageList.appendChild(editor);
  }

  function addGroupLogo(item = { group: "", image: "" }) {
    const row = document.querySelector("#group-logo-template").content.firstElementChild.cloneNode(true);
    row.querySelector('[data-key="group"]').value = item.group || "";
    row.querySelector('[data-key="image"]').value = item.image || "";
    row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
    row.querySelector("[data-group-logo-upload]").addEventListener("change", (event) => {
      readUpload(event.target.files[0], (result, file) => {
        row.querySelector('[data-key="image"]').value = result;
        setStatus(uploadMessage(file));
      }, { padToSquare: false });
    });
    groupLogoList.appendChild(row);
  }

  function addDetailImageRow(editor, imagePath = "") {
    const row = document.querySelector("#detail-image-template").content.firstElementChild.cloneNode(true);
    const pathInput = row.querySelector("[data-detail-image-path]");
    pathInput.value = imagePath || "";
    row.querySelector("[data-detail-image-upload]").addEventListener("change", (event) => {
      readUpload(event.target.files[0], (result, file) => {
        pathInput.value = result;
        setStatus(uploadMessage(file));
      }, { padToSquare: false });
    });
    row.querySelector("[data-remove-detail-image]").addEventListener("click", () => row.remove());
    editor.querySelector("[data-detail-image-list]").appendChild(row);
  }

  function projectEditors() {
    return Array.from(projectList.querySelectorAll(".project-editor"));
  }

  function projectLabel(editor, index) {
    const title = editor.querySelector('[data-key="title"]')?.value.trim();
    const id = editor.querySelector('[data-key="id"]')?.value.trim();
    const group = editor.querySelector('[data-key="group"]')?.value.trim();
    const name = title || id || `项目 ${index + 1}`;
    return group ? `${index + 1}. ${name} / ${group}` : `${index + 1}. ${name}`;
  }

  function refreshProjectJump(selectedEditor) {
    if (!projectJump) return;
    const editors = projectEditors();
    const selectedIndex = selectedEditor ? editors.indexOf(selectedEditor) : Number(projectJump.value);
    projectJump.innerHTML = '<option value="">选择项目</option>';
    editors.forEach((editor, index) => {
      editor.dataset.projectIndex = String(index);
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = projectLabel(editor, index);
      projectJump.appendChild(option);
    });
    if (selectedIndex >= 0 && selectedIndex < editors.length) {
      projectJump.value = String(selectedIndex);
    }
  }

  function scrollToProject(editor) {
    if (!editor) return;
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
    editor.classList.add("is-targeted");
    window.setTimeout(() => editor.classList.remove("is-targeted"), 1200);
  }

  function addProject(project, options = {}) {
    const defaults = {
      id: `project-${Date.now()}`,
      group: "Haagen-Dazs",
      title: "New Project",
      category: "Visual Identity",
      client: "Client",
      year: "2026",
      date: "2026.5.21",
      summary: "",
      image: "assets/card-1.png",
      hoverVideo: "",
      detailBackground: "",
      detailImages: [],
      detailTitleStrong: data.projectsTitleStrong,
      detailTitleLight: data.projectsTitleLight,
      detailKicker: "PLUSH TOY",
      detailDescription: "",
      showDetailText: true
    };
    const item = { ...defaults, ...project };
    const editor = document.querySelector("#project-template").content.firstElementChild.cloneNode(true);
    editor.querySelector("[data-project-name]").textContent = item.title || item.id;
    const initialDetailImages = Array.isArray(item.detailImages) && item.detailImages.length
      ? item.detailImages
      : [item.detailBackground].filter(Boolean);
    initialDetailImages.forEach((imagePath) => addDetailImageRow(editor, imagePath));
    editor.querySelector("[data-add-detail-image]").addEventListener("click", () => addDetailImageRow(editor));
    editor.querySelectorAll("[data-key]").forEach((field) => {
      const key = field.dataset.key;
      if (field.type === "checkbox") {
        field.checked = Boolean(item[key]);
      } else {
        field.value = item[key] || "";
      }
      field.addEventListener("input", () => {
        editor.querySelector("[data-project-name]").textContent =
          editor.querySelector('[data-key="title"]').value || editor.querySelector('[data-key="id"]').value || "项目";
        refreshProjectJump(editor);
      });
    });
    editor.querySelectorAll("[data-project-upload]").forEach((upload) => {
      upload.addEventListener("change", (event) => {
        const targetKey = upload.dataset.projectUpload;
        readUpload(event.target.files[0], (result, file) => {
          editor.querySelector(`[data-key="${targetKey}"]`).value = result;
          setStatus(uploadMessage(file));
        }, { padToSquare: false });
      });
    });
    editor.querySelectorAll("[data-video-upload]").forEach((upload) => {
      upload.addEventListener("change", (event) => {
        const targetKey = upload.dataset.videoUpload;
        const file = event.target.files[0];
        if (file && !file.type.startsWith("video/")) {
          setStatus("请选择视频文件。");
          return;
        }
        readRawUpload(file, (result, uploadedFile) => {
          editor.querySelector(`[data-key="${targetKey}"]`).value = result;
          const size = uploadedFile ? ` ${(uploadedFile.size / 1024 / 1024).toFixed(1)}MB` : "";
          setStatus(`视频已保存到 assets/uploads${size}，点击保存后生效。`);
        });
      });
    });
    editor.querySelector("[data-remove-project]").addEventListener("click", () => {
      editor.remove();
      refreshProjectJump();
    });
    projectList.appendChild(editor);
    refreshProjectJump(editor);
    if (options.scroll) {
      scrollToProject(editor);
    }
  }

  function render() {
    fillGlobal();
    navList.innerHTML = "";
    tagList.innerHTML = "";
    aboutList.innerHTML = "";
    heroImageList.innerHTML = "";
    groupLogoList.innerHTML = "";
    projectList.innerHTML = "";
    data.navPills.forEach(addNavRow);
    data.tags.forEach(addTagRow);
    (data.about?.columns || []).forEach((column, columnIndex) => {
      column.forEach((block) => addAboutBlock({ ...block, column: columnIndex }));
    });
    data.heroImages.forEach(addHeroImage);
    (data.groupLogos || []).forEach(addGroupLogo);
    data.projects.forEach(addProject);
    refreshProjectJump();
    if (projectJump) {
      projectJump.value = "";
    }
  }

  function collect() {
    const next = {
      siteTitle: input("siteTitle").value.trim(),
      projectsTitleStrong: input("projectsTitleStrong").value.trim(),
      projectsTitleLight: input("projectsTitleLight").value.trim(),
      logoUrl: input("logoUrl").value.trim(),
      navPills: Array.from(navList.querySelectorAll(".repeat-row")).map((row) => ({
        label: row.querySelector('[data-key="label"]').value.trim(),
        sublabel: row.querySelector('[data-key="sublabel"]').value.trim()
      })),
      tags: Array.from(tagList.querySelectorAll(".repeat-row"))
        .map((row) => row.querySelector('[data-key="tag"]').value.trim())
        .filter(Boolean),
      about: {
        title: input("aboutTitle").value.trim(),
        columns: [[], []]
      },
      heroImages: Array.from(heroImageList.querySelectorAll(".image-editor")).map((editor) => ({
        id: editor.querySelector('[data-key="id"]').value.trim(),
        name: editor.querySelector('[data-key="name"]').value.trim(),
        projectId: editor.querySelector('[data-key="projectId"]').value.trim(),
        image: editor.querySelector('[data-key="image"]').value.trim()
      })),
      groupLogos: Array.from(groupLogoList.querySelectorAll(".group-logo-row")).map((row) => ({
        group: row.querySelector('[data-key="group"]').value.trim(),
        image: row.querySelector('[data-key="image"]').value.trim()
      })),
      projects: Array.from(projectList.querySelectorAll(".project-editor")).map((editor) => {
        const project = {};
        editor.querySelectorAll("[data-key]").forEach((field) => {
          const key = field.dataset.key;
          project[key] = field.type === "checkbox" ? field.checked : field.value.trim();
        });
        project.detailImages = Array.from(editor.querySelectorAll("[data-detail-image-path]"))
          .map((field) => field.value.trim())
          .filter(Boolean);
        if (!project.detailBackground && project.detailImages.length) {
          project.detailBackground = project.detailImages[0];
        }
        return project;
      })
    };
    Array.from(aboutList.querySelectorAll(".about-editor")).forEach((editor) => {
      const column = Number(editor.querySelector('[data-key="column"]').value) || 0;
      const block = {
        heading: editor.querySelector('[data-key="heading"]').value.trim(),
        body: editor.querySelector('[data-key="body"]').value.trim()
      };
      if (block.heading || block.body) {
        next.about.columns[column].push(block);
      }
    });
    next.navPills = next.navPills.filter((item) => item.label || item.sublabel);
    next.heroImages = next.heroImages.filter((item) => item.id && item.image);
    next.groupLogos = next.groupLogos.filter((item) => item.group && item.image);
    next.projects = next.projects.filter((project) => project.id && project.title);
    return next;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    data = collect();
    try {
      PortfolioData.saveData(data);
      const savedFile = await saveDataFile(data);
      setStatus(savedFile ? "已保存到 site-data.js。刷新首页或详情页即可看到更新。" : "已保存到当前浏览器。通过本地服务器打开后台可同步到文件。");
    } catch (error) {
      setStatus("保存失败：请确认本地服务器仍在运行，或减少已上传图片数量。");
    }
  });

  document.querySelector("[data-add-nav]").addEventListener("click", () => addNavRow());
  document.querySelector("[data-add-tag]").addEventListener("click", () => addTagRow());
  document.querySelector("[data-add-about-block]").addEventListener("click", () => addAboutBlock());
  document.querySelector("[data-add-hero-image]").addEventListener("click", () => addHeroImage());
  document.querySelector("[data-add-group-logo]").addEventListener("click", () => addGroupLogo());
  document.querySelector("[data-add-project]").addEventListener("click", () => addProject(undefined, { scroll: true }));

  projectJump?.addEventListener("change", () => {
    const index = Number(projectJump.value);
    scrollToProject(projectEditors()[index]);
  });

  document.querySelectorAll("[data-global-upload]").forEach((upload) => {
    upload.addEventListener("change", (event) => {
      const targetName = upload.dataset.globalUpload;
      readUpload(event.target.files[0], (result, file) => {
        input(targetName).value = result;
        setStatus(uploadMessage(file));
      }, { padToSquare: false });
    });
  });

  document.querySelector("[data-preview]").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  document.querySelector("[data-reset]").addEventListener("click", () => {
    const confirmed = window.confirm("确定恢复默认内容吗？当前后台保存的数据会被清除。");
    if (!confirmed) return;
    PortfolioData.resetData();
    data = PortfolioData.getData();
    render();
    setStatus("已恢复默认内容。");
  });

  render();
})();
