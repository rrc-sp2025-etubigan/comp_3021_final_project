let pageNumber = 1;
const { pool } = require('pg');
const DB_HOST = "localhost";
const DB_PORT = 5432
const DB_NAME = "myDatabase"
const USER_NAME = "John User";
const USER_PASS = "mySecurePass#2026";

const dbPool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: USER_NAME,
    password: USER_PASS,
    database: DB_NAME
});

const init = () => {
    window.API_URL = "https://data.winnipeg.ca/api/v3/views/tx3d-pfxq/query.json";
    window.API_KEY = "0ZeqXwzHv1yqllBaHxsmKI6Ok";

    document.querySelector("#park-name-input").classList.add("user-input");
    document.querySelector("#user-query-input").classList.add("user-input");
    document.querySelector("#district-input").classList.add("user-input");

    document.querySelector("#submit-btn").addEventListener("click", () => {
        if (isValid()) {
            constructTable();
            showData();
        } else {
            console.log("Form not valid.");
        }
    });
}


/* Creates Table structure to display data. */
const createTableContainer = (parentNode) => {

    /* Helper function for creating column headings. */
    const createTableHeading = (name, id) => {
        const tableHeading = document.createElement("p");
        tableHeading.textContent = name;
        tableHeading.id = id;
        tableHeading.classList.add("table-header");
        return tableHeading;
    };

    const tableContainer = document.createElement("div");
    tableContainer.id = "results-table";

    /* Create Table Heading for Park Name */
    const tableParkNameHeader = createTableHeading("Park Name", "park-name-header");
    tableContainer.appendChild(tableParkNameHeader);
    
    /* Create Table Heading for Address */
    const tableAddressHeader = createTableHeading("Address", "park-address-header");
    tableContainer.appendChild(tableAddressHeader);

    const tableDistrictHeader = createTableHeading("District", "park-district-header");
    tableContainer.appendChild(tableDistrictHeader);

    parentNode.appendChild(tableContainer);
};

/* Creates Navigation Buttons to parse through data. */
const createNavigationButtons = (parentNode) => {
    /* Create div for buttons */
    const navigationContainer = document.createElement("div");
    navigationContainer.id = "navigation-container";

    /* Create Previous Page button */
    const previousButton = document.createElement("input");
    previousButton.type = "button";
    previousButton.id = "previous-btn";
    previousButton.value = 'Previous';
    navigationContainer.appendChild(previousButton);

    /* Create Next Page Button */
    const nextButton = document.createElement("input");
    nextButton.type = "button";
    nextButton.id = "next-btn";
    nextButton.value = "Next";
    navigationContainer.append(nextButton);

    /* Add Event listeners to navigation buttons */
    previousButton.addEventListener("click", () => {
        pageNumber = pageNumber > 1 ? pageNumber - 1 : pageNumber;
        showData();
    });
    nextButton.addEventListener("click", () => {
        pageNumber++;
        showData();
    });

    parentNode.appendChild(navigationContainer);
};

const showData = async (event) => {
    const tableNode = document.querySelector("#results-table");
    console.log(createQuery());
    const userQuery = createQuery();
    const parkData = await getAPIData(pageNumber, userQuery);

    saveResultsToDb("parkData", parkData);

    removeAllRows();
    insertRows(parkData, tableNode);
}

function isValid() {
    let formValid = true;

    const inputParkName = document.querySelector("#park-name-input");
    const inputUserQuery = document.querySelector("#user-query-input");

    return formValid;
}

/* Creates the table that will show the data. */
function constructTable() {
    const resultsContainer = document.querySelector("#results");
    resultsContainer.innerHTML = '';
    
    /* Create and Append Heading */
    const resultsHeading = document.createElement("h2");
    resultsHeading.textContent = "Results";
    resultsContainer.appendChild(resultsHeading);

    /* Div for Table */
    createTableContainer(resultsContainer);

    /* Create navigation ui */
    createNavigationButtons(resultsContainer);
}

function removeAllRows() {
    const records = document.querySelectorAll(".cell");
    records.forEach((cell) => {
        cell.remove();
    });
}

function createQuery() {
    let query = "SELECT park_name, location_description, district WHERE" + '';

    const inputs = document.querySelectorAll(".user-input");

    const addStatement = (id, value) => {
        statement = "";

        switch(id) {
            case("park-name-input"):
                statement = `lower(park_name) like lower('%${value}%')`;
                break;
            case("district-input"):
                statement = `district == '${value}'`;
                break;
            case("user-query-input"):
                statement = value;
                break;
        }

        return statement;
    }

    let firstConditionalSet = false;

    inputs.forEach((node) => {
        if (!firstConditionalSet && node.value != "") {
            query += ` WHERE ${addStatement(node.id, node.value)}`
            firstConditionalSet = true;
        }
        else if (firstConditionalSet && node.value != "") {
            query += ` AND ${addStatement(node.id, node.value)}`;
        }
    });

    return query;
}

/* Inserts data from record into rows */
function insertRows(dataArray, containerNode) {
    const createCell = (array, key) => {
        const element = document.createElement("p");
        element.classList.add("cell");
        element.textContent = array[`${key}`];
        return element;
    };

    dataArray.forEach(record => {
        const cellParkName = createCell(record, "park_name");
        containerNode.appendChild(cellParkName);

        const cellAddress = createCell(record, "location_description");
        containerNode.appendChild(cellAddress);

        const cellDistrict = createCell(record, "district");
        containerNode.appendChild(cellDistrict);
    });
}

async function getAPIData(pageNumber, query) {
    const response = await fetch(window.API_URL, {
        method: "POST",
        headers: {
            "X-App-Token": window.API_KEY
        },
        body: JSON.stringify({
            "query": `${query}`,
            "page": {
                "pageNumber": `${pageNumber}`,
                "pageSize": 20
            },
            "includeSynthetic": false
        })
    })
    .catch(error => {
        console.log("Error:", error);
    });
    const data = await response.json();
    return data;
}

async function saveResultsToDb(result, value) {
    await pool.query(
        'INSERT INTO results (result, value) VALUES ($1, $2)',
        [result, value]
    );
};

document.addEventListener("DOMContentLoaded", init);
