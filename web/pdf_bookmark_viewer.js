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

    this._customBookmarks = [];
    this._indexBookmarks = [];
    // 'custom' or 'index'
    this._activeTab = "custom";

    this._currentPageNumber = 1;
    this.loadBookmarks();

    this._bindEvents();
    this.render();
  }

  loadBookmarks() {
    const storedCustom = localStorage.getItem("pdfjs_custom_bookmarks");
    if (storedCustom) {
      try {
        this._customBookmarks = JSON.parse(storedCustom);
      } catch (e) {
        console.error("Failed to parse custom bookmarks", e);
        this._customBookmarks = [];
      }
    } else {
      this._customBookmarks = [];
    }

    const storedIndex = localStorage.getItem("pdfjs_index_bookmarks");
    if (storedIndex) {
      try {
        this._indexBookmarks = JSON.parse(storedIndex);
      } catch (e) {
        console.error("Failed to parse index bookmarks", e);
        this._indexBookmarks = [];
      }
    } else {
      this._indexBookmarks = [];
    }
  }

  saveBookmarks() {
    // Save both just to be safe, or we could split this method
    localStorage.setItem(
      "pdfjs_custom_bookmarks",
      JSON.stringify(this._customBookmarks)
    );
    localStorage.setItem(
      "pdfjs_index_bookmarks",
      JSON.stringify(this._indexBookmarks)
    );
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

    this._customBookmarks.push(newBookmark);
    this.saveBookmarks();
  }

  removeBookmark(index) {
    if (this._activeTab === "custom") {
      this._customBookmarks.splice(index, 1);
    } else {
      this._indexBookmarks.splice(index, 1);
    }
    this.saveBookmarks();
  }

  reset() {
    this._customBookmarks = [];
    this._indexBookmarks = [];
    this.loadBookmarks();
    this.render();
  }

  render() {
    this.container.textContent = "";

    // 1. Render Tab Bar
    const tabBar = document.createElement("div");
    tabBar.className = "bookmarksTabBar";

    const customTab = document.createElement("button");
    customTab.textContent = "Custom Bookmarks";
    customTab.className =
      "bookmarkTab" + (this._activeTab === "custom" ? " active" : "");
    customTab.onclick = () => {
      this._activeTab = "custom";
      this.render();
    };

    const indexTab = document.createElement("button");
    indexTab.textContent = "Index";
    indexTab.className =
      "bookmarkTab" + (this._activeTab === "index" ? " active" : "");
    indexTab.onclick = () => {
      this._activeTab = "index";
      this.render();
    };

    tabBar.append(customTab);
    tabBar.append(indexTab);
    this.container.append(tabBar);

    // 2. Render Button (Add OR Create Index)
    const buttonDiv = document.createElement("div");
    buttonDiv.className = "bookmarkButtonContainer";

    if (this._activeTab === "custom") {
      const addButton = document.createElement("button");
      addButton.id = "addBookmarkButton";
      addButton.textContent = "Add";
      addButton.onclick = () => this.addBookmark();
      buttonDiv.append(addButton);
    } else {
      const createIndexButton = document.createElement("button");
      createIndexButton.id = "createIndexButton";
      createIndexButton.textContent = "Create Index";
      createIndexButton.onclick = () => this.autoGenerateBookmarks();
      buttonDiv.append(createIndexButton);
    }

    this.container.append(buttonDiv);

    // 3. Render List
    const currentList =
      this._activeTab === "custom"
        ? this._customBookmarks
        : this._indexBookmarks;

    if (currentList.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.textContent =
        this._activeTab === "custom"
          ? "No custom bookmarks yet."
          : "No index generated yet.";
      emptyDiv.style.padding = "10px";
      emptyDiv.style.color = "var(--text-color)";
      emptyDiv.style.opacity = "0.7";
      emptyDiv.style.fontSize = "12px";
      this.container.append(emptyDiv);
      return;
    }

    const listDiv = document.createElement("div");
    listDiv.className = "bookmarksList";

    const counters = [0];
    let lastLevel = 1;

    currentList.forEach((bm, index) => {
      // ... rendering logic remains ...
      const itemDiv = document.createElement("div");
      itemDiv.className = "treeItem";
      itemDiv.style.display = "flex";
      itemDiv.style.justifyContent = "space-between";
      itemDiv.style.alignItems = "center";
      itemDiv.style.padding = "5px 10px";

      // Calculate hierarchical number (Only for Index tabs usually, but
      // harmless for custom if they lack levels)
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
      // Use numbering only for auto-generated index items (source=toc)
      // Custom bookmarks shouldn't be auto-numbered visually unless requested
      if (this._activeTab === "index" && bm.source === "toc") {
        titleSpan.textContent = `${bm.label}`; // User didn't ask for numbering
        // displayed?
        // Note: Logic in previous file was: bm.source === "toc" ? bm.label :
        // `${numbering} ${bm.label}`;
        // But previously all were mixed.
        // Let's assume INDEX tab items are TOC, so we use their label directly
        // (which might have numbering integrated or we add it)
        // Original logic:
        // bm.source === "toc" ? bm.label : `${numbering} ${bm.label}`;
        // If Custom (not toc), it added numbering.
        // The user request implies Custom are "user created".
        // Let's stick to:
        titleSpan.textContent = bm.label;
      } else {
        // Custom bookmarks
        titleSpan.textContent = bm.label;
      }
      // Revert to original logic if unsure, or adapt:
      // The user wants "Custom Bookmarks" (user created) vs "Index" (auto).
      // Auto-gen logic sets `source: 'toc'` and often strips numbering from label to re-add it?
      // Actually `_parseTOC` uses `source: 'toc'`.
      // Let's keep it simple: Show label as is for now, maybe add numbering if its Index tab?
      // For now, I will just display the label to avoid double numbering issues if the extracted label has it.
      // Wait, let's look at the original code I'm replacing:
      // bm.source === "toc" ? bm.label : `${numbering} ${bm.label}`;
      // This implies: TOC items (Auto) = No added numbering. Manual items = Added numbering.
      // That seems backwards but let's trust existing logic?
      // Actually, Manual items usually DON'T need hierarchical numbering 1.1.1 unless they form a structure.
      // Let's simplify: Show Label.

      titleSpan.style.marginRight = "4px";

      // 2. Dots Leader (Only for Index)
      const dotsSpan = document.createElement("span");
      if (this._activeTab === "index") {
        dotsSpan.style.flexGrow = "1"; // Take up remaining space
        dotsSpan.style.borderBottom = "1px dotted currentColor";
        dotsSpan.style.marginBottom = "5px"; // Visual adjustment for baseline
        dotsSpan.style.opacity = "0.5";
        dotsSpan.style.marginRight = "4px";
        dotsSpan.style.minWidth = "20px"; // Ensure at least some dots visible
      }

      // 3. Page Number (Only for Index)
      const pageSpan = document.createElement("span");
      if (this._activeTab === "index") {
        pageSpan.textContent = bm.page;
        pageSpan.style.fontWeight = "normal";
      }

      link.append(titleSpan);
      if (this._activeTab === "index") {
        link.append(dotsSpan);
        link.append(pageSpan);
      }

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
    // Confirmation dialog removed as per user request

    try {
      const loadingDiv = document.createElement("div");
      loadingDiv.textContent = "Checking for existing index...";
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

      // 1. Initial Scan: First 20 pages for TOC
      const checkLimit = Math.min(numPages, 20);
      for (let i = 1; i <= checkLimit; i++) {
        const page = await pdfDocument.getPage(i);
        const content = await page.getTextContent();
        pagesText.push({ pageNumber: i, content });
      }

      // 2. Try to detect and parse existing TOC
      // Note: _detectTOC is now async and handles fetching
      // extra pages if needed
      const tocPages = await this._detectTOC(pagesText, pdfDocument);

      if (tocPages && tocPages.length > 0) {
        loadingDiv.textContent = `Found index (${tocPages.length} pages)! Extracting...`;
        await new Promise(resolve => {
          setTimeout(resolve, 0);
        });

        const bookmarks = this._parseTOC(tocPages);
        if (bookmarks.length > 0) {
          this._indexBookmarks = bookmarks;
          this.saveBookmarks();
          loadingDiv.remove();
          return; // Success, skip full heuristic scan
        }
      }

      // 3. Fallback: Full Heuristic Analyis
      loadingDiv.textContent =
        "No index found. Analyzing full document... This may take a moment.";
      await new Promise(resolve => {
        setTimeout(resolve, 0);
      });

      // Extract remaining pages
      for (let i = checkLimit + 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const content = await page.getTextContent();
        pagesText.push({ pageNumber: i, content });
      }

      const bookmarks = this._analyzeAndGenerate(pagesText);

      this._indexBookmarks = bookmarks;
      this.saveBookmarks();

      loadingDiv.remove();
    } catch (e) {
      console.error("Error generating bookmarks:", e);
      // eslint-disable-next-line no-alert
      window.alert("Failed to generate bookmarks.");
    }
  }

  async _detectTOC(initialPages, pdfDocument) {
    // Returns { pages: [pageContent, ...], startPageNum: number }

    const titleRegex = /^(Índice|Index|Tabla de contenidos|Sumario|Contenido)/i;
    const structureKeywordRegex = /(CAP[ÍI]TULO|SECCI[ÓO]N|PARTE)/i;

    let startPageIdx = -1;

    // 1. Find the Start Page
    for (let i = 0; i < initialPages.length; i++) {
      const page = initialPages[i];
      const isStart = this._isTOCStartPage(
        page,
        titleRegex,
        structureKeywordRegex
      );
      if (isStart) {
        startPageIdx = i;
        break;
      }
    }

    if (startPageIdx === -1) {
      return null;
    }

    // 2. Collect TOC Pages (Start Page + Continuation)
    const tocPages = [];
    // Add the start page
    tocPages.push(initialPages[startPageIdx]);

    // Check subsequent pages
    // We need to look at pages AFTER the start page.
    // Some might be in 'initialPages', some might need fetching.
    let currentIdx = startPageIdx + 1;
    let keepScanning = true;

    while (keepScanning) {
      let nextPage;

      // Check if we already have it in initialPages
      if (currentIdx < initialPages.length) {
        nextPage = initialPages[currentIdx];
      } else {
        // Need to fetch new page if within document bounds
        const pageNum = initialPages[0].pageNumber + currentIdx;
        if (pageNum > pdfDocument.numPages) {
          break;
        }
        try {
          const page = await pdfDocument.getPage(pageNum);
          const content = await page.getTextContent();
          nextPage = { pageNumber: pageNum, content };
        } catch (e) {
          console.error("Error fetching page for TOC scan", e);
          break;
        }
      }

      if (this._isTOCPage(nextPage)) {
        tocPages.push(nextPage);
        currentIdx++;
        // Safety break to prevent infinite scan of entire doc if
        // heuristics fail
        if (tocPages.length > 20) {
          keepScanning = false;
        }
      } else {
        keepScanning = false;
      }
    }

    return tocPages;
  }

  _isTOCStartPage(page, titleRegex, structureKeywordRegex) {
    const { items } = page.content;
    if (items.length === 0) {
      return false;
    }

    const lines = this._groupItemsByLine(items);
    const sortedY = Object.keys(lines).sort((a, b) => b - a);

    let hasTitle = false;
    let hasDotLeaders = false;
    let linesWithNumbers = 0;

    // Check top 5 lines for Title
    for (let i = 0; i < Math.min(sortedY.length, 5); i++) {
      const lineText = this._extractLineText(lines[sortedY[i]]);
      if (titleRegex.test(lineText)) {
        hasTitle = true;
      }
    }

    // Scan body for signals
    for (const y of sortedY) {
      const lineText = this._extractLineText(lines[y]);
      // Pattern: Text ending with number
      if (/.+[\s._·]+\d+$/.test(lineText)) {
        linesWithNumbers++;
        if (lineText.includes("....") || lineText.includes("····")) {
          hasDotLeaders = true;
        }
      }
    }

    // Heuristic: Must have Title AND (DotLeaders OR >3 numbered lines)
    if (hasTitle && (hasDotLeaders || linesWithNumbers > 3)) {
      return true;
    }
    // Fallback: Title AND Structure Keywords AND some numbered lines
    // (Optimization: Checking structure keywords here only if needed)
    if (hasTitle && linesWithNumbers > 2) {
      // Check for keywords
      let hasStructureKeywords = false;
      for (const y of sortedY) {
        const txt = this._extractLineText(lines[y]);
        if (structureKeywordRegex.test(txt)) {
          hasStructureKeywords = true;
          break;
        }
      }
      if (hasStructureKeywords) {
        return true;
      }
    }

    return false;
  }

  _isTOCPage(page) {
    // A continuation page might not have a "Index" title.
    // It relies heavily on the content pattern: lines ending in numbers.
    const { items } = page.content;
    if (!items || items.length === 0) {
      return false;
    }

    const lines = this._groupItemsByLine(items);
    const sortedY = Object.keys(lines).sort((a, b) => b - a);

    let linesWithNumbers = 0;
    const totalLines = sortedY.length;

    if (totalLines < 3) {
      return false; // Too empty to be a TOC page
    }

    for (const y of sortedY) {
      const lineText = this._extractLineText(lines[y]);
      // Pattern: Text ... number
      // We accept a wider range of separators for continuation pages
      if (/.+[\s._·]+\d+$/.test(lineText)) {
        linesWithNumbers++;
      }
    }

    // Criteria: A significant portion of lines look like TOC entries.
    // e.g., at least 3 valid lines or > 20% of lines if page is dense.
    return linesWithNumbers >= 3;
  }

  _groupItemsByLine(items) {
    const lines = {};
    items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (!lines[y]) {
        lines[y] = [];
      }
      lines[y].push(item);
    });
    return lines;
  }

  _parseTOC(tocPages) {
    const candidates = [];
    const entryRegex = /^(.+?)(?:[\s._·]+)(\d+)$/;

    // 1. Extract all raw candidates with their X indentation
    let pendingText = "";
    let pendingX = null;

    tocPages.forEach(page => {
      const { items } = page.content;
      if (!items || items.length === 0) {
        return;
      }

      const lines = this._groupItemsByLine(items);
      const sortedY = Object.keys(lines).sort((a, b) => b - a);

      sortedY.forEach(y => {
        // Sort items by X to get correct indentation and text order
        const lineItems = lines[y].sort(
          (a, b) => a.transform[4] - b.transform[4]
        );

        // Use X of first item as indentation level
        const currentX = lineItems[0].transform[4];
        const lineText = this._extractLineText(lineItems);

        // Filter out noise lines: Headers and Page Markers
        const isHeader =
          /^[\s]*(?:Índice|Index|Tabla de contenidos|Contenido|Sumario)[\s]*$/i.test(
            lineText
          );
        // Matches "- 11 -", "11", "1", etc.
        const isPageMarker = /^[\s-—]*\d+[\s-—]*$/.test(lineText);

        if (isHeader || isPageMarker) {
          return; // Skip this line
        }

        const match = lineText.match(entryRegex);

        if (match) {
          // This line ends with a number, implies end of entry
          let label = match[1].trim();
          const pageNum = parseInt(match[2], 10);

          // If we had pending text, prepend it
          if (pendingText) {
            label = `${pendingText} ${label}`;
            // Use the X of the start of the entry if available
            if (pendingX !== null) {
              // We'll use pendingX, assumed implicitly by flow or future logic
            }
          }

          // Cleanup label trailing dots/chars that regex might have missed
          label = label.replace(/[._·]+$/, "").trim();

          // Reset pending
          pendingText = "";
          pendingX = null;

          // Don't bookmark the title itself
          // (redundant check but keeps logic safe)
          if (
            /^(Índice|Index|Contenido|Tabla de contenidos)$/i.test(label) &&
            Math.abs(pageNum - page.pageNumber) < 2
          ) {
            return;
          }

          if (pageNum > 0 && pageNum <= this.linkService.pdfDocument.numPages) {
            candidates.push({
              label,
              page: pageNum,
              x: currentX, // Use current line X for dot leaders alignment
              source: "toc", // MARK AS TOC SOURCE
              timestamp: Date.now(),
            });
          }
        } else if (pendingText) {
          pendingText += " " + lineText;
        } else {
          pendingText = lineText;
          pendingX = currentX; // Save X of the start line
        }
      });
    });

    if (candidates.length === 0) {
      return [];
    }

    // 2. Determine indentation levels
    // Cluster X values
    const xClusters = [];
    // Increased tolerance to handle loose alignment or "Drop Cap" quirks
    const TOLERANCE = 10;

    candidates.forEach(c => {
      let found = false;
      for (const cluster of xClusters) {
        if (Math.abs(cluster.avg - c.x) < TOLERANCE) {
          cluster.count++;
          // Weighted average might be better but simple avg update is okay
          found = true;
          break;
        }
      }
      if (!found) {
        xClusters.push({ avg: c.x, count: 1 });
      }
    });

    xClusters.sort((a, b) => a.avg - b.avg);

    // 3. Assign levels
    return candidates.map(c => {
      let xLevel = 1;
      let minDiff = Infinity;

      xClusters.forEach((cluster, index) => {
        const diff = Math.abs(cluster.avg - c.x);
        if (diff < minDiff) {
          minDiff = diff;
          xLevel = index + 1;
        }
      });

      // Try to deduce level from numbering in the label
      const labelLevel = this._getLevelFromLabel(c.label);

      // Priority: Label Numbering > Visual Indentation
      // If label has numbering (e.g. 1.1), use it.
      // Otherwise fallback to visual indentation level.
      const level = labelLevel > 0 ? labelLevel : xLevel;

      return {
        ...c,
        level,
      };
    });
  }

  _getLevelFromLabel(label) {
    // 1. Check for standard decimal numbering: 1., 1.1, 1.1.1
    // We look for a sequence of numbers separated by dots at the start.
    const decimalMatch = label.match(/^(\d+(?:\.\d+)*)/);
    if (decimalMatch) {
      // Split by dot and filter empty strings (e.g. "1." -> ["1", ""])
      const parts = decimalMatch[0].split(".").filter(p => p.length > 0);
      // Only enforce level if we have subsection depth (e.g. 1.1)
      // For simple "1.", "2." we defer to indentation because it could be a
      // subsection under a "Chapter 1" that resets count, or a main chapter.
      return parts.length > 1 ? parts.length : 0;
    }

    // 2. Check for keywords implying top level
    if (/^(Capítulo|Chapter|Parte|Part|Sección|Section)\s/i.test(label)) {
      return 1;
    }

    // 3. Roman Numerals (I., II., III...) often Level 1
    if (/^[IVXLCDM]+\.?\s/i.test(label)) {
      return 1;
    }

    return 0; // Inconclusive
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
        // but subsequent text is body-sized, treat line as body size.
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

        // Extract text with smart spacing
        // and accent fixing
        const text = this._extractLineText(lineItems);

        // Skip empty, short noise, or purely numeric page numbers
        // (unless it looks like "1." header)
        // REFINED: Only discard short text if it looks like body text (same
        // height). This preserves short headers like "I", "IV", "1.", etc.
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
    // Optimization: Use first 100 pages as sample.
    // Sufficient for statistical mode and saves iteration on large docs.
    const sample = pagesText.slice(0, 100);

    sample.forEach(page => {
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
        // Increased threshold to avoided splitting loose text
        // (e.g. Small Caps)
        if (gap > fontSize * 0.4) {
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
