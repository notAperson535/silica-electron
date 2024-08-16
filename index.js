let form = document.querySelector("form");
let urlBar = document.querySelector("#urlBar input");
let tabsContainer = document.querySelector("#tabs");
let hoverLink = document.querySelector("#hoverLink");
let urlRecommendations = document.querySelector("#urlRecommendations");
let alertBox = document.querySelector("#alert");
let popupBox = document.querySelector("#popup");

let tabCounter = 1;

let savedRecommendations;
let recentlyClosed = [];
let preferences = {};
let history = [];

/** @namespace window.api **/

// function isValidUrl(url) {
//     if (!(url.includes("https://") || url.includes("http://"))) {
//         url = "https://" + url;
//     }
//
//     return fetch(url)
//         .then((response) => {
//             return response.ok;
//         })
//         .catch((error) => {
//             console.error("Error:", error);
//             return false;
//         });
// }

function isValidUrl(url) {
    if (!(url.includes("https://") || url.includes("http://"))) {
        url = "https://" + url;
    }
    let res = url.match(
        /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.\S{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.\S{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.\S{2,}|www\.[a-zA-Z0-9]+\.\S{2,})/gi
    );
    return res !== null;
}

function doesMatchValueInArray(term, array) {
    let result = false;
    for (let i = 0; i < array.length; i++) {
        if (term.toLowerCase() === array[i].toLowerCase()) {
            result = true;
        }
    }
    return result;
}

urlBar.addEventListener("focusin", () => {
    urlBar.select();
    // showRecommendations();
    // urlRecommendations.style.display = "initial";
    form.classList.add("focus");
});
urlBar.addEventListener("focusout", () => {
    urlRecommendations.style.display = "none";
    form.classList.remove("focus");
});

let selectedIndex = 0;

urlBar.onkeyup = function (event) {
    if (event.key === "Escape" || event.key === "Esc") {
        urlBar.blur();
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (selectedIndex <= 0) {
            selectedIndex = urlRecommendations.querySelectorAll("p").length - 1;
        } else {
            selectedIndex--;
        }
        urlBar.value =
            urlRecommendations.querySelectorAll("p")[selectedIndex].textContent;
        selectCurrentRecommendation();
    } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (
            selectedIndex >=
            urlRecommendations.querySelectorAll("p").length - 1
        ) {
            selectedIndex = 0;
        } else {
            selectedIndex++;
        }
        urlBar.value =
            urlRecommendations.querySelectorAll("p")[selectedIndex].textContent;
        selectCurrentRecommendation();
    } else if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        showRecommendations();
        selectCurrentRecommendation();
    }
};

function showRecommendations() {
    urlRecommendations.innerHTML = "";
    let url =
        "https://suggestqueries.google.com/complete/search?output=toolbar&hl=en&q=" +
        urlBar.value;

    if (urlBar.value !== "") {
        fetch(url)
            .then((response) => response.text())
            .then((data) => {
                let suggestion = document.createElement("p");
                suggestion.textContent = urlBar.value;
                urlRecommendations.appendChild(suggestion);

                savedRecommendations.sort((a, b) => {
                    let urlA = Object.keys(a)[0];
                    let urlB = Object.keys(b)[0];
                    if (
                        urlA.startsWith(urlBar.value) &&
                        !urlB.startsWith(urlBar.value)
                    ) {
                        return -1;
                    } else if (
                        !urlA.startsWith(urlBar.value) &&
                        urlB.startsWith(urlBar.value)
                    ) {
                        return 1;
                    } else {
                        return Object.values(b)[0] - Object.values(a)[0];
                    }
                });

                let savedSuggestions = [];

                for (let i = 0; i < savedRecommendations.length; i++) {
                    let savedName = Object.keys(savedRecommendations[i])[0];

                    let parts = savedName.split(".");
                    if (parts.length > 1) {
                        parts.splice(-1, 1);
                    }
                    let nameWithoutTld = parts.join(".");
                    let lowercaseValue = urlBar.value.toLowerCase();

                    if (nameWithoutTld.toLowerCase().includes(lowercaseValue)) {
                        if (nameWithoutTld.startsWith(lowercaseValue)) {
                            if (lowercaseValue !== savedName)
                                savedSuggestions.push(savedName);
                        } else if (
                            nameWithoutTld.includes(lowercaseValue) &&
                            lowercaseValue.length >= 3
                        ) {
                            savedSuggestions.push(savedName);
                        }
                    }
                }

                for (let i = 0; i < savedSuggestions.length; i++) {
                    let suggestion = document.createElement("p");
                    suggestion.textContent = savedSuggestions[i];
                    urlRecommendations.appendChild(suggestion);
                }

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data, "text/xml");

                const suggestions = xmlDoc.getElementsByTagName("suggestion");

                for (let i = 0; i < suggestions.length; i++) {
                    let suggestionText = suggestions[i].getAttribute("data");
                    if (
                        suggestionText.toLowerCase() !==
                            urlBar.value.toLowerCase() &&
                        !doesMatchValueInArray(suggestionText, savedSuggestions)
                    ) {
                        let suggestion = document.createElement("p");
                        suggestion.textContent = suggestionText;
                        urlRecommendations.appendChild(suggestion);
                    }
                }
                selectedIndex = 0;

                selectCurrentRecommendation();
            })
            .catch((error) => {
                console.error("Error fetching or parsing XML:", error);
            });
    }
}

