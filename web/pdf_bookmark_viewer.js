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

    // Default label is "Page X"
    const label = `Page ${this._currentPageNumber}`;
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

    const addButton = document.createElement("button");
    addButton.id = "addBookmarkButton";
    addButton.textContent = "Add Bookmark";
    addButton.className = "toolbarButton labeled";
    addButton.style.width = "100%";
    addButton.style.cursor = "pointer";

    addButton.onclick = () => this.addBookmark();
    addButtonDiv.append(addButton);
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

    this._bookmarks.forEach((bm, index) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "treeItem";
      itemDiv.style.display = "flex";
      itemDiv.style.justifyContent = "space-between";
      itemDiv.style.alignItems = "center";
      itemDiv.style.padding = "5px 10px";
      itemDiv.style.cursor = "pointer";

      const link = document.createElement("a");
      link.textContent = bm.label;
      link.style.flexGrow = "1";
      link.onclick = e => {
        e.preventDefault();
        this.linkService.page = bm.page;
      };
      link.href = "#";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "×";
      deleteBtn.style.background = "none";
      deleteBtn.style.border = "none";
      deleteBtn.style.color = "var(--text-color)";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.style.fontSize = "16px";
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
}

export { PDFBookmarkViewer };
