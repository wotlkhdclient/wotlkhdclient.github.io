// f.js

const API = "//dev.trimitor.ru/backend/api.php";

function log(...args) {
    console.log("LOG", ...args);
}
function notify(icon, message) {
    log(icon, message);
}

function getInfo(module, action, data = {}) {
    return fetch(API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            module,
            action,
            data
        })
    })
        .then(response => response.json())
        .then(result => {
            if (result.type === "error" || result.type === "warning") {
                notify(result.type, result.message || "Произошла ошибка");
            }
            return result;
        })
        .catch(error => {
            notify("error", error.message || error);
            throw error;
        });
}

function setInfo(module, action, data = {}) {
    return fetch(API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            module,
            action,
            data
        })
    })
        .then(response => response.json())
        .then(result => {
            if (result.type === "error" || result.type === "warning") {
                notify(result.type, result.message || "Произошла ошибка");
            }
            return result;
        })
        .catch(error => {
            notify("error", error.message || error);
            throw error;
        });
}
