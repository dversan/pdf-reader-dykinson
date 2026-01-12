/* Copyright 2025 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class PDFBookmarkViewer {
  constructor(options) {
    this.container = options.container;
    this.eventBus = options.eventBus;
    this.linkService = options.linkService;
    this.l10n = options.l10n;

    this._bookmarks = [];
    this._currentPageNumber = 1;
    this.loadBookmarks();

    this._bindEvents();
    this.render();
  }

  loadBookmarks() {
    const stored = localStorage.getItem("pdfjs_bookmarks");
    if (stored) {
      try {
        this._bookmarks = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse bookmarks", e);
        this._bookmarks = [];
      }
    }
  }

  saveBookmarks() {
    localStorage.setItem("pdfjs_bookmarks", JSON.stringify(this._bookmarks));
    this.render();
  }

  _bindEvents() {
    this.eventBus._on("pagechanging", evt => {
      this._currentPageNumber = evt.pageNumber;
    });
  }

  addBookmark() {
    if (!this._currentPageNumber) {
      return;
    }
    this._showAddBookmarkDialog();
  }

  _showAddBookmarkDialog() {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog";

    const mainContainer = document.createElement("div");
    mainContainer.className = "mainContainer";

    const titleDiv = document.createElement("div");
    titleDiv.className = "title";
    const titleSpan = document.createElement("span");
    titleSpan.textContent = "Add Bookmark";
    titleDiv.append(titleSpan);
    mainContainer.append(titleDiv);

    const separator = document.createElement("div");
    separator.className = "dialogSeparator";
    mainContainer.append(separator);

    // Form logic
    const form = document.createElement("form");
    form.method = "dialog";
    form.style.marginTop = "10px";

    const inputLabel = document.createElement("label");
    inputLabel.textContent = "Name: ";
    inputLabel.style.display = "block";
    inputLabel.style.marginBottom = "5px";

    const input = document.createElement("input");
    input.type = "text";
    input.id = "addBookmarkTextInput"; // Added ID as requested
    input.className = "toolbarField";
    input.required = true;
    input.placeholder = "Enter bookmark name";
    input.style.width = "100%";
    input.style.boxSizing = "border-box"; // Fix padding issue
    inputLabel.append(input);
    form.append(inputLabel);

    const buttonsGroup = document.createElement("div");
    buttonsGroup.className = "dialogButtonsGroup";
    buttonsGroup.style.display = "flex";
    buttonsGroup.style.justifyContent = "flex-end"; // Right align buttons
    buttonsGroup.style.gap = "10px";

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.className = "secondaryButton";
    cancelButton.type = "button";
    cancelButton.onclick = () => {
      dialog.close();
    };

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.className = "primaryButton";
    saveButton.type = "submit";

    buttonsGroup.append(cancelButton);
    buttonsGroup.append(saveButton);
    form.append(buttonsGroup);

    mainContainer.append(form);
    dialog.append(mainContainer);
    document.body.append(dialog);

    dialog.showModal();

    // Keydown handler to match behaviors
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        // Form submit handled by listener below
      }
    });

    dialog.addEventListener("close", () => {
      dialog.remove();
    });

    form.addEventListener("submit", e => {
      const name = input.value;
      if (name) {
        this._saveNewBookmark(name);
      }
    });
  }

  _saveNewBookmark(name) {
    const label = `${name} (pg. ${this._currentPageNumber})`;
    const newBookmark = {
      page: this._currentPageNumber,
      label,
      timestamp: Date.now(),
    };

    this._bookmarks.push(newBookmark);
    this.saveBookmarks();
  }

  removeBookmark(index) {
    this._bookmarks.splice(index, 1);
    this.saveBookmarks();
  }

  reset() {
    this._bookmarks = [];
    this.loadBookmarks();
    this.render();
  }

  render() {
    this.container.textContent = "";

    // Add "Add Bookmark" button
    const addButtonDiv = document.createElement("div");
    addButtonDiv.className = "row";
    addButtonDiv.style.padding = "10px";
    addButtonDiv.style.borderBottom = "1px solid var(--sidebar-item-bg-color)";
    addButtonDiv.style.display = "flex";
    addButtonDiv.style.gap = "10px";

    const addButton = document.createElement("button");
    addButton.id = "addBookmarkButton";
    addButton.textContent = "Add";
    addButton.className = "toolbarButton labeled";
    addButton.style.flex = "1";
    addButton.style.cursor = "pointer";
    addButton.onclick = () => this.addBookmark();

    const autoGenButton = document.createElement("button");
    autoGenButton.id = "autoGenButton";
    autoGenButton.textContent = "Auto-Gen";
    autoGenButton.className = "toolbarButton labeled";
    autoGenButton.style.flex = "1";
    autoGenButton.style.cursor = "pointer";
    autoGenButton.onclick = () => this.autoGenerateBookmarks();

    addButtonDiv.append(addButton);
    addButtonDiv.append(autoGenButton);
    this.container.append(addButtonDiv);

    if (this._bookmarks.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.textContent = "No bookmarks yet.";
      emptyDiv.style.padding = "10px";
      emptyDiv.style.color = "var(--text-color)";
      emptyDiv.style.opacity = "0.7";
      this.container.append(emptyDiv);
      return;
    }

    const listDiv = document.createElement("div");
    listDiv.className = "bookmarksList";

    const counters = [0];
    let lastLevel = 1;

    this._bookmarks.forEach((bm, index) => {
      // ... rendering logic remains ...
      const itemDiv = document.createElement("div");
      itemDiv.className = "treeItem";
      itemDiv.style.display = "flex";
      itemDiv.style.justifyContent = "space-between";
      itemDiv.style.alignItems = "center";
      itemDiv.style.padding = "5px 10px";

      // Calculate hierarchical number
      const level = bm.level || 1;

      if (level > lastLevel) {
        for (let i = 0; i < level - lastLevel; i++) {
          counters.push(0);
        }
      } else if (level < lastLevel) {
        for (let i = 0; i < lastLevel - level; i++) {
          counters.pop();
        }
      }
      counters[counters.length - 1]++;
      lastLevel = level;

      const numbering = counters.join(".") + ".";

      itemDiv.style.paddingLeft = `${(level - 1) * 15 + 10}px`;
      itemDiv.style.cursor = "pointer";

      // Link Container (Flex for layout)
      const link = document.createElement("a");
      link.href = "#";
      link.style.flexGrow = "1";
      link.style.display = "flex";
      link.style.alignItems = "flex-end"; // Align dots to bottom/last line
      link.style.textDecoration = "none";
      link.style.color = "var(--text-color)";
      link.style.width = "100%"; // Ensure it fills space
      link.onclick = e => {
        e.preventDefault();
        this.linkService.page = bm.page;
      };

      // 1. Title Label
      const titleSpan = document.createElement("span");
      titleSpan.textContent = `${numbering} ${bm.label}`;
      titleSpan.style.marginRight = "4px";
      // Allow wrapping if needed, but flex handling usually does this

      // 2. Dots Leader
      const dotsSpan = document.createElement("span");
      dotsSpan.style.flexGrow = "1"; // Take up remaining space
      dotsSpan.style.borderBottom = "1px dotted currentColor";
      dotsSpan.style.marginBottom = "5px"; // Visual adjustment for baseline
      dotsSpan.style.opacity = "0.5";
      dotsSpan.style.marginRight = "4px";
      dotsSpan.style.minWidth = "20px"; // Ensure at least some dots visible

      // 3. Page Number
      const pageSpan = document.createElement("span");
      pageSpan.textContent = bm.page;
      pageSpan.style.fontWeight = "normal";

      link.append(titleSpan);
      link.append(dotsSpan);
      link.append(pageSpan);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "×";
      deleteBtn.style.background = "none";
      deleteBtn.style.border = "none";
      deleteBtn.style.color = "var(--text-color)";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.style.fontSize = "16px";
      deleteBtn.style.marginLeft = "8px";
      deleteBtn.onclick = e => {
        e.stopPropagation(); // prevent navigation
        this.removeBookmark(index);
      };

      itemDiv.append(link);
      itemDiv.append(deleteBtn);
      listDiv.append(itemDiv);
    });

    this.container.append(listDiv);
  }

  async autoGenerateBookmarks() {
    // eslint-disable-next-line no-alert
    if (!window.confirm("This will replace existing bookmarks. Continue?")) {
      return;
    }

    try {
      const loadingDiv = document.createElement("div");
      loadingDiv.textContent = "Analyzing document... This may take a moment.";
      loadingDiv.style.padding = "10px";
      loadingDiv.style.fontStyle = "italic";
      loadingDiv.style.color = "var(--text-color)";
      this.container.prepend(loadingDiv);

      // Wait for next frame to show loading
      await new Promise(resolve => {
        setTimeout(resolve, 0);
      });

      const pdfDocument = this.linkService.pdfDocument;
      const numPages = pdfDocument.numPages;
      const pagesText = [];

      // 1. Extract all text and styles.
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const content = await page.getTextContent();
        pagesText.push({ pageNumber: i, content });
      }

      const bookmarks = this._analyzeAndGenerate(pagesText);

      this._bookmarks = bookmarks;
      this.saveBookmarks();

      loadingDiv.remove();
    } catch (e) {
      console.error("Error generating bookmarks:", e);
      // eslint-disable-next-line no-alert
      window.alert("Failed to generate bookmarks.");
    }
  }

  _analyzeAndGenerate(pagesText) {
    // 1. Font Statistics
    const bodyHeight = this._calculateBodyHeight(pagesText);

    // 2. Identify Headers
    let candidates = [];
    const explicitHeaderRegex =
      /^(Chapter|Capítulo|Parte|Lección|Sección|Prólogo|Índice|Epílogo|\d+\.|[IVXLCDM]+\.)/i;

    pagesText.forEach(page => {
      const { items, styles } = page.content;

      // Group by Y (lines)
      const lines = {};
      items.forEach(item => {
        const y = Math.round(item.transform[5]);
        if (!lines[y]) {
          lines[y] = [];
        }
        lines[y].push(item);
      });

      const sortedY = Object.keys(lines).sort((a, b) => b - a);

      sortedY.forEach(y => {
        const lineItems = lines[y].sort(
          (a, b) => a.transform[4] - b.transform[4]
        );

        const firstItem = lineItems[0];
        let height = Math.abs(firstItem.transform[3]);

        // Detect Drop Cap: If first char is significantly larger than body,
        // but subsequent text is body-sized, treat the whole line as body size.
        if (lineItems.length > 1) {
          const secondItem = lineItems[1];
          const secondHeight = Math.abs(secondItem.transform[3]);
          const firstRounded = Math.round(height * 2) / 2;
          const secondRounded = Math.round(secondHeight * 2) / 2;

          if (
            firstRounded > bodyHeight * 1.2 &&
            secondRounded <= bodyHeight * 1.1
          ) {
            height = secondHeight;
          }
        }

        const roundedHeight = Math.round(height * 2) / 2;
        const fontObj = styles[firstItem.fontName] || {};

        // Extract text with smart spacing and accent fixing
        const text = this._extractLineText(lineItems);

        // Skip empty, short noise, or purely numeric page numbers (unless it looks like "1." header)
        // REFINED: Only discard short text if it looks like body text (same height).
        // This preserves short headers like "I", "IV", "1.", etc.
        const isBodySize = roundedHeight === bodyHeight;

        if (
          !text ||
          (text.length < 3 && isBodySize) ||
          (/^\d+$/.test(text) && !text.endsWith("."))
        ) {
          return;
        }

        const isBold = fontObj.fontFamily
          ? fontObj.fontFamily.toLowerCase().includes("bold") ||
            fontObj.fontWeight >= 700
          : false;

        // HEURISTICS
        const isLarger = roundedHeight > bodyHeight * 1.1;
        const isBoldHeader = isBold && roundedHeight >= bodyHeight;

        // Strictness: Explicit headers must start with a Capital or Digit
        // This prevents "parte de..." from matching "Parte".
        const startsWithCapOrDigit = /^[A-Z0-9¡¿"]/.test(text);
        const isExplicit =
          explicitHeaderRegex.test(text) &&
          startsWithCapOrDigit &&
          roundedHeight >= bodyHeight * 0.9;

        const isAllCaps =
          text === text.toUpperCase() &&
          /[A-Z]/.test(text) &&
          text.length > 4 &&
          roundedHeight >= bodyHeight;

        if (isLarger || isBoldHeader || isExplicit || isAllCaps) {
          candidates.push({
            text,
            page: page.pageNumber,
            height: roundedHeight,
            weight: isBold ? "bold" : "normal",
            isExplicit,
          });
        }
      });
    });

    // 3. Merge Multi-line Headers
    candidates = this._mergeCandidates(candidates);

    // 4. Hierarchy Construction
    return this._assignLevels(candidates);
  }

  _calculateBodyHeight(pagesText) {
    const fontStats = {};
    pagesText.forEach(page => {
      page.content.items.forEach(item => {
        const height = Math.abs(item.transform[3]);
        const roundedHeight = Math.round(height * 2) / 2;
        const key = roundedHeight;
        if (!fontStats[key]) {
          fontStats[key] = { count: 0, height: roundedHeight };
        }
        fontStats[key].count += item.str.length;
      });
    });

    let bodyHeight = 0;
    let maxCount = 0;
    Object.values(fontStats).forEach(stat => {
      if (stat.count > maxCount) {
        maxCount = stat.count;
        bodyHeight = stat.height;
      }
    });
    return bodyHeight;
  }

  _extractLineText(lineItems) {
    let text = "";
    let lastXEnd = null;

    lineItems.forEach(item => {
      // Check for combining diacritics
      const isCombining = /^[\u0300-\u036f]/.test(item.str);

      if (lastXEnd !== null && !isCombining) {
        const x = item.transform[4];
        const gap = x - lastXEnd;
        const fontSize = Math.abs(item.transform[0] || item.transform[3] || 10);

        // Add space relative to font size
        if (gap > fontSize * 0.2) {
          text += " ";
        }
      }
      text += item.str;
      lastXEnd = item.transform[4] + (item.width || 0);
    });

    // Fix spacing acute (U+00B4) before vowels
    const accentMap = {
      a: "á",
      e: "é",
      i: "í",
      o: "ó",
      u: "ú",
      A: "Á",
      E: "É",
      I: "Í",
      O: "Ó",
      U: "Ú",
    };
    text = text.replaceAll(
      /´\s*([aeiouAEIOU])/g,
      (match, char) => accentMap[char] || match
    );

    // Cleanup other spaces before combining marks
    text = text.replaceAll(/\s+([\u0300-\u036f])/g, "$1");

    return text.trim().normalize("NFKC");
  }

  _mergeCandidates(candidates) {
    if (candidates.length === 0) {
      return [];
    }

    const merged = [candidates[0]];
    for (let i = 1; i < candidates.length; i++) {
      const prev = merged.at(-1);
      const curr = candidates[i];

      const isNextLine = curr.page === prev.page || curr.page === prev.page + 1;
      const sameStyle =
        curr.height === prev.height && curr.weight === prev.weight;
      const startsLower =
        /^[a-z]/.test(curr.text) || /^[áéíóúñ]/.test(curr.text);
      const prevContinues = !/[.?!]$/.test(prev.text);

      const isExplicitNew = curr.isExplicit;

      if (
        isNextLine &&
        sameStyle &&
        !isExplicitNew &&
        (startsLower || prevContinues)
      ) {
        prev.text += " " + curr.text;
      } else {
        merged.push(curr);
      }
    }
    return merged;
  }

  _assignLevels(candidates) {
    const distinctHeights = [...new Set(candidates.map(c => c.height))];
    distinctHeights.sort((a, b) => b - a);

    const sizeLevelMap = {};
    const MAX_LEVEL = 4;
    distinctHeights.forEach((h, index) => {
      sizeLevelMap[h] = Math.min(index + 1, MAX_LEVEL);
    });

    return candidates.map(c => {
      let level = sizeLevelMap[c.height] || MAX_LEVEL;

      // Numbering-based hierarchy adjustments
      if (/^\d+\.\d+(\.|$)/.test(c.text)) {
        level = Math.max(level, 2);
        if (/^\d+\.\d+\.\d+/.test(c.text)) {
          level = Math.max(level, 3);
        }
      }

      return {
        label: c.text,
        page: c.page,
        level,
        timestamp: Date.now(),
      };
    });
  }
}

export { PDFBookmarkViewer };
