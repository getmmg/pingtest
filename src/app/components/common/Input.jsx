import React from 'react';
import TypeAheadSelect from './TypeAheadSelect';

const endpoint = 'https://api.example.com/options';

const App = () => {
  const handleOptionSelected = option => {
    console.log(`Option selected: ${option}`);
  };

  return (
    <TypeAheadSelect endpoint={endpoint} onOptionSelected={handleOptionSelected} />
  );
};

export default App;


import React, { useState, useEffect } from 'react';

const TypeAheadSelect = ({ endpoint, onOptionSelected }) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (query.length > 0) {
      setFilteredOptions(
        options.filter(option => option.toLowerCase().includes(query.toLowerCase()))
      );
      setShowOptions(true);
    } else {
      setShowOptions(false);
    }
  }, [query, options]);

  useEffect(() => {
    fetch(endpoint)
      .then(response => response.json())
      .then(data => {
        setOptions(data);
      })
      .catch(error => {
        console.error(error);
      });
  }, [endpoint]);

  const handleChange = event => {
    setQuery(event.target.value);
  };

  const handleOptionSelected = option => {
    setQuery(option);
    setShowOptions(false);
    onOptionSelected(option);
  };

  return (
    <div>
      <select value={query} onChange={handleChange}>
        <option value="">Select an option</option>
        {showOptions && (
          filteredOptions.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))
        )}
      </select>
    </div>
  );
};

export default TypeAheadSelect;


import React, { useState, useEffect } from 'react';

const TypeAheadTextBox = ({ endpoint, onOptionSelected }) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (query.length > 0) {
      setFilteredOptions(
        options.filter(option => option.toLowerCase().includes(query.toLowerCase()))
      );
      setShowOptions(true);
    } else {
      setShowOptions(false);
    }
  }, [query, options]);

  useEffect(() => {
    fetch(endpoint)
      .then(response => response.json())
      .then(data => {
        setOptions(data);
      })
      .catch(error => {
        console.error(error);
      });
  }, [endpoint]);

  const handleChange = event => {
    setQuery(event.target.value);
  };

  const handleOptionSelected = option => {
    setQuery(option);
    setShowOptions(false);
    onOptionSelected(option);
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={handleChange}
      />
      {showOptions && (
        <ul>
          {filteredOptions.map(option => (
            <li
              key={option}
              onClick={() => handleOptionSelected(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TypeAheadTextBox;
