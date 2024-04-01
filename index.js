/**
 * Constants
 */

const MINUTE_HEIGHT_NORMAL = 30 / 24; // 24px is 30 minutes on normal screens
const MINUTE_HEIGHT_SMALL = 30 / 20; // 20px is 30 minutes on small screens
const EVENT_BORDER_SIZE = 2; // there is 2px of gap at the bottom of each event
const MINUTES_PER_DAY = 7 * 60; // 7 hours in a day of work
const NOT_ACCEPTED_YET_MEETINGS_COLOR = "rgb(255, 255, 255)";
let minuteHeight = MINUTE_HEIGHT_NORMAL;
const CUSTOM_EVENT_TITLES = {
  "🧑🏻‍💻": "blue",
};

/**
 * i18n utils
 */
const language = navigator.language;
const translations = {
  fr: {
    title: "Temps passé",
    day: "j",
  },
  en: {
    title: "Time spent",
    day: "d",
  },
};

const i18n = {
  t: (key) => {
    if (translations.hasOwnProperty(language)) {
      return translations[language][key];
    }
    return translations.en[key]
  },
};

/**
 * Util for parsing string color to array of numbers
 * ex: parseRGBColor('rgb(255, 136, 124)') => [255, 136, 124]
 */

const parseRGBColor = (rgbColor) =>
  rgbColor
    ? rgbColor
      .replace("rgb(", "")
      .replace(")", "")
      .replace(" ", "")
      .split(",")
      .map((string) => parseInt(string))
    : parseRGBColor(NOT_ACCEPTED_YET_MEETINGS_COLOR);

const updateMinutesScale = () => {
  if (window.innerHeight < 700) {
    minuteHeight = MINUTE_HEIGHT_SMALL;
  } else {
    minuteHeight = MINUTE_HEIGHT_NORMAL;
  }
};

const getTimeFromEventSize = (event) =>
  (parseInt(event.style.height.replace("px", "") || 0) +
    EVENT_BORDER_SIZE) *
  minuteHeight;

const formatTime = (time) =>
  `${time >= 60 ? `${Math.trunc(time / 60)}h` : ""} ${time % 60 !== 0 ? `${time % 60}m` : ""}`;

const renderDataRow = (dotColor, textContent, table) => {
  const item = document.createElement("li");
  item.style.display = "flex";
  item.style.alignItems = "center";
  item.style.marginBottom = "12px";

  const colorDot = document.createElement("span");
  colorDot.style.display = "inline-block";
  colorDot.style.height = "20px";
  colorDot.style.width = "20px";
  colorDot.style.borderRadius = "20px";
  colorDot.style.backgroundColor = dotColor;
  colorDot.style.marginRight = "8px";
  if (dotColor === NOT_ACCEPTED_YET_MEETINGS_COLOR)
    colorDot.style.border = "1px solid black";

  const text = document.createElement("span");
  text.style.color = "#3c4043";
  text.style.fontSize = "14px";
  text.style.fontWeight = "400";
  text.style.lineHeight = "16px";
  text.style.fontFamily = "Roboto,Helvetica,Arial,sans-serif";
  text.textContent = textContent;

  item.appendChild(colorDot);
  item.appendChild(text);
  table.appendChild(item);
};

