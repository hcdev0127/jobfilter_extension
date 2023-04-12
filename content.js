(() => {
  "use strict";

  // Prevent the script from being initialized more than once.
  if (window.__REED_JOB_FILTER_INITIALIZED__) {
    return;
  }

  window.__REED_JOB_FILTER_INITIALIZED__ = true;

  // ============================================
  // Selectors
  // ============================================

  const SELECTORS = {
    jobTitle: '[data-element="job_title"]',
    recruiter: '[data-element="recruiter"]',
    jobCard: 'article[class*="card"]'
  };

  // ============================================
  // Default filters
  // ============================================

  const DEFAULT_FILTERS = {
    titleKeywords: [
      "trainee"
    ],

    recruiters: [
      "noir"
    ]
  };

  // Current filters.
  let filters = {
    titleKeywords: [...DEFAULT_FILTERS.titleKeywords],
    recruiters: [...DEFAULT_FILTERS.recruiters]
  };

  // ============================================
  // Text normalization
  // ============================================

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  // ============================================
  // Check whether text contains any value
  // ============================================

  function containsAny(text, values) {
    const normalizedText = normalizeText(text);

    if (!normalizedText || !Array.isArray(values)) {
      return false;
    }

    return values.some((value) => {
      const normalizedValue = normalizeText(value);

      if (!normalizedValue) {
        return false;
      }

      return normalizedText.includes(normalizedValue);
    });
  }

  // ============================================
  // Find the parent job card
  // ============================================

  function getJobCard(element) {
    if (!element) {
      return null;
    }

    return element.closest(SELECTORS.jobCard);
  }

  // ============================================
  // Hide job card
  // ============================================

  function hideJobCard(card, reason) {
    if (!card) {
      return;
    }

    card.style.setProperty(
      "display",
      "none",
      "important"
    );

    card.dataset.reedJobFilterHidden = "true";

    console.debug(
      "[Reed Job Filter] Hidden:",
      reason
    );
  }

  // ============================================
  // Show job card
  // ============================================

  function showJobCard(card) {
    if (!card) {
      return;
    }

    if (
      card.dataset.reedJobFilterHidden === "true"
    ) {
      card.style.removeProperty("display");

      delete card.dataset.reedJobFilterHidden;
    }
  }

  // ============================================
  // Evaluate a single job card
  // ============================================

  function evaluateJobCard(card) {
    if (!card) {
      return;
    }

    const titleElement = card.querySelector(
      SELECTORS.jobTitle
    );

    const recruiterElement = card.querySelector(
      SELECTORS.recruiter
    );

    const title = titleElement
      ? normalizeText(titleElement.textContent)
      : "";

    const recruiter = recruiterElement
      ? normalizeText(recruiterElement.textContent)
      : "";

    // ==========================================
    // TITLE FILTER
    // ==========================================

    if (
      containsAny(
        title,
        filters.titleKeywords
      )
    ) {
      hideJobCard(
        card,
        `title "${title}"`
      );

      return;
    }

    // ==========================================
    // RECRUITER FILTER
    // ==========================================

    if (
      containsAny(
        recruiter,
        filters.recruiters
      )
    ) {
      hideJobCard(
        card,
        `recruiter "${recruiter}"`
      );

      return;
    }

    // ==========================================
    // Job no longer matches current filters
    // ==========================================

    showJobCard(card);
  }

  // ============================================
  // Scan all currently loaded jobs
  // ============================================

  function scanJobs() {
    const cards = document.querySelectorAll(
      SELECTORS.jobCard
    );

    cards.forEach((card) => {
      try {
        evaluateJobCard(card);
      } catch (error) {
        console.error(
          "[Reed Job Filter] Failed to evaluate job:",
          error
        );
      }
    });
  }

  // ============================================
  // Load filters from Chrome storage
  // ============================================

  function loadFilters() {
    chrome.storage.local.get(
      DEFAULT_FILTERS,
      (result) => {
        filters = {
          titleKeywords:
            Array.isArray(result.titleKeywords)
              ? result.titleKeywords
              : [],

          recruiters:
            Array.isArray(result.recruiters)
              ? result.recruiters
              : []
        };

        scanJobs();
      }
    );
  }

  // ============================================
  // Debounced scanning
  // ============================================

  let scanTimeout = null;

  function scheduleScan() {
    if (scanTimeout !== null) {
      return;
    }

    scanTimeout = setTimeout(() => {
      scanTimeout = null;

      scanJobs();
    }, 250);
  }

  // ============================================
  // Observe dynamically loaded jobs
  // ============================================

  const observer = new MutationObserver(
    (mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "childList" &&
          mutation.addedNodes.length > 0
        ) {
          scheduleScan();
          break;
        }
      }
    }
  );

  // ============================================
  // Listen for filter changes
  // ============================================

  chrome.storage.onChanged.addListener(
    (changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      if (changes.titleKeywords) {
        filters.titleKeywords =
          Array.isArray(
            changes.titleKeywords.newValue
          )
            ? changes.titleKeywords.newValue
            : [];
      }

      if (changes.recruiters) {
        filters.recruiters =
          Array.isArray(
            changes.recruiters.newValue
          )
            ? changes.recruiters.newValue
            : [];
      }

      // Re-evaluate all existing jobs immediately.
      scanJobs();
    }
  );

  // ============================================
  // Start extension
  // ============================================

  function start() {
    console.log(
      "[Reed Job Filter] Started"
    );

    loadFilters();

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // ============================================
  // Initialize
  // ============================================

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})();