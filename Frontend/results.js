document.addEventListener("DOMContentLoaded", function () {
  // Initialize jsPDF
  const { jsPDF } = window.jspdf;

  // Get trip data from localStorage
  const tripData = JSON.parse(localStorage.getItem("tripData"));
  let isEditMode = false;
  let originalContent = "";

  // Update trip info card immediately
  if (tripData) {
    document.getElementById("tripDestination").textContent =
      tripData.destination;
    document.getElementById(
      "tripDates"
    ).textContent = `${tripData.startDate} to ${tripData.endDate}`;
    document.getElementById("tripCustomization").textContent =
      tripData.customization || "Standard trip";
  }

  // Load trip data function
  function loadTripData() {
    if (tripData) {
      const { destination, startDate, endDate, customization } = tripData;
      const token = localStorage.getItem("token");

      const prompt = `Create a detailed travel itinerary for a trip to ${destination} from ${startDate} to ${endDate}.`;
      if (customization) {
        prompt += ` Include these preferences: ${customization}`;
      }

      showToast("Loading your itinerary...");

      fetch("http://localhost:5000/api/ai/expense", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      })
        .then((response) => {
          if (response.status === 401) {
            showToast("Session expired. Please log in again.", "error");
            setTimeout(() => {
              window.location.href = "index.html";
            }, 2000);
            return;
          }
          return response.json();
        })
        .then((data) => {
          const tripDetailsDiv = document.getElementById("tripDetails");
          if (tripDetailsDiv) {
            // Check for saved edits first
            //  const savedEdits = localStorage.getItem('editedTripContent');
            //if (savedEdits) {
            //  tripDetailsDiv.innerHTML = savedEdits;
            //showToast('Loaded your saved edits');
            //} else {
            const formattedDetails = formatTripDetails(data.message, tripData);
            tripDetailsDiv.innerHTML = formattedDetails;
            showToast("Itinerary loaded successfully");
            //  }
            // Save original content
            originalContent = tripDetailsDiv.innerHTML;
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          const tripDetailsDiv = document.getElementById("tripDetails");
          if (tripDetailsDiv) {
            tripDetailsDiv.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Failed to load trip details. Please try again later.</p>
                        </div>
                    `;
          }
          showToast("Failed to load itinerary", "error");
        });
    } else {
      document.getElementById("tripDetails").innerHTML = `
                <div class="error-message">
                    <i class="fas fa-map-marked-alt"></i>
                    <p>No trip data found. Please create a new trip.</p>
                </div>
            `;
      showToast("No trip data found", "error");
    }
  }

  // Initial load of trip data
  loadTripData();

  // Toast notification function
  function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast";

    // Set background color based on type
    if (type === "error") {
      toast.style.background = "linear-gradient(135deg, #ff6b6b, #ff8787)";
    } else {
      toast.style.background =
        "linear-gradient(135deg, var(--primary), var(--primary-light))";
    }

    toast.classList.add("show");

    // Hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // Set up edit mode toggle
  window.toggleEditMode = function () {
    const tripDetailsDiv = document.getElementById("tripDetails");
    const editBtn = document.querySelector(".edit-btn");

    if (!isEditMode) {
      // Enter edit mode
      isEditMode = true;

      // Make entire content editable
      tripDetailsDiv.contentEditable = true;

      // Add editing styles
      tripDetailsDiv.classList.add("editing-active");

      // Update button
      editBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
      editBtn.classList.add("save-mode");

      // Add editing controls
      addEditingControls();

      showToast("Edit mode activated");
    } else {
      // Exit edit mode
      isEditMode = false;

      // Remove editable attribute
      tripDetailsDiv.contentEditable = false;

      // Remove editing styles
      tripDetailsDiv.classList.remove("editing-active");

      // Update button
      editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Edit Itinerary';
      editBtn.classList.remove("save-mode");

      // Save content
      localStorage.setItem("editedTripContent", tripDetailsDiv.innerHTML);

      // Remove editing controls
      removeEditingControls();

      showToast("Changes saved successfully");
    }
  };

  // Add editing controls
  function addEditingControls() {
    // Add format buttons if they don't exist
    if (!document.getElementById("formatting-toolbar")) {
      const toolbar = document.createElement("div");
      toolbar.id = "formatting-toolbar";

      // Bold button
      const boldBtn = document.createElement("button");
      boldBtn.innerHTML = '<i class="fas fa-bold"></i>';
      boldBtn.onclick = () => document.execCommand("bold", false, null);
      boldBtn.title = "Bold";

      // Italic button
      const italicBtn = document.createElement("button");
      italicBtn.innerHTML = '<i class="fas fa-italic"></i>';
      italicBtn.onclick = () => document.execCommand("italic", false, null);
      italicBtn.title = "Italic";

      // Underline button
      const underlineBtn = document.createElement("button");
      underlineBtn.innerHTML = '<i class="fas fa-underline"></i>';
      underlineBtn.onclick = () =>
        document.execCommand("underline", false, null);
      underlineBtn.title = "Underline";

      // Add buttons to toolbar
      toolbar.appendChild(boldBtn);
      toolbar.appendChild(italicBtn);
      toolbar.appendChild(underlineBtn);
      document.body.appendChild(toolbar);
    }
  }

  // Remove editing controls
  function removeEditingControls() {
    const toolbar = document.getElementById("formatting-toolbar");
    if (toolbar) {
      toolbar.remove();
    }
  }

  // Function to format the trip details

  // Main formatter function
  function formatTripDetails(aiResponse, tripData) {
    try {
      let textContent =
        typeof aiResponse === "object"
          ? aiResponse.message || JSON.stringify(aiResponse, null, 2)
          : String(aiResponse || "");

      textContent = textContent.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ""
      );

      return `
            <div class="itinerary-container">
                <div class="trip-header">
                    <h1><i class="fas fa-map-marked-alt"></i> ${escapeHtml(
                      tripData.destination || "Your Trip"
                    )} Itinerary</h1>
                    <div class="trip-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${escapeHtml(
                          tripData.startDate || "Start date"
                        )} to ${escapeHtml(tripData.endDate || "End date")}</span>
                        ${
                          tripData.customization
                            ? `<span><i class="fas fa-star"></i> ${escapeHtml(
                                tripData.customization
                              )}</span>`
                            : ""
                        }
                    </div>
                </div>
                ${formatTextResponse(textContent)}
            </div>
        `;
    } catch (error) {
      console.error("Error formatting trip details:", error);
      return `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Could not format itinerary. Showing raw content.</p>
                <div class="raw-content">${escapeHtml(aiResponse)}</div>
            </div>
        `;
    }
  }

  // Escape HTML tags and remove <strong>
  function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/<strong>/g, "") // Remove <strong> tags
      .replace(/<\/strong>/g, ""); // Remove </strong> tags
  }

  // General text formatter
  function formatTextResponse(text) {
    try {
      if (!text)
        return '<p class="no-content">No itinerary content available.</p>';
      text = text.replace(/\r\n/g, "\n").replace(/\n+/g, "\n").trim();

      if (/<[a-z][\s\S]*>/i.test(text)) {
        return `<div class="html-content">${escapeHtml(text)}</div>`;
      }

      const dayRegex = /(?:^|\n)(Day \d+|DAY \d+|day \d+)[:\-\n]/i;
      const hasDays = dayRegex.test(text);

      return hasDays
        ? formatDayByDayItinerary(text)
        : formatGeneralItinerary(text);
    } catch (error) {
      console.error("Error formatting text response:", error);
      return `<div class="general-itinerary">${escapeHtml(text)}</div>`;
    }
  }

  // Day-by-day block formatting
  function formatDayByDayItinerary(text) {
    try {
      const days = text.split(/(Day \d+|DAY \d+|day \d+)/i);
      let html = "";

      for (let i = 1; i < days.length; i += 2) {
        const dayTitle = days[i].trim();
        let dayContent = days[i + 1]
          ? days[i + 1].trim().replace(/^[:\-\s]+/, "")
          : "";

        html += `
                <div class="day-section">
                    <div class="day-header">
                        <i class="far fa-calendar-alt"></i>
                        <h2>${escapeHtml(dayTitle)}</h2>
                    </div>
                    <div class="day-content">
                        ${formatDayContent(dayContent)}
                    </div>
                </div>
            `;
      }

      return html || formatGeneralItinerary(text);
    } catch (error) {
      console.error("Error formatting day-by-day itinerary:", error);
      return formatGeneralItinerary(text);
    }
  }

  // Process content inside each day
  function formatDayContent(content) {
    try {
      const sections = content.split(
        /(📍|🏨|🍽|💡|Places to Visit|Stay|Food Recommendations|Extra Tips)/i
      );
      let html = "";

      for (let i = 1; i < sections.length; i += 2) {
        const sectionTitle = sections[i]?.trim();
        let sectionContent =
          sections[i + 1]?.trim().replace(/^[:\-\s]+/, "") || "";
        const { type, icon } = getSectionType(sectionTitle);

        html += `
                <div class="section ${type}">
                    <div class="section-header">
                        <span class="section-icon">${icon}</span>
                        <h3>${escapeHtml(
                          getFormattedSectionTitle(sectionTitle, type)
                        )}</h3>
                    </div>
                    <div class="section-content">
                        ${formatSectionContent(sectionContent, type)}
                    </div>
                </div>
            `;
      }

      return (
        html || `<div class="general-content">${escapeHtml(content)}</div>`
      );
    } catch (error) {
      console.error("Error formatting day content:", error);
      return escapeHtml(content);
    }
  }

  // Render section based on its type
  function formatSectionContent(content, type) {
    try {
      if (type === "places") return formatPlacesContent(content);
      if (type === "food") return formatFoodContent(content);
      return escapeHtml(content).replace(/\n/g, "<br>");
    } catch (error) {
      console.error("Error formatting section content:", error);
      return escapeHtml(content);
    }
  }

  // Show content split into time slots (morning/afternoon/evening)
  function formatPlacesContent(content) {
    try {
      const timeBlocks = content.split(/(🌅|🌞|🌙|Morning|Afternoon|Evening)/i);
      let html = "";

      for (let i = 1; i < timeBlocks.length; i += 2) {
        const timeTitle = timeBlocks[i]?.trim();
        let timeContent =
          timeBlocks[i + 1]?.trim().replace(/^[:\-\s]+/, "") || "";
        const timeIcon = getTimeIcon(timeTitle);

        html += `
                <div class="time-block">
                    <div class="time-header">
                        <span class="time-icon">${timeIcon}</span>
                        <h4>${escapeHtml(
                          getFormattedTimeTitle(timeTitle, timeIcon)
                        )}</h4>
                    </div>
                    <div class="time-content">
                        ${escapeHtml(timeContent).replace(/\n/g, "<br>")}
                    </div>
                </div>
            `;
      }

      return html || escapeHtml(content).replace(/\n/g, "<br>");
    } catch (error) {
      console.error("Error formatting places content:", error);
      return escapeHtml(content);
    }
  }

  // Food list formatter
  function formatFoodContent(content) {
    try {
      const items = content.split(/\n+/).filter(Boolean);
      return `<ul>${items
        .map((i) => `<li>${escapeHtml(i)}</li>`)
        .join("")}</ul>`;
    } catch (error) {
      console.error("Error formatting food content:", error);
      return escapeHtml(content);
    }
  }

  // Section & Icon helpers
  function getSectionType(title) {
    const lower = title?.toLowerCase() || "";
    if (lower.includes("place") || lower.includes("visit") || title === "📍")
      return { type: "places", icon: "📍" };
    if (lower.includes("stay") || lower.includes("hotel") || title === "🏨")
      return { type: "stay", icon: "🏨" };
    if (
      lower.includes("food") ||
      lower.includes("eat") ||
      lower.includes("dining") ||
      title === "🍽"
    )
      return { type: "food", icon: "🍽" };
    if (lower.includes("tip") || lower.includes("note") || title === "💡")
      return { type: "tips", icon: "💡" };
    return { type: "general", icon: "📄" };
  }

  function getFormattedSectionTitle(title, type) {
    if (!title || title.length <= 2) {
      switch (type) {
        case "places":
          return "Places to Visit";
        case "stay":
          return "Accommodation";
        case "food":
          return "Food Suggestions";
        case "tips":
          return "Travel Tips";
        default:
          return "Details";
      }
    }
    return title.replace(/[📍🏨🍽💡]/g, "").trim();
  }

  function getTimeIcon(title) {
    return title?.toLowerCase().includes("morning")
      ? "🌅"
      : title?.toLowerCase().includes("afternoon")
      ? "🌞"
      : title?.toLowerCase().includes("evening")
      ? "🌙"
      : "⏱";
  }

  function getFormattedTimeTitle(title, icon) {
    if (!title || title.length <= 2) {
      return icon === "🌅"
        ? "Morning"
        : icon === "🌞"
        ? "Afternoon"
        : icon === "🌙"
        ? "Evening"
        : "Time";
    }
    return title.replace(/[🌅🌞🌙]/g, "").trim();
  }

  // Fallback formatting
  function formatGeneralItinerary(text) {
    return `<div class="general-itinerary">${escapeHtml(text).replace(
      /\n/g,
      "<br>"
    )}</div>`;
  }

  // Get corresponding icon for section title
  function getIconForSection(title) {
    switch (title) {
      case "Hotel Details":
      case "Accommodation":
        return "bed";
      case "Places to Visit":
      case "Sightseeing":
        return "map-marker-alt";
      case "Food Recommendations":
      case "Dining Options":
        return "utensils";
      case "Activities & Experiences":
      case "Things to Do":
        return "star";
      case "Additional Tips":
      case "Notes":
        return "sticky-note";
      default:
        return "file";
    }
  }

  // Download itinerary as PDF
  window.downloadPDF = function () {
    showToast("Preparing your PDF...");

    const tripDetailsDiv = document.getElementById("tripDetails");

    // Options for html2canvas
    const options = {
      scale: 2, // Higher quality
      logging: false,
      useCORS: true,
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    };

    // Create PDF from the trip details div
    html2canvas(tripDetailsDiv, options)
      .then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
        });

        // Calculate the PDF dimensions
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        // Add the image to the PDF
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

        // Save the PDF
        pdf.save("Trip_Itinerary.pdf");
        showToast("PDF downloaded successfully!");
      })
      .catch((err) => {
        console.error("Error generating PDF:", err);
        showToast("Error generating PDF", "error");

        // Fallback to simple text PDF if image capture fails
        const pdf = new jsPDF();
        const text = tripDetailsDiv.innerText || tripDetailsDiv.textContent;
        pdf.text(text, 10, 10);
        pdf.save("Trip_Itinerary_Simple.pdf");
      });
  };

  window.goBack = function () {
    window.location.href = "home.html";
  };
});
