"use strict";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "research-technologies",
    title: "Research Technologies",
    contexts: ["selection"]
  });
});


const DEFAULT_SETTINGS = {
  descriptionKeywords: [
    "remote", "hybrid", "onsite", "on-site",
    "frontend", "backend", "mobile",
    "html", "css", "javascript", "typescript", "php", "python", "golang", "rust", "ruby", "c#",
    "node.js", "django", "flask", ".net",
    "react", "vue", "angular",
    "laravel", "symfony", "codeigniter",
    "postgre", "mongo", "mysql", "sql",
    "claude", "cursor", "copilot",
    "llm", "ai", "ml",
    "aws", "gcp", "ci/cd", "kubernetes", "docker",
    "saas"
  ],

  descriptionRestrictKeywords: ["ai", "ml", "rust", "java"],
};

let settings = {
  ...DEFAULT_SETTINGS
};


function loadSettings() {
  chrome.storage.local.get(
    DEFAULT_SETTINGS,
    result => {

      settings = {
        titleKeywords:
          Array.isArray(
            result.titleKeywords
          )
            ? result.titleKeywords
            : [],

        recruiters:
          Array.isArray(
            result.recruiters
          )
            ? result.recruiters
            : [],

        descriptionKeywords:
          Array.isArray(
            result.descriptionKeywords
          )
            ? result.descriptionKeywords
            : [],

        descriptionRestrictKeywords:
          Array.isArray(
            result.descriptionRestrictKeywords
          )
            ? result.descriptionRestrictKeywords
            : []
      };
    }
  );
}

loadSettings();

// =========================================================
// ESCAPE REGEX
// =========================================================

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}
// =========================================================
// COUNT KEYWORD
// =========================================================
function countKeyword(text, keyword) {
  if (!text || !keyword) {
    return 0;
  }

  const normalizedText = String(text).toLowerCase();
  const normalizedKeyword = String(keyword).trim().toLowerCase();

  if (!normalizedKeyword) {
    return 0;
  }

  if (settings.descriptionRestrictKeywords.includes(normalizedKeyword)) {
    const escapedKeyword = normalizedKeyword.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(`\\b${escapedKeyword}\\b`, "gi");

    return (normalizedText.match(regex) || []).length;
  } else {

    const regex = new RegExp(
      escapeRegex(normalizedKeyword),
      "gi"
    );

    const matches =
      normalizedText.match(regex);

    return matches
      ? matches.length
      : 0;
  }

}

chrome.contextMenus.onClicked.addListener(
  async (info, tab) => {

    if (
      info.menuItemId !==
      "research-technologies"
    ) {
      return;
    }

    if (!info.selectionText) {
      return;
    }

    const selectedText =
      info.selectionText;

    const counts = [];

    for (
      const keyword of
      settings.descriptionKeywords
    ) {
      const count =
        countKeyword(
          selectedText,
          keyword
        );

      if (count > 0) {
        counts.push({
          keyword,
          count
        });
      }
    }

    // Highest count first
    counts.sort(
      (a, b) =>
        b.count - a.count
    );

    await chrome.action.openPopup();
    await chrome.runtime.sendMessage({
      type: "DESCRIPTION_ANALYSIS",
      payload: {
        site: "From Selected Text",
        counts: counts,
        description: selectedText,
      }
    }).catch(() => {
      console.log('error');
      // Popup isn't open. Ignore.
    });
  }
);