function selectCurrentRecommendation() {
    if (urlRecommendations.innerHTML !== "") {
        urlRecommendations.querySelectorAll("p").forEach((el) => {
            el.classList.remove("selected");
        });

        urlRecommendations
            .querySelectorAll("p")
            [selectedIndex].classList.add("selected");
    }
}

function goToURL(url) {
    let webview = document.querySelector("webview.active");
    if (url.includes("silica://")) {
        showAppWindow(url);
    } else {
        let isValid = isValidUrl(url);
        if (isValid) {
            if (!(url.includes("https://") || url.includes("http://"))) {
                url = "https://" + url;
            }
            void webview.loadURL(url);
        } else {
            void webview.loadURL("https://google.com/search?q=" + url);
        }
    }
}

form.onsubmit = function (event) {
    urlRecommendations.innerHTML = "";
    event.preventDefault();
    goToURL(urlBar.value);
    urlRecommendations.style.display = "none";
    urlBar.blur();
};

function showAppWindow(url) {
    document.querySelectorAll("#settings > *").forEach((el) => {
        el.style.display = "none";
    });
    document.querySelector("#settings > .sidebar").style.display = "flex";
    let window = document.querySelector(
        "#settings > ." + url.split("silica://")[1]
    );
    if (window === undefined || window === null) {
        window = document.querySelector("#settings > .notFound");
    }
    document.querySelector("webview.active").style.display = "none";
    document.querySelector("#settings").style.display = "flex";
    window.style.display = "flex";
}

function checkCanNavigate(webview) {
    if (webview.canGoBack() === true) {
        document.querySelector("#back").classList.add("active");
    } else {
        document.querySelector("#back").classList.remove("active");
    }
    if (webview.canGoForward() === true) {
        document.querySelector("#forward").classList.add("active");
    } else {
        document.querySelector("#forward").classList.remove("active");
    }
}

