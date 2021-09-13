import { useField } from "formik";
import React, { useState } from "react";
import { Form, Label } from "semantic-ui-react";
import Downshift from "downshift";

const items = [
  {value: 'apple'},
  {value: 'pear'},
  {value: 'orange'},
  {value: 'grape'},
  {value: 'banana'},
]

interface Props {
  [x: string]: any;
  name: string;
  
}

export default function MyAutoSelectText(props: Props) {
  const [field, meta, helpers] = useField(props.name);
  const { setValue } = helpers;

  return (
    <Form.Field error={meta.touched && !!meta.error}>
       <label>{props.label}</label>
      <Downshift
      {...props}
     onChange={selection =>
      setValue(selection.value)
    }
    itemToString={item => (item ? item.value : '')}
  >

    
    {({
      getInputProps,
      getItemProps,
      getMenuProps,
      isOpen,
      inputValue,
      highlightedIndex,
      selectedItem,
      getRootProps,
    }) => (
      <div>  
        <input {...getInputProps()}  />
        <ul {...getMenuProps()} style={{"list-style-type": "none"}}>
          {isOpen
            ? items
                .filter(item => !inputValue || item.value.includes(inputValue))
                .map((item, index) => (
                  <li
                    {...getItemProps({
                      key: item.value,
                      index,
                      item,
                      style: {
                        backgroundColor:
                          highlightedIndex === index ? 'lightgray' : 'white',
                        fontWeight: selectedItem === item ? 'bold' : 'normal',
                      },
                    })}
                  >
                    {item.value}
                  </li>
                ))
            : null}
        </ul>
      </div>
    )}
  </Downshift>

  {meta.touched && meta.error ? (
        <Label basic color="red">
          {meta.error}
        </Label>
      ) : null}
  </Form.Field>
  );
}