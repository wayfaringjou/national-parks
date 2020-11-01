'use-strict';

// Store api key and url
const apiKey = 'J50dmhaCqoI5aYEbUnu4bcVrYYeFSCHlW8dnKsg8';
const apiUrl = 'https://developer.nps.gov/api/v1/parks';
// Global variable to store valid state queries submitted by user
let foundStates = [];

// Not all parks have an address field. Also not all have every line of information
// Generate address string conditionally. Takes a park item data object
function generateParkAddress(dataItem) {
  let parkAddress = '';
  let parkAddressStr = '';
  if (dataItem.addresses[0]) {
    parkAddress = `
      ${dataItem.addresses[0].line1 ? `${dataItem.addresses[0].line1} </br>` : ''}
      ${dataItem.addresses[0].line2 ? `${dataItem.addresses[0].line2} </br>` : ''}
      ${dataItem.addresses[0].line3 ? `${dataItem.addresses[0].line3} </br>` : ''}
      ${dataItem.addresses[0].city} ${dataItem.addresses[0].stateCode} ${dataItem.addresses[0].postalCode}`;

    parkAddressStr = `
      <h4>Address:</h4>
      <p>${parkAddress}</p>
    `;
  }
  return parkAddressStr;
}
// Display park's search results inside '#search-results'. Takes the body json from response
function displayParksResults(bodyJson) {
  // Clear results section of previous search
  $('#results-list').empty();
  // If the search gets an empty response, let user know of no results
  if (bodyJson.data.length === 0) {
    $('#search-results').addClass('hidden');
    $('#js-messages').append(`
    <h2>No Results</h2>`);
  // When the response isn't empty assemble the result list
  } else {
    // Let the user know the amount of results shown follow their 'max results' input
    // Also show the total possible results for state(s) searched and which where found
    $('#js-messages').append(`
      <h3>Showing ${bodyJson.data.length} of ${bodyJson.total} total results. 
      (For States: ${foundStates.join(', ').toUpperCase()})</h3>
    `);
    // Iterate through data and assemble each result
    for (let i = 0; i < bodyJson.data.length; i++) {
      // Store park data in a variable
      const dataItem = bodyJson.data[i];
      // Append a '<li>' element inside '#results-list' for every result found
      // An image is added conditionally if data is found
      // 'generateParkAddress' function is used to generate address if found
      $('#results-list').append(`
        <li>
          <h3>${dataItem.fullName} (${dataItem.states})</h3>
          ${dataItem.images[0]
            ? `<img src="${dataItem.images[0].url}" 
                    alt="${dataItem.images[0].altText}" />`
            : ''}
          <p>${dataItem.description}</p>
          <a href="${dataItem.url}" target="_blank">${dataItem.url}</a>
          ${generateParkAddress(dataItem)}
          <hr/>
        </li>`);
    }
    // Remove class 'hidden' to display results section
    $('#search-results').removeClass('hidden');
  }
}
// Generate the query string to be added to the api url
function generateSearchString(params) {
  const searchItems = Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
  // Format string adding '&' between params and decoding '%2C' back to commas
  return searchItems.join('&').replace(/%2C/g, ',');
}
// Call to NPS's API
function getNationalParks(searchTerm, resultsLimit = 10) {
  // Header object with api and accept keys
  const headers = new Headers({
    'x-api-key': apiKey,
    accept: 'application/json',
  });
  // Options for fetch including method and headers
  const requestOptions = {
    method: 'GET',
    headers,
  };
  // Pass parameters taken from user's input to fetch request
  const params = {
    stateCode: searchTerm,
    limit: resultsLimit,
  };
  // Generate fetch url concatenating all elements
  const searchString = generateSearchString(params);
  const searchUrl = `${apiUrl}?${searchString}`;
  // Make call to api. Handle not 200 response
  fetch(searchUrl, requestOptions)
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(response.statusText);
    })
    // Pass data Json to display function
    .then((bodyJson) => displayParksResults(bodyJson))
    // Catch errors and display in 'js-messages' section for user
    .catch((error) => {
      $('#results-list').empty();
      $('#search-results').addClass('hidden');
      $('#js-messages').append(`
      <h3 class="error">Something went wrong: ${error.message}</h3>`);
    });
}
// Try to find submitted input in a state list object defined in states_hash.js
// When succsessful return a state code to add to the api query string
// Takes text submitted by user parsed by 'parseInput' function
function stateNameSearch(stateName) {
  // Remove whitespace at start and end
  const stateNameStr = stateName.trim();
  // Try to find a valid state name or code from input
  try {
    // If the string is shorter than 3 treat it as state code.
    // The text input in the form uses a pattern to disallow strings of 1 character
    if (stateNameStr.length < 3) {
      // Go through values in states list object
      // If string is not found throw an error
      // Else return it's value
      const isStateCode = Object.values(statesHash).includes(stateNameStr);
      if (!isStateCode) {
        throw new Error(`'${stateName}' is not a valid State Code.`);
      }
      return stateNameStr;
    }
    // If the string is 3 characters or longer treat it as a state name or part of a name
    // First try to find an exact match
    let stateCode = statesHash[stateNameStr];
    // If the string submitted isn't an exect match treat it as part of a name
    if (stateCode === undefined) {
      // Store keys in an array
      const stateList = Object.keys(statesHash);
      // Initialize an empty array to store matches
      const foundList = [];
      // Go through states list object. Look for a key that includes the given string
      for (let i = 0; i < stateList.length; i++) {
        if (stateList[i].includes(stateNameStr)) {
          // Push every key that includes string to the foundList array
          foundList.push(stateList[i]);
        }
      }
      // If more than one match, throw an error to prompt the user with possible matches
      if (foundList.length > 1) {
        throw new Error(
          `More than one name matches '${stateNameStr}'. 
           Maybe you mean one of these: ${foundList.join(', ')}.`,
        );
      // If there wasn't any match let the user know
      } else if (foundList.length === 0) {
        throw new Error(
          `'${stateNameStr}' not found. 
           Try another state name or code.`,
        );
      // If there was one match store it in 'stateCode' and return that value
      } else {
        stateCode = statesHash[foundList[0]];
      }
    }
    return stateCode;
  // Show any errors to user inside 'js-messages' section
  } catch (error) {
    $('#js-messages').append(`
    <h3 class="error">${error.message}</h3>`);
  }
}
// Takes text submitted by user and parse it for single or multiple comma separated values
// Use parsed values to search for state codes
function parseInput(searchTerm) {
  // Declare variable for processed string and array of terms
  let parsedSearchTerm;
  let termsArr;
  // If text submitted by user includes commas, treat it as a list
  if (searchTerm.includes(',')) {
    // Create an array by spliting string using commas
    termsArr = searchTerm.split(',');
    // Store all valid state codes found in global foundStates array
    foundStates = termsArr
      // Pass each value to stateNameSearch function to look for valid state codes
      .map((i) => stateNameSearch(i))
      // Filter any undefined (empty) values returned by search function
      .filter((i) => i);
    // Cast array to string
    parsedSearchTerm = foundStates.join();
  // If no commas where included in submitted text, treat it as a single value
  } else {
    // Pass value to stateNameSearch and store a state code if found
    parsedSearchTerm = stateNameSearch(searchTerm);
    // Assing result of search as the value of global foundStates array
    foundStates = [parsedSearchTerm];
  }
  // Return found state code(s)
  return parsedSearchTerm;
}
// Listen for user submit and pass each input value to the fetch request function
function handleFormSubmit() {
  $('main').on('submit', '.js-national-parks-form', function (e) {
    e.preventDefault();
    const searchTerm = $(this).find('#search-state').val().toLowerCase();
    const resultsLimit = $(this).find('#max-results').val();
    // Clear 'js-messages' section after each submission
    $('#js-messages').empty();
    // Parse text submitted by user before passing it's value to the fetch request
    getNationalParks(parseInput(searchTerm), resultsLimit);
  });
}

function handleNationalParksList() {
  handleFormSubmit();
}

$(handleNationalParksList());
