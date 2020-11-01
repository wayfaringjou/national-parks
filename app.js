'use-strict';

const apiKey = 'J50dmhaCqoI5aYEbUnu4bcVrYYeFSCHlW8dnKsg8';
const apiUrl = 'https://developer.nps.gov/api/v1/parks';

let foundStates = [];

function generateSearchString(params) {
  const searchItems = Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
  return searchItems.join('&').replace(/%2C/g, ',');
}

function displayParksResults(bodyJson) {
  $('#results-list').empty();

  if (bodyJson.data.length === 0) {
    $('#search-results').addClass('hidden');
    $('#js-messages').append(`
    <h2>No Results</h2>`);
  } else {
    $('#js-messages').append(`
      <h3>Showing ${bodyJson.data.length} of ${bodyJson.total} total results. (For States: ${foundStates.join(', ').toUpperCase()})</h3>
    `);
    for (let i = 0; i < bodyJson.data.length; i++) {
      const dataItem = bodyJson.data[i];
      $('#results-list').append(`
        <li>
          <h3>${dataItem.fullName} (${dataItem.states})</h3>
          <img src="${dataItem.images[0].url}" alt="${dataItem.images[0].altText}" />
          <p>${dataItem.description}</p>
          <a href="${dataItem.url}">${dataItem.url}</a>
          <h4>Address:</h4>
          <p>
            ${dataItem.addresses[0].line1}</br>
            ${dataItem.addresses[0].line2 ? `${dataItem.addresses[0].line2} </br>` : ''}
            ${dataItem.addresses[0].line3 ? `${dataItem.addresses[0].line3} </br>` : ''}
            ${dataItem.addresses[0].city} ${dataItem.addresses[0].stateCode} ${dataItem.addresses[0].postalCode}
          </p>
          <hr/>
        </li>`);
    }
    $('#search-results').removeClass('hidden');
  }
}

function getNationalParks(searchTerm, resultsLimit = 10) {
  const headers = new Headers({
    'x-api-key': apiKey,
    'accept': 'application/json',
  });

  const requestOptions = {
    method: 'GET',
    headers: headers,
  };

  const params = {
    stateCode: searchTerm,
    limit: resultsLimit,
  };

  const searchString = generateSearchString(params);
  const searchUrl = `${apiUrl}?${searchString}`;

  fetch(searchUrl, requestOptions)
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(response.statusText);
    })
    .then((bodyJson) => displayParksResults(bodyJson))
    .catch((error) => {
      $('#results-list').empty();
      $('#search-results').addClass('hidden');
      $('#js-messages').append(`
      <h3 class="error">Something went wrong: ${error.message}</h3>`);
    });
}

function stateNameSearch(stateName) {
  const stateNameStr = stateName.trim();
  try {
    if (stateNameStr.length < 3) {
      const isStateCode = Object.values(statesHash).includes(stateNameStr);
      if (!isStateCode) {
        throw new Error(`'${stateName}' is not a valid State Code.`);
      }
      return stateNameStr;
    }
    let stateCode = statesHash[stateNameStr];
    if (stateCode === undefined) {
      const stateList = Object.keys(statesHash);
      const foundList = [];
      for (let i = 0; i < stateList.length; i++) {
        if (stateList[i].includes(stateNameStr)) {
          foundList.push(stateList[i]);
        }
      }
      if (foundList.length > 1) {
        throw new Error(
          `More than one name matches '${stateNameStr}'. Maybe you mean one of these: ${foundList.join(', ')}.`,
        );
      } else if (foundList.length === 0) {
        throw new Error(
          `'${stateNameStr}' not found. Try another state name or code.`,
        );
      } else {
        stateCode = statesHash[foundList[0]];
      }
    }
    return stateCode;
  } catch (error) {
    $('#js-messages').append(`
    <h3 class="error">${error.message}</h3>`);
  }
}

function parseInput(searchTerm) {
  let parsedSearchTerm;
  let termsArr;
  if (searchTerm.includes(',')) {
    termsArr = searchTerm.split(',');
    foundStates = termsArr
      .map((i) => stateNameSearch(i))
      .filter((i) => i);
    parsedSearchTerm = foundStates.join();
  } else {
    parsedSearchTerm = stateNameSearch(searchTerm);
    foundStates = [parsedSearchTerm];
  }
  return parsedSearchTerm;
}

function handleFormSubmit() {
  $('main').on('submit', '.js-national-parks-form', function (e) {
    e.preventDefault();
    const searchTerm = $(this).find('#search-state').val().toLowerCase();
    const resultsLimit = $(this).find('#max-results').val();
    $('#js-messages').empty();
    getNationalParks(parseInput(searchTerm), resultsLimit);
  });
}

function handleNationalParksList() {
  handleFormSubmit();
}

$(handleNationalParksList());
