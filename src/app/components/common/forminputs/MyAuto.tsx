import { useField } from "formik";
import React, { Fragment, useState } from "react";
import { AsyncTypeahead } from "react-bootstrap-typeahead";
import { Form, Label } from "semantic-ui-react";
import { GithubUserModel } from "../../../datamodels/GitHubModel";

interface Props {
  placeholder: string;
  name: string;
  rows: number;
  label?: string;
  
}



// export default function MyTextArea(props: Props) {
//   const [field, meta] = useField(props.name);
//   return (
//     <Form.Field error={meta.touched && !!meta.error}>
//       <label>{props.label}</label>
//       <textarea {...field} {...props} />
//       {meta.touched && meta.error ? (
//         <Label basic color="red">
//           {meta.error}
//         </Label>
//       ) : null}
//     </Form.Field>
//   );
// }
const SEARCH_URI = 'https://api.github.com/search/users';
export default function GitHubSearch(){

  const [isLoading, setIsLoading] = useState(false);
  const [selectOptions, setOptions] = useState<GithubUserModel[]|[]>([]);
  
  const handleSearch = (query:String) => {
    setIsLoading(true);

    fetch(`${SEARCH_URI}?q=${query}+in:login&page=1&per_page=50`)
      .then((resp) => {
        //console.log(resp.json());
        return resp.json();
      })
      .then(({ items }) => {
        const options:GithubUserModel[] = items.map((i:GithubUserModel) => ({
          avatar_url: i.avatar_url,
          id: i.id,
          login: i.login,
        }));
        setOptions(options);
        setIsLoading(false);
      });
  };

  // Bypass client-side filtering by returning `true`. Results are already
  // filtered by the search endpoint, so no need to do it again.
  const filterBy = () => true;

  return (
    <AsyncTypeahead
      filterBy={filterBy}
      id="async-example"
      isLoading={isLoading}
      labelKey="login"
      minLength={3}
      onSearch={handleSearch}
      options={selectOptions}
      placeholder="Search for a Github user..."
      renderMenuItemChildren={(option : GithubUserModel, props) => (
        <Fragment>
          <img
            alt={option.login}
            src={option.avatar_url}
            style={{
              height: '24px',
              marginRight: '10px',
              width: '24px',
            }}
          />
          <span>{option.login}</span>
        </Fragment>
      )}
    />
  );
}
