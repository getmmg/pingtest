import { Fragment, useState } from "react";
import { Typeahead } from "react-bootstrap-typeahead";


const options = [
    'Angular',
    'Angular2',
    'Vue',
    'Next',
    'Flutter'
  ];
  
  export const Auto = () => {
    const [caseSensitive, setCaseSensitive] = useState(false);
    return (
      <Fragment>
        <Typeahead
          caseSensitive={caseSensitive}
          id="framework"
          options={options}
          placeholder="Select framework"
        />
      </Fragment>
    );
  }