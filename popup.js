document.addEventListener(
  "DOMContentLoaded",
  () => {

    const titleInput =
      document.getElementById(
        "titleKeywords"
      );

    const recruiterInput =
      document.getElementById(
        "recruiters"
      );

    const descriptionInput =
      document.getElementById(
        "descriptionKeywords"
      );

    const saveButton =
      document.getElementById(
        "saveButton"
      );

    const status =
      document.getElementById(
        "status"
      );

    const results =
      document.getElementById(
        "results"
      );

    const siteElement =
      document.getElementById(
        "site"
      );


    // ==========================================
    // Defaults
    // ==========================================

    const DEFAULTS = {
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
        "llm", "ai", "ml",
        "aws", "gcp", "ci/cd", "kubernetes", "docker"
      ]
    };


    // ==========================================
    // Parse comma-separated input
    // ==========================================

    function parseList(value) {

      return value
        .split(",")
        .map(
          item => item.trim()
        )
        .filter(Boolean);

    }


    // ==========================================
    // Remove duplicates
    // ==========================================

    function unique(values) {

      const seen =
        new Set();

      return values.filter(
        value => {

          const normalized =
            value.toLowerCase();

          if (
            seen.has(normalized)
          ) {
            return false;
          }

          seen.add(normalized);

          return true;
        }
      );

    }


    // ==========================================
    // Load settings
    // ==========================================

    function loadSettings() {

      chrome.storage.local.get(
        DEFAULTS,
        settings => {

          titleInput.value =
            settings.titleKeywords.join(
              ", "
            );

          recruiterInput.value =
            settings.recruiters.join(
              ", "
            );

          descriptionInput.value =
            settings.descriptionKeywords.join(
              ", "
            );

        }
      );

    }


    // ==========================================
    // Save settings
    // ==========================================

    function saveSettings() {

      const titleKeywords =
        unique(
          parseList(
            titleInput.value
          )
        );

      const recruiters =
        unique(
          parseList(
            recruiterInput.value
          )
        );

      const descriptionKeywords =
        unique(
          parseList(
            descriptionInput.value
          )
        );


      chrome.storage.local.set(
        {
          titleKeywords,
          recruiters,
          descriptionKeywords
        },
        () => {

          if (
            chrome.runtime.lastError
          ) {

            status.textContent =
              chrome.runtime
                .lastError
                .message;

            status.className =
              "error";

            return;
          }


          status.textContent =
            "Saved and applied.";

          status.className =
            "success";


          // Ask the active job page to analyze again.
          requestAnalysis();

        }
      );

    }


    // ==========================================
    // Render results
    // ==========================================

    function renderResults(
      data
    ) {

      results.innerHTML = "";

      if (
        !data ||
        !Array.isArray(
          data.counts
        ) ||
        data.counts.length === 0
      ) {

        results.innerHTML = `
          <div class="empty">
            No configured keywords found.
          </div>
        `;

        return;
      }


      data.counts.forEach(
        item => {

          const row =
            document.createElement(
              "div"
            );

          row.className =
            "result";

          row.innerHTML = `
            <span class="keyword">
              ${escapeHtml(
            item.keyword
          )}
            </span>

            <span class="count">
              ${item.count}
            </span>
          `;

          results.appendChild(
            row
          );

        }
      );

    }


    // ==========================================
    // Escape HTML
    // ==========================================

    function escapeHtml(value) {

      const div =
        document.createElement(
          "div"
        );

      div.textContent =
        value;

      return div.innerHTML;

    }


    // ==========================================
    // Request analysis
    // ==========================================

    async function requestAnalysis() {
      try {

        const tabs =
          await chrome.tabs.query({
            active: true,
            currentWindow: true
          });


        const tab =
          tabs[0];

        if (!tab?.id) {
          return;
        }


        const url =
          tab.url || "";


        if (
          !url.includes(
            "reed.co.uk/jobs"
          ) &&
          !url.includes(
            "linkedin.com/jobs"
          ) &&
          !url.includes(
            "bebee.com/"
          ) &&
          !url.includes(
            "workable.com/"
          )
        ) {
          return;
        }

        const response =
          await chrome.tabs.sendMessage(
            tab.id,
            {
              type:
                "ANALYZE_DESCRIPTION"
            }
          );


        if (
          response?.success
        ) {

          siteElement.textContent =
            response.site;

          renderResults(
            response
          );

        }

      } catch (error) {

        siteElement.textContent =
          "Not ready";

        results.innerHTML = `
          <div class="empty">
            Job description is not available yet.
          </div>
        `;

      }

    }


    // ==========================================
    // Receive automatic updates
    // ==========================================

    chrome.runtime.onMessage.addListener(
      message => {

        if (
          message?.type ===
          "DESCRIPTION_ANALYSIS"
        ) {
          siteElement.textContent =
            message.payload.site;

          renderResults(
            message.payload
          );

        }

      }
    );


    // ==========================================
    // Save
    // ==========================================

    saveButton.addEventListener(
      "click",
      saveSettings
    );


    // ==========================================
    // Enter = Save
    // ==========================================

    [
      titleInput,
      recruiterInput,
      descriptionInput
    ].forEach(
      input => {

        input.addEventListener(
          "keydown",
          event => {

            if (
              event.key === "Enter"
            ) {

              event.preventDefault();

              saveSettings();

            }

          }
        );

      }
    );


    // ==========================================
    // Initial load
    // ==========================================

    loadSettings();

    // Try to analyze current page.
    setTimeout(
      requestAnalysis,
      300
    );

  }
);