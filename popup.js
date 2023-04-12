document.addEventListener("DOMContentLoaded", () => {
  const titleInput =
    document.getElementById("titleKeywords");

  const recruiterInput =
    document.getElementById("recruiters");

  const saveButton =
    document.getElementById("saveButton");

  const status =
    document.getElementById("status");

  const DEFAULTS = {
    titleKeywords: ["trainee"],
    recruiters: ["noir"]
  };

  function parseList(value) {
    return value
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
  }

  function loadSettings() {
    chrome.storage.local.get(
      DEFAULTS,
      settings => {
        titleInput.value =
          settings.titleKeywords.join(", ");

        recruiterInput.value =
          settings.recruiters.join(", ");
      }
    );
  }

  function saveSettings() {
    const titleKeywords =
      parseList(titleInput.value);

    const recruiters =
      parseList(recruiterInput.value);

    chrome.storage.local.set(
      {
        titleKeywords,
        recruiters
      },
      () => {
        if (chrome.runtime.lastError) {
          status.textContent =
            "Error: " +
            chrome.runtime.lastError.message;

          status.className = "error";
          return;
        }

        status.textContent =
          "Saved successfully.";

        status.className = "success";
      }
    );
  }

  saveButton.addEventListener(
    "click",
    saveSettings
  );

  loadSettings();
});