function newTab(url) {
    let isNew = true;

    let tab = document.createElement("div");
    tab.classList.add("tab");
    tab.id = "tab" + tabCounter;
    tabsContainer.appendChild(tab);

    let favicon = document.createElement("img");
    favicon.src = "assets/logo.png";
    favicon.classList.add("favicon");
    tab.appendChild(favicon);

    let tabName = document.createElement("p");
    tabName.textContent = "New tab";
    tab.appendChild(tabName);

    let close = document.createElement("p");
    close.textContent = "􀆄";
    close.classList.add("close");
    tab.appendChild(close);
    close.addEventListener("click", function (event) {
        event.stopPropagation();
        if (!webview.getURL().includes("VisionTab/index.html"))
            recentlyClosed.push(webview.getURL());
        window.api.send("writeFile", [recentlyClosed, "recentlyClosed"]);
        if (tab.classList.contains("active")) {
            if (tab.nextElementSibling != null) {
                tab.nextElementSibling.click();
            } else if (tab.previousElementSibling != null) {
                tab.previousElementSibling.click();
            } else {
                window.api.send("closeWindow");
            }
        }
        tab.remove();
        webview.remove();
        if (document.querySelector(".tab") == null) {
            window.api.send("closeWindow");
        }
    });

    let webview = document.createElement("webview");
    webview.id = "webview" + tabCounter;
    if (url === undefined) {
        webview.src = "./VisionTab/index.html";
        urlBar.focus();
    } else {
        webview.src = url;
    }
    webview.setAttribute("allowpopups", "true");
    document.body.appendChild(webview);

    function onClick() {
        document.querySelectorAll(".tab").forEach((el) => {
            el.classList.remove("active");
        });
        document.querySelectorAll("webview").forEach((el) => {
            el.classList.remove("active");
            el.style.display = "none";
            el.blur();
        });
        tab.classList.add("active");
        webview.classList.add("active");
        webview.style.display = "flex";
        if (!webview.src.includes("VisionTab/index.html")) {
            urlBar.value = webview.src;
            urlBar.blur();
            webview.focus();
        } else {
            urlBar.value = "";
            urlBar.focus();
        }
        try {
            checkCanNavigate(webview);
        } catch (err) {}
        try {
            window.api.send("newSelectedTab", webview.getWebContentsId());
        } catch (err) {}
    }

    onClick();

    tab.addEventListener("click", onClick);

    webview.addEventListener("did-start-loading", function () {
        favicon.src = "assets/loading_favicon.svg";
    });

    function updateFavicon() {
        if (!webview.src.includes("VisionTab/index.html")) {
            /** @namespace webview.dataset.favicon **/
            if (webview.dataset.favicon === undefined) {
                favicon.src =
                    "https://democratic-gray-boar.faviconkit.com/" +
                    webview
                        .getURL()
                        .replace("https://", "")
                        .replace("http://", "")
                        .split("/")[0] +
                    "/32";
            } else {
                favicon.src = webview.dataset.favicon;
            }
            if (favicon.src.includes("null")) {
                favicon.src = "assets/logo_transparent_white.png";
            }
        } else {
            favicon.src = "assets/logo_transparent_white.png";
        }
    }

    webview.addEventListener("dom-ready", async function () {
        if (isNew) {
            window.api.send("newTab", webview.getWebContentsId());
            isNew = false;
        } else {
            window.api.send("newSelectedTab", webview.getWebContentsId());
        }

        if (!webview.src.includes("VisionTab/index.html")) {
            if (webview.src.includes("chromewebstore")) {
                alertBox.style.display = "flex";
                alertBox.innerHTML = "";

                let p = document.createElement("p");
                p.textContent =
                    "Looks like you're trying to install a browser extension! To install one, you need to copy the extension url, and then paste it in the box below and hit enter";
                alertBox.appendChild(p);

                let form = document.createElement("form");
                alertBox.appendChild(form);

                let input = document.createElement("input");
                form.appendChild(input);

                webview.style.height = "calc(100% - 195px)";

                form.onsubmit = function (event) {
                    event.preventDefault();
                    if (input.value !== "") {
                        const url = new URL(input.value);
                        const pathname = url.pathname;
                        const lastPart = pathname.substring(
                            pathname.lastIndexOf("/") + 1
                        );
                        window.api.send("downloadExtension", lastPart);
                    }
                };
            } else {
                alertBox.style.display = "none";
                tabName.textContent = webview.getTitle();
                updateFavicon();

                if (webview.classList.contains("active")) {
                    urlBar.value = webview.getURL();
                }
            }
        } else {
            tabName.textContent = "New tab";
            urlBar.value = "";
            favicon.src = "assets/logo_transparent_white.png";
        }

        let url = webview.getURL();
        url = url
            .replace("https://", "")
            .replace("http://", "")
            .replace("www.", "")
            .split("/")[0];
        let index = savedRecommendations.findIndex((obj) =>
            obj.hasOwnProperty(url)
        );
        if (index !== -1) {
            savedRecommendations[index][url]++;
        } else {
            savedRecommendations.push({
                [url]: 1,
            });
        }
        window.api.send("writeFile", [
            savedRecommendations,
            "savedRecommendations",
        ]);
        checkCanNavigate(webview);
    });

    webview.addEventListener("did-stop-loading", function () {
        updateFavicon();
    });

    webview.addEventListener("update-target-url", function (event) {
        if (event.url === "") {
            hoverLink.style.display = "none";
        } else {
            if (window.innerWidth > 150) {
                hoverLink.style.maxWidth = "400px";
            } else {
                hoverLink.style.maxWidth = window.innerWidth - 35 + "px";
            }
            hoverLink.style.display = "flex";
            hoverLink.querySelector("p").textContent = event.url;
        }
    });

    webview.addEventListener("page-favicon-updated", function (event) {
        if (!webview.src.includes("VisionTab/index.html")) {
            function getBiggestImage(imageUrls) {
                return new Promise((resolve) => {
                    let biggestImage = {
                        url: null,
                        width: 0,
                        height: 0,
                        area: 0,
                    };
                    let loadedImages = 0;

                    imageUrls.forEach((url) => {
                        let img = new Image();
                        img.onload = function () {
                            let area = img.width * img.height;
                            if (area > biggestImage.area) {
                                biggestImage = {
                                    url: url,
                                    width: img.width,
                                    height: img.height,
                                    area: area,
                                };
                            }
                            loadedImages++;
                            if (loadedImages === imageUrls.length) {
                                resolve(biggestImage.url);
                            }
                        };
                        img.onerror = function () {
                            loadedImages++;
                            if (loadedImages === imageUrls.length) {
                                resolve(biggestImage.url);
                            }
                        };
                        img.src = url;
                    });
                });
            }

            getBiggestImage(event.favicons)
                .then((biggestImageUrl) => {
                    webview.setAttribute("data-favicon", biggestImageUrl);
                    updateFavicon();
                    let favicon = webview.dataset.favicon;
                    let title = webview.getTitle();
                    let url = webview.getURL();
                    let time = new Date().getTime();
                    history.unshift({ favicon, title, url, time });
                    window.api.send("writeFile", [history, "history"]);
                    reloadHistory();
                })
                .catch((error) => {
                    console.error("Error:", error);
                });
        }
    });
    tabCounter++;
}