const computeColorData = (table) => {
  updateMinutesScale();
  table.textContent = "";
  /**
   * Compute data
   */
  const events = document.querySelectorAll("[data-eventchip]");

  const colorEvents = {};
  events.forEach((event) => {
    let eventColor =
      event.style.backgroundColor || NOT_ACCEPTED_YET_MEETINGS_COLOR;

    if (!colorEvents[eventColor]) colorEvents[eventColor] = [];
    colorEvents[eventColor].push(event);
  });

  /**
   * Merge colors (handling past events opacity).
   * To get the color of the past events google does 255 - [(255 - color) * 0.3], i.e. 178.5 + 0.3 * color
   */

  const parsedColors = Object.keys(colorEvents).map((colorKey) => ({
    original: colorKey,
    parsed: parseRGBColor(colorKey),
  }));
  const findPastEventsColor = (color) => {
    return parsedColors.find((lookupColor) => {
      return (
        color
          .map(
            (value, index) =>
              Math.abs(value * 0.3 + 178.5 - lookupColor.parsed[index]) < 1.5
          )
          .reduce((acc, val) => acc && val) && color !== lookupColor.parsed
      );
    });
  };

  parsedColors.forEach((color) => {
    const pastEventsColor = findPastEventsColor(color.parsed);
    if (
      pastEventsColor &&
      pastEventsColor.original !== NOT_ACCEPTED_YET_MEETINGS_COLOR &&
      color.original !== NOT_ACCEPTED_YET_MEETINGS_COLOR
    ) {
      colorEvents[color.original] = [
        ...colorEvents[color.original],
        ...colorEvents[pastEventsColor.original],
      ];
      delete colorEvents[pastEventsColor.original];
    }
  });

  const colors = Object.keys(colorEvents).map((color) => {
    const timeInSeconds = colorEvents[color].reduce((time, event) => {
      return time + getTimeFromEventSize(event);
    }, 0);
    return {
      color: color,
      timeInSeconds,
      time: formatTime(timeInSeconds),
    };
  });

  /**
   * Add elements for each color
   */
  colors
    .sort((colorA, colorB) => colorB.timeInSeconds - colorA.timeInSeconds)
    .forEach((color) => {
      renderDataRow(color.color, color.time, table);
    });
};

const computeCustomData = (table) => {
  table.textContent = "";
  const parsedEventLengths = {};
  for (const key in CUSTOM_EVENT_TITLES) {
    parsedEventLengths[key] = 0;
  }


  const events = document.querySelectorAll("[data-eventchip]");
  events.forEach((event) => {
    for (const key in CUSTOM_EVENT_TITLES) {
      if (event.innerText.includes(key)) {
        let eventLength = parseInt(getTimeFromEventSize(event));
        if (eventLength < 15) eventLength = 0;
        parsedEventLengths[key] += eventLength;
      }
    }
  });

  for (const [title, colorValue] of Object.entries(CUSTOM_EVENT_TITLES)) {
    if (parsedEventLengths[title] != 0) renderDataRow(colorValue, `${title} - ${formatTime(parsedEventLengths[title])}`, table);
  }

};

const renderTable = (titleContent) => {
  const table = document.createElement("ul");
  table.style.paddingLeft = "28px";
  table.style.margin = "4px 0px 8px";

  const title = document.createElement("div");
  title.style.margin = "20px 20px 8px 28px";
  title.style.display = "flex";
  title.style.alignItems = "center";

  const titleText = document.createElement("span");
  titleText.textContent = titleContent;
  titleText.style.flexGrow = "1";
  titleText.style.fontFamily = "'Google Sans',Roboto,Arial,sans-serif";
  titleText.style.fontSize = "14px";
  titleText.style.fontWeight = "500";
  titleText.style.letterSpacing = ".25px";
  titleText.style.lineHeight = "16px";
  titleText.style.color = "#3c4043";
  title.appendChild(titleText);

  const miniMonthNavigator = document.getElementById(
    "drawerMiniMonthNavigator"
  );
  miniMonthNavigator.insertAdjacentElement("afterend", table);
  miniMonthNavigator.insertAdjacentElement("afterend", title);

  return table;
};

const customSearch = (event) => {
  if(event.key === 'Enter') {
    const inputValue = document.getElementById("google-calendar-time-spent-custom-search").value;
    CUSTOM_EVENT_TITLES[inputValue] = 'grey';
    document.getElementById("google-calendar-time-spent-custom-search").value = "";
  }
};

const renderSearch = () => {
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder="Custom Event Search";
  input.id = "google-calendar-time-spent-custom-search";
  input.class="search";
  input.onkeydown = customSearch;

  const miniMonthNavigator = document.getElementById(
    "drawerMiniMonthNavigator"
  );
  miniMonthNavigator.insertAdjacentElement("afterend", input);

  return input;
};

init = () => {
  const customTable = renderTable("Custom Table");
  const customSearch = renderSearch();
  setInterval(() => { computeCustomData(customTable) }, 500);
  /**
   * Build table with time details
   */
  const table = renderTable(i18n.t("title"));
  setInterval(() => { computeColorData(table) }, 500);
};

/**
 * We try to init every half of a second
 */
const initInterval = setInterval(() => {
  const meetingWithSearchBox = document.querySelectorAll("[role=search]");
  if (meetingWithSearchBox.length) {
    init();
    clearInterval(initInterval);
  }
}, 500);
