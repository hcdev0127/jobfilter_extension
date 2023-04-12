(() => {
  "use strict";

  // Prevent duplicate initialization
  if (window.__REED_JOB_FILTER__) {
    return;
  }

  window.__REED_JOB_FILTER__ = true;

  const CONFIG = {
    blockedJobTitleKeywords: [
      "trainee"
    ],

    blockedRecruiters: [
      "Noir"
    ],

    jobTitleSelector: '[data-element="job_title"]',

    recruiterSelector: '[data-element="recruiter"]',

    cardSelector: 'article[class*="card"]',

    scanDelay: 300
  };

  // ==========================================
  // Normalize text
  // ==========================================

  function normalize(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  // ==========================================
  // Check keyword
  // ==========================================

  function containsKeyword(text, keywords) {
    const normalizedText = normalize(text);

    return keywords.some((keyword) =>
      normalizedText.includes(normalize(keyword))
    );
  }

  // ==========================================
  // Find parent article.card
  // ==========================================

  function getJobCard(element) {
    if (!element) {
      return null;
    }

    return element.closest(CONFIG.cardSelector);
  }

  // ==========================================
  // Hide job card
  // ==========================================

  function removeJob(card, reason) {
    if (!card) {
      return;
    }

    if (card.dataset.reedJobFilterRemoved === "1") {
      return;
    }

    card.dataset.reedJobFilterRemoved = "1";

    console.log(
      `[Reed Job Filter] Removed job: ${reason}`
    );

    // Safer than card.remove() for React/Next.js
    card.style.setProperty(
      "display",
      "none",
      "important"
    );
  }

  // ==========================================
  // Check job title
  // ==========================================

  function checkJobTitle(titleElement) {
    const card = getJobCard(titleElement);

    if (!card) {
      return;
    }

    const title = normalize(
      titleElement.textContent
    );

    if (
      containsKeyword(
        title,
        CONFIG.blockedJobTitleKeywords
      )
    ) {
      removeJob(
        card,
        `blocked job title: "${title}"`
      );

      return;
    }
  }

  // ==========================================
  // Check recruiter
  // ==========================================

  function checkRecruiter(recruiterElement) {
    const card = getJobCard(recruiterElement);

    if (!card) {
      return;
    }

    const recruiter = normalize(
      recruiterElement.textContent
    );

    if (
      containsKeyword(
        recruiter,
        CONFIG.blockedRecruiters
      )
    ) {
      removeJob(
        card,
        `blocked recruiter: "${recruiter}"`
      );
    }
  }

  // ==========================================
  // Scan all jobs
  // ==========================================

  function scanJobs() {
    // -------------------------------
    // Check job titles
    // -------------------------------

    const jobTitles = document.querySelectorAll(
      CONFIG.jobTitleSelector
    );

    jobTitles.forEach(checkJobTitle);

    // -------------------------------
    // Check recruiters
    // -------------------------------

    const recruiters = document.querySelectorAll(
      CONFIG.recruiterSelector
    );

    recruiters.forEach(checkRecruiter);
  }

  // ==========================================
  // Schedule scan
  // ==========================================

  let scanTimer = null;

  function scheduleScan() {
    if (scanTimer !== null) {
      return;
    }

    scanTimer = setTimeout(() => {
      scanTimer = null;

      try {
        scanJobs();
      } catch (error) {
        console.error(
          "[Reed Job Filter] Scan error:",
          error
        );
      }
    }, CONFIG.scanDelay);
  }

  // ==========================================
  // Observe dynamically loaded jobs
  // ==========================================

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

  // ==========================================
  // Start
  // ==========================================

  function start() {
    console.log(
      "[Reed Job Filter] Started"
    );

    // Process jobs already on the page
    scanJobs();

    // Monitor jobs added while scrolling
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // ==========================================
  // Initialize
  // ==========================================

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