document.querySelector("#sidebarToggle").onclick = function (e) {
    e.target.classList.toggle("open");
    document.querySelector("html").toggleAttribute("data-sidebarOpen");
};

document.querySelector("#back").onclick = function (e) {
    if (e.target.classList.contains("active"))
        document.querySelector("webview.active").goBack();
};

document.querySelector("#forward").onclick = function (e) {
    if (e.target.classList.contains("active"))
        document.querySelector("webview.active").goForward();
};

document.querySelector("#reload").onclick = function () {
    document.querySelector("webview.active").reload();
};

document.querySelector("#openHistory").onclick = function () {
    openHistory();
};

function openHistory() {
    reloadHistory();
    let homePage = document.querySelector("#sidebar > .home");
    let historyPage = document.querySelector("#sidebar > .history");
    homePage.style.scale = "0.99";
    homePage.style.opacity = "0";
    historyPage.style.display = "block";
    setTimeout(() => {
        homePage.style.scale = "";
        homePage.style.opacity = "";
        homePage.style.display = "none";
    }, 500);
}

function reloadHistory(term) {
    let historyPage = document.querySelector("#sidebar > .history");
    document
        .querySelectorAll(".history > .collapsible")
        .forEach((el) => el.remove());
    document
        .querySelectorAll(".history > .content")
        .forEach((el) => el.remove());

    let groupedHistory = {};

    history.forEach((item) => {
        let date = new Date(item.time);
        date = date.toDateString();
        if (!groupedHistory[date]) {
            groupedHistory[date] = [];
        }
        const existingIndex = groupedHistory[date].findIndex(
            (existingItem) => existingItem.url === item.url
        );
        if (existingIndex !== -1) {
            groupedHistory[date][existingIndex] = item;
        } else {
            groupedHistory[date].push(item);
        }
    });

    const result = [];
    for (const [date, historyItems] of Object.entries(groupedHistory)) {
        result.push({ date, history: historyItems });
    }

    console.log(JSON.stringify(result));

    result.forEach((el) => {
        let collapsible = document.createElement("div");
        collapsible.classList.add("collapsible");
        collapsible.textContent = el.date;
        historyPage.appendChild(collapsible);

        let p = document.createElement("p");
        p.textContent = "􀆈";
        collapsible.appendChild(p);

        collapsible.addEventListener("click", function () {
            let content = this.nextElementSibling;
            if (window.getComputedStyle(content).height !== "0px") {
                content.style.height = 0;
            } else {
                content.style.height = "auto";
            }
        });

        let content = document.createElement("div");
        content.classList.add("content");
        historyPage.appendChild(content);

        el.history.forEach((item) => {
            if (
                term === undefined ||
                item.title.toLowerCase().includes(term) ||
                item.url.toLowerCase().includes(term)
            ) {
                let parentDiv = document.createElement("div");
                content.appendChild(parentDiv);

                let img = document.createElement("img");
                img.src = item.favicon;
                parentDiv.appendChild(img);

                let childDiv = document.createElement("div");
                parentDiv.appendChild(childDiv);

                let p1 = document.createElement("p");
                p1.textContent = item.title;
                childDiv.appendChild(p1);

                let p2 = document.createElement("p");
                p2.textContent = item.url;
                childDiv.appendChild(p2);

                parentDiv.addEventListener("mouseup", (event) => {
                    if (event.button === 0) {
                        goToURL(item.url);
                    } else if (event.button === 1) {
                        newTab(item.url);
                    }
                });
            }
        });

        if (content.innerHTML === "") {
            collapsible.remove();
            content.remove();
        }
    });
}

