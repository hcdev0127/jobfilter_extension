(() => {
  "use strict";

  if (window.__JOB_SEARCH_FILTER_INITIALIZED__) {
    return;
  }

  window.__JOB_SEARCH_FILTER_INITIALIZED__ = true;

  // =========================================================
  // SITE
  // =========================================================

  const SITE = location.hostname.includes("linkedin")
    ? "linkedin" : location.hostname.includes("reed")
      ? "reed" : location.hostname.includes("bebee")
      ? "bebee" : location.hostname.includes("workable")
       ? "workable" : "jobgether";

  // =========================================================
  // SELECTORS
  // =========================================================


  const SELECTORS = {
    reed: {
      jobTitle: '[data-element="job_title"]',
      recruiter: '[data-element="recruiter"]',
      jobCard: 'article[class*="card"]',

      description: 'div[data-qa="job-description"]'
    },

    linkedin: {
      jobTitle: 'a[class*=iROdnqnavpKyZuWdSFnmPfffMLnixsk] span strong',
      recruiter: 'span[class*=QMGXrjaeNxeiUcsCRfualFyKDrpJAGWKwjBlEU]',
      jobCard: 'li[class*=fHkvhtewVFBzjqWkcBEcQqgevCMImQ]',

      description: 'div.mt4 p[dir="ltr"]'
    },
    bebee: {
      description: 'div.max-w-4xl.mx-auto'
    },
    workable: {
      description: 'div.jobBreakdown__job-breakdown--31MGR'
    },
    jobgether: {
      description: 'div.bg-white>h2.text-lg.font-bold.text-primary.mb-4:has(+ div.relative) + div.relative'
    }
  };

  // =========================================================
  // DEFAULT SETTINGS
  // =========================================================

  const DEFAULT_SETTINGS = {
    titleKeywords: [
      "trainee"
    ],

    recruiters: [
      "noir"
    ],

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

    descriptionRestrictKeywords: ["ai", "ml", "rust"],
  };

  let settings = {
    ...DEFAULT_SETTINGS
  };

  // =========================================================
  // TEXT NORMALIZATION
  // =========================================================

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

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

  // =========================================================
  // FIND DESCRIPTION
  // =========================================================

  function getDescriptionElement() {
    const selectors =
      SELECTORS[SITE].description;

    return document.querySelector(
      selectors
    );
  }

  // =========================================================
  // GET DESCRIPTION TEXT
  // =========================================================

  function getJobDescription() {
    const element =
      getDescriptionElement();

    if (!element) {
      return "";
    }

    return (element.innerText ||
      element.textContent ||
      "").trim();
  }

  // =========================================================
  // ANALYZE DESCRIPTION
  // =========================================================

  function analyzeDescription() {
    const description =
      getJobDescription();

    if (!description) {
      return {
        description: "",
        counts: []
      };
    }

    const counts = [];

    for (
      const keyword of
      settings.descriptionKeywords
    ) {
      const count =
        countKeyword(
          description,
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

    return {
      description,
      counts
    };
  }

  // =========================================================
  // SEND RESULTS TO POPUP
  // =========================================================

  function sendAnalysisToPopup() {
    const result =
      analyzeDescription();
    console.log(result);
    chrome.runtime.sendMessage({
      type: "DESCRIPTION_ANALYSIS",
      payload: {
        site: SITE,
        counts: result.counts,
        description: result.description
      }
    }).catch(() => {
      // Popup isn't open. Ignore.
    });
  }

  // =========================================================
  // JOB CARD
  // =========================================================

  function getJobCard(element) {
    if (!element) {
      return null;
    }

    return element.closest(
      SELECTORS[SITE].jobCard
    );
  }

  // =========================================================
  // CONTAINS ANY
  // =========================================================

  function containsAny(text, values) {
    const normalized =
      normalizeText(text);

    if (!normalized) {
      return false;
    }

    return values.some(
      value =>
        normalized.includes(
          normalizeText(value)
        )
    );
  }

  // =========================================================
  // HIDE CARD
  // =========================================================

  function hideJobCard(
    card,
    reason
  ) {
    if (!card) {
      return;
    }

    card.style.setProperty(
      "display",
      "none",
      "important"
    );

    card.dataset.jobFilterHidden =
      "true";

    console.debug(
      "[Job Filter] Hidden:",
      reason
    );
  }

  // =========================================================
  // SHOW CARD
  // =========================================================

  function showJobCard(card) {
    if (!card) {
      return;
    }

    if (
      card.dataset.jobFilterHidden ===
      "true"
    ) {
      card.style.removeProperty(
        "display"
      );

      delete card.dataset
        .jobFilterHidden;
    }
  }

  // =========================================================
  // EVALUATE JOB
  // =========================================================

  function evaluateJobCard(card) {
    if (!card) {
      return;
    }

    const titleElement =
      card.querySelector(
        SELECTORS[SITE].jobTitle
      );

    const recruiterElement =
      card.querySelector(
        SELECTORS[SITE].recruiter
      );

    const title =
      titleElement?.textContent || "";

    const recruiter =
      recruiterElement?.textContent || "";

    // TITLE FILTER
    if (
      containsAny(
        title,
        settings.titleKeywords
      )
    ) {
      hideJobCard(
        card,
        `title: ${title}`
      );

      return;
    }

    // RECRUITER FILTER
    if (
      containsAny(
        recruiter,
        settings.recruiters
      )
    ) {
      hideJobCard(
        card,
        `recruiter: ${recruiter}`
      );

      return;
    }

    showJobCard(card);
  }

  // =========================================================
  // SCAN JOB CARDS
  // =========================================================

  function scanJobs() {
    const cards =
      document.querySelectorAll(
        SELECTORS[SITE].jobCard
      );

    cards.forEach(
      evaluateJobCard
    );
  }

  // =========================================================
  // LOAD SETTINGS
  // =========================================================

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

        scanJobs();

        sendAnalysisToPopup();
      }
    );
  }

  // =========================================================
  // STORAGE CHANGES
  // =========================================================

  chrome.storage.onChanged.addListener(
    (changes, areaName) => {

      if (areaName !== "local") {
        return;
      }

      if (changes.titleKeywords) {
        settings.titleKeywords =
          changes.titleKeywords.newValue || [];
      }

      if (changes.recruiters) {
        settings.recruiters =
          changes.recruiters.newValue || [];
      }

      if (changes.descriptionKeywords) {
        settings.descriptionKeywords =
          changes.descriptionKeywords.newValue || [];
      }

      scanJobs();

      sendAnalysisToPopup();
    }
  );

  // =========================================================
  // MESSAGE FROM POPUP
  // =========================================================

  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

      if (
        message?.type ===
        "ANALYZE_DESCRIPTION"
      ) {
        const result =
          analyzeDescription();

        sendResponse({
          success: true,
          site: SITE,
          counts: result.counts,
          description: result.description
        });

        return true;
      }

      return false;
    }
  );

  // =========================================================
  // DEBOUNCE
  // =========================================================

  let scanTimer = null;

  function scheduleScan() {
    if (scanTimer !== null) {
      return;
    }

    scanTimer = setTimeout(
      () => {
        scanTimer = null;

        scanJobs();
        sendAnalysisToPopup();
      },
      300
    );
  }

  // =========================================================
  // MUTATION OBSERVER
  // =========================================================

  const observer =
    new MutationObserver(
      mutations => {

        for (
          const mutation of mutations
        ) {

          if (
            mutation.type ===
            "childList" &&
            mutation.addedNodes.length
          ) {
            scheduleScan();

            break;
          }
        }
      }
    );

  // =========================================================
  // START
  // =========================================================

  function start() {
    console.log(
      `[Job Filter] Started on ${SITE}`
    );

    loadSettings();

    if (document.body) {
      observer.observe(
        document.body,
        {
          childList: true,
          subtree: true
        }
      );
    }

    /*
     * LinkedIn is a SPA.
     * The URL can change without a
     * full page reload.
     */

    let previousUrl =
      location.href;

    setInterval(() => {

      if (
        location.href !==
        previousUrl
      ) {
        previousUrl =
          location.href;

        setTimeout(
          () => {
            scanJobs();
            sendAnalysisToPopup();
          },
          500
        );
      }

    }, 1000);
  }

  // =========================================================
  // INIT
  // =========================================================

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})();