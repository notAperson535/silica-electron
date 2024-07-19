let form = document.querySelector("form");
let urlBar = document.querySelector("#urlBar input");
let tabsContainer = document.querySelector("#tabs");
let hoverLink = document.querySelector("#hoverLink");
let urlRecommendations = document.querySelector("#urlRecommendations");

let tabCounter = 1;

let savedRecommendations;
let recentlyClosed = [];
let preferences = { darkMode: false };

/** @namespace window.api **/

function isValidUrl(url) {
    if (!(url.includes("https://") || url.includes("http://"))) {
        url = "https://" + url;
    }

    return fetch(url)
        .then((response) => {
            return response.ok;
        })
        .catch((error) => {
            console.error("Error:", error);
            return false;
        });
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

form.onsubmit = function (event) {
    urlRecommendations.innerHTML = "";
    event.preventDefault();
    let webview = document.querySelector("webview.active");
    let url = form.querySelector("input").value;
    isValidUrl(url).then((isValid) => {
        if (isValid) {
            if (!(url.includes("https://") || url.includes("http://"))) {
                url = "https://" + url;
            }
            void webview.loadURL(url);
        } else {
            void webview.loadURL("https://google.com/search?q=" + url);
        }
    });
    urlBar.value = url;
    urlRecommendations.style.display = "none";
    urlBar.blur();
};

function newTab(url) {
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
    webview.setAttribute("allowpopups", true);
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
        } else {
            favicon.src = "assets/logo_transparent_white.png";
        }
    }

    webview.addEventListener("dom-ready", function () {
        if (!webview.src.includes("VisionTab/index.html")) {
            tabName.textContent = webview.getTitle();
            updateFavicon();

            if (webview.classList.contains("active")) {
                urlBar.value = webview.getURL();
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
            hoverLink.textContent = event.url;
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
                })
                .catch((error) => {
                    console.error("Error:", error);
                });
        }
    });
    tabCounter++;
}

document.querySelector("#back").onclick = function (e) {
    if (e.target.classList.contains("active"))
        document.querySelector("webview.active").goBack();
};

document.querySelector("#forward").onclick = function (e) {
    if (e.target.classList.contains("active"))
        document.querySelector("webview.active").goForward();
};

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
    recentlyClosed = await window.api.send("readFile", "recentlyClosed");
    if (recentlyClosed === "") {
        recentlyClosed = [];
    }
    preferences = await window.api.send("readFile", "preferences");
    if (preferences === "") {
        preferences = {};
    }
};