document.querySelector(".history input").onkeyup = function (event) {
    reloadHistory(document.querySelector(".history input").value);
};

// close history panel button
document.querySelector(".history > h2 > p").onclick = function () {
    let homePage = document.querySelector("#sidebar > .home");
    let historyPage = document.querySelector("#sidebar > .history");
    homePage.style.display = "block";
    historyPage.style.scale = 1.01;
    historyPage.style.opacity = 0;
    setTimeout(() => {
        historyPage.style.scale = "";
        historyPage.style.opacity = "";
        historyPage.style.display = "none";
    }, 500);
};

window.api.handle(
    "openHistory",
    () =>
        function () {
            let historyPage = document.querySelector("#sidebar > .history");
            let homePage = document.querySelector("#sidebar > .home");
            let sidebarToggle = document.querySelector("#sidebarToggle");

            if (
                sidebarToggle.classList.contains("open") &&
                historyPage.style.display === "block"
            ) {
                sidebarToggle.classList.remove("open");
                document
                    .querySelector("html")
                    .removeAttribute("data-sidebarOpen");
            } else {
                sidebarToggle.classList.add("open");
                document
                    .querySelector("html")
                    .setAttribute("data-sidebarOpen", "");
            }

            if (historyPage.style.display !== "block") {
                openHistory();
            }
        }
);

window.api.handle(
    "newPopup",
    () =>
        function (event, data) {
            popupBox.innerHTML = "";
            if (data === "restartBrowser") {
                popupBox.style.display = "flex";

                let icon = document.createElement("p");
                icon.classList.add("icon");
                icon.textContent = "􀇾";
                popupBox.appendChild(icon);

                let p = document.createElement("p");
                p.textContent = "Please close and reopen browser to apply.";
                popupBox.appendChild(p);

                let yes = document.createElement("button");
                yes.classList.add("active");
                yes.textContent = "Restart browser";
                popupBox.appendChild(yes);

                let no = document.createElement("button");
                no.textContent = "Not now";
                popupBox.appendChild(no);

                yes.onclick = function () {
                    window.api.send("closeWindow");
                };

                no.onclick = function () {
                    popupBox.style.display = "none";
                };
            }
        }
);

window.api.handle(
    "newTab",
    () =>
        function (event, data) {
            if (data !== undefined) {
                newTab(data);
            } else {
                newTab();
            }
        }
);

window.api.handle(
    "reload",
    () =>
        function () {
            document.querySelector("webview.active").reload();
        }
);

window.api.handle(
    "closeCurrentTab",
    () =>
        function () {
            document.querySelector(".tab.active>.close").click();
        }
);

window.api.handle(
    "selectUrlBar",
    () =>
        function () {
            urlBar.focus();
        }
);

window.api.handle(
    "nextTab",
    () =>
        function () {
            let nextTab;
            let activeTab = document.querySelector(".tab.active");
            if (activeTab.nextElementSibling != null) {
                nextTab = activeTab.nextElementSibling;
            } else {
                nextTab = document.querySelector(".tab");
            }
            nextTab.click();
        }
);

window.api.handle(
    "previousTab",
    () =>
        function () {
            let nextTab;
            let allTabs = document.querySelectorAll(".tab");
            let activeTab = document.querySelector(".tab.active");
            if (activeTab.previousElementSibling != null) {
                nextTab = activeTab.previousElementSibling;
            } else {
                nextTab = allTabs[allTabs.length - 1];
            }
            nextTab.click();
        }
);

window.api.handle(
    "openRecentlyClosed",
    () =>
        function () {
            if (recentlyClosed.length !== 0) {
                newTab(recentlyClosed.pop());
            }
        }
);

window.onload = async function () {
    newTab();

    savedRecommendations = await window.api.send(
        "readFile",
        "savedRecommendations"
    );
    if (savedRecommendations === "") {
        savedRecommendations = [];
    }

    history = await window.api.send("readFile", "history");
    if (history === "") {
        history = [];
    }

    recentlyClosed = await window.api.send("readFile", "recentlyClosed");
    if (recentlyClosed === "") {
        recentlyClosed = [];
    }

    preferences = await window.api.send("readFile", "preferences");
    if (preferences === "") {
        preferences = {};
    }
};
