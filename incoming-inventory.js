(function () {
  "use strict";

  var DEFAULT_CONTACT_URL = "/contactusform/";
  var INCOMING_STATUS = "incoming";

  var MODEL_DISPLAY_NAMES = {
    "ct4": "CT4",
    "ct5": "CT5",
    "ct5-v": "CT5-V",
    "ct5 v": "CT5-V",
    "xt4": "XT4",
    "xt5": "XT5",
    "xt6": "XT6",
    "escalade": "Escalade",
    "escalade iq": "Escalade IQ",
    "lyriq": "Lyriq"
  };

  var MODEL_ORDER = [
    "CT4",
    "CT5",
    "CT5-V",
    "XT4",
    "XT5",
    "XT6",
    "Lyriq",
    "Escalade",
    "Escalade IQ"
  ];

  var TABLE_COLUMNS = [
    { key: "year", label: "Year", cellClass: "cochran-incoming-table__year" },
    { key: "model", label: "Model", cellClass: "cochran-incoming-table__model" },
    { key: "trim", label: "Trim", cellClass: "cochran-incoming-table__trim" },
    { key: "msrp", label: "MSRP", cellClass: "cochran-incoming-table__msrp" },
    { key: "orderNumber", label: "Order Number", cellClass: "cochran-incoming-table__order" },
    { key: "exteriorColor", label: "Exterior Color", cellClass: "cochran-incoming-table__exterior" },
    { key: "interiorColor", label: "Interior Color", cellClass: "cochran-incoming-table__interior" }
  ];

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeIncomingInventory);
  } else {
    initializeIncomingInventory();
  }

  function initializeIncomingInventory() {
    var pages = document.querySelectorAll("[data-cochran-incoming-page]");

    pages.forEach(function (page) {
      loadInventory(page);
    });
  }

  function loadInventory(page) {
    var source = page.getAttribute("data-cochran-incoming-source") || "data/cadillac-incoming.json";
    var statusElement = page.querySelector("[data-cochran-incoming-status]");

    setStatus(statusElement, "Loading incoming Cadillac vehicles...");

    fetch(source, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Inventory request failed with status " + response.status);
        }

        return response.json();
      })
      .then(function (inventoryData) {
        renderInventory(page, inventoryData || {});
      })
      .catch(function () {
        setStatus(statusElement, "We could not load the incoming Cadillac inventory right now. Please contact our team for the latest arrivals.", true);
      });
  }

  function renderInventory(page, inventoryData) {
    var groupsElement = page.querySelector("[data-cochran-incoming-groups]");
    var statusElement = page.querySelector("[data-cochran-incoming-status]");
    var updatedElement = page.querySelector("[data-cochran-incoming-last-updated]");
    var vehicles = Array.isArray(inventoryData.vehicles) ? inventoryData.vehicles : [];
    var contactUrl = cleanContactUrl(inventoryData.contactUrl);
    var incomingVehicles = vehicles
      .filter(isIncomingVehicle)
      .map(normalizeVehicle);
    var groupedVehicles = groupVehiclesByModel(incomingVehicles);

    if (!groupsElement) {
      setStatus(statusElement, "The incoming Cadillac inventory section is missing its vehicle list container.", true);
      return;
    }

    groupsElement.textContent = "";

    if (updatedElement) {
      updatedElement.textContent = formatLastUpdated(inventoryData.lastUpdated);
    }

    if (!incomingVehicles.length) {
      setStatus(statusElement, "No incoming Cadillac vehicles are listed right now. Please contact our team for upcoming availability.");
      return;
    }

    setStatus(statusElement, "");

    Object.keys(groupedVehicles)
      .sort(compareModels)
      .forEach(function (modelName) {
        groupsElement.appendChild(createModelCard(modelName, groupedVehicles[modelName], contactUrl));
      });
  }

  function isIncomingVehicle(vehicle) {
    return normalizeStatus(vehicle && vehicle.status) === INCOMING_STATUS;
  }

  function normalizeVehicle(vehicle) {
    return {
      year: normalizeYear(vehicle.year),
      model: formatModel(vehicle.model),
      trim: toTitleCase(vehicle.trim),
      msrp: formatMsrp(vehicle.msrp),
      orderNumber: normalizeOrderNumber(vehicle.orderNumber || vehicle.order_number),
      exteriorColor: toTitleCase(vehicle.exteriorColor || vehicle.exterior_color),
      interiorColor: toTitleCase(vehicle.interiorColor || vehicle.interior_color)
    };
  }

  function groupVehiclesByModel(vehicles) {
    return vehicles.reduce(function (groups, vehicle) {
      var modelName = vehicle.model || "Cadillac";

      if (!groups[modelName]) {
        groups[modelName] = [];
      }

      groups[modelName].push(vehicle);
      return groups;
    }, {});
  }

  function createModelCard(modelName, vehicles, contactUrl) {
    var card = document.createElement("article");
    var header = document.createElement("div");
    var headingContent = document.createElement("div");
    var eyebrow = document.createElement("p");
    var heading = document.createElement("h3");
    var count = document.createElement("p");
    var action = document.createElement("a");
    var tableScroll = document.createElement("div");
    var table = createVehicleTable(modelName, vehicles);

    card.className = "cochran-incoming-card";
    header.className = "cochran-incoming-card__header";
    eyebrow.className = "cochran-incoming-card__eyebrow";
    heading.className = "cochran-incoming-card__model";
    count.className = "cochran-incoming-card__count";
    action.className = "cochran-incoming-card__action";
    tableScroll.className = "cochran-incoming-table-scroll";

    eyebrow.textContent = "Incoming Model";
    heading.textContent = modelName;
    count.textContent = vehicles.length + " " + pluralize("vehicle", vehicles.length) + " arriving soon";
    action.href = contactUrl;
    action.textContent = "Contact Us To Reserve";

    headingContent.appendChild(eyebrow);
    headingContent.appendChild(heading);
    headingContent.appendChild(count);
    header.appendChild(headingContent);
    header.appendChild(action);
    tableScroll.appendChild(table);
    card.appendChild(header);
    card.appendChild(tableScroll);

    return card;
  }

  function createVehicleTable(modelName, vehicles) {
    var table = document.createElement("table");
    var caption = document.createElement("caption");
    var thead = document.createElement("thead");
    var tbody = document.createElement("tbody");
    var headRow = document.createElement("tr");

    table.className = "cochran-incoming-table";
    caption.textContent = "Incoming " + modelName + " vehicles";
    table.appendChild(caption);

    TABLE_COLUMNS.forEach(function (column) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = column.label;
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);

    vehicles.forEach(function (vehicle) {
      var row = document.createElement("tr");

      TABLE_COLUMNS.forEach(function (column) {
        var cell = document.createElement("td");
        cell.className = column.cellClass;
        cell.textContent = vehicle[column.key] || "";
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    return table;
  }

  function setStatus(statusElement, message, isError) {
    if (!statusElement) {
      return;
    }

    statusElement.textContent = message || "";
    statusElement.classList.toggle("cochran-incoming-status--error", Boolean(isError));
  }

  function formatLastUpdated(value) {
    var cleanedValue = normalizeWhitespace(value);

    if (!cleanedValue) {
      return "";
    }

    return "Last Updated: " + cleanedValue;
  }

  function normalizeStatus(value) {
    return normalizeWhitespace(value).toLowerCase();
  }

  function normalizeYear(value) {
    return normalizeWhitespace(value);
  }

  function normalizeOrderNumber(value) {
    return normalizeWhitespace(value).toUpperCase();
  }

  function cleanContactUrl(value) {
    var cleanedValue = normalizeWhitespace(value);

    if (!cleanedValue) {
      return DEFAULT_CONTACT_URL;
    }

    if (/^(https?:\/\/|\/(?!\/)|#)/i.test(cleanedValue)) {
      return cleanedValue;
    }

    return DEFAULT_CONTACT_URL;
  }

  function formatModel(value) {
    var cleanedValue = normalizeWhitespace(value);
    var key = cleanedValue.toLowerCase();

    return MODEL_DISPLAY_NAMES[key] || toTitleCase(cleanedValue);
  }

  function formatMsrp(value) {
    var cleanedValue = normalizeWhitespace(value);
    var numberValue;

    if (!cleanedValue) {
      return "";
    }

    numberValue = Number(String(cleanedValue).replace(/[$,]/g, ""));

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return cleanedValue;
    }

    return "$" + numberValue.toLocaleString("en-US", {
      maximumFractionDigits: 0
    });
  }

  function toTitleCase(value) {
    var cleanedValue = normalizeWhitespace(value);

    if (!cleanedValue) {
      return "";
    }

    return cleanedValue
      .toLowerCase()
      .split(" ")
      .map(function (word) {
        return formatTitleWord(word);
      })
      .join(" ");
  }

  function formatTitleWord(word) {
    var lowerWord = word.toLowerCase();
    var upperWord = word.toUpperCase();
    var acronymWords = {
      "awd": "AWD",
      "rwd": "RWD",
      "4wd": "4WD",
      "iq": "IQ",
      "led": "LED",
      "vin": "VIN"
    };

    if (acronymWords[lowerWord]) {
      return acronymWords[lowerWord];
    }

    if (/^[a-z]+-[a-z0-9]+$/i.test(word)) {
      return word
        .split("-")
        .map(formatTitleWord)
        .join("-");
    }

    if (/^[a-z]{1,3}[0-9]+$/i.test(word) || /^[a-z]+[0-9]+$/i.test(word)) {
      return upperWord;
    }

    return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
  }

  function normalizeWhitespace(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).replace(/\s+/g, " ").trim();
  }

  function pluralize(word, count) {
    return count === 1 ? word : word + "s";
  }

  function compareModels(modelA, modelB) {
    var orderA = MODEL_ORDER.indexOf(modelA);
    var orderB = MODEL_ORDER.indexOf(modelB);

    if (orderA !== -1 || orderB !== -1) {
      if (orderA === -1) {
        return 1;
      }

      if (orderB === -1) {
        return -1;
      }

      return orderA - orderB;
    }

    return modelA.localeCompare(modelB);
  }
})();
