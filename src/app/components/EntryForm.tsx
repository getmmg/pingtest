import React, { ChangeEvent, SyntheticEvent } from "react";
import { useState } from "react";
import { Checkbox, Divider, Form, TextArea } from "semantic-ui-react";
import { EntryFormModel } from "../datamodels/EntryFormModel";

// interface Props {
//   formData: EntryFormModel | undefined;
// }

export default function EntryForm() {
  const initialState = {
    username: "",
    password: "",
    listofsubnet: "",
    timeout: "",
    resolveIP: true,
  };

  const [formData, setFormData] = useState(initialState);

  function handleSubmit() {
    console.log(formData);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  }

  function handleCheckBoxState(event: SyntheticEvent, data: any) {
    setFormData({ ...formData, ["resolveIP"]: !formData.resolveIP });
  }

  return (
    <Form onSubmit={handleSubmit} autoComplete="off">
      <Form.Group widths="equal">
        <Form.Input
          fluid
          name="username"
          label="Username"
          placeholder="Enter Username"
          value={formData.username}
          onChange={handleInputChange}
          required
        />
        <Form.Input
          fluid
          name="password"
          label="Password"
          placeholder="Enter password"
          value={formData.password}
          onChange={handleInputChange}
          type="password"
          required
        />
      </Form.Group>
      <Divider />

      <Form.Field
        name="listofsubnet"
        control={TextArea}
        label="Enter Subnets (max 1024 IP per subnet /22)"
        placeholder="Subnets can be in these formats:\n159.156.1.0/29\n159.156.2.0 255.255.255.0\n192.168.1.0 (full class C will be pinged)"
        value={formData.listofsubnet}
        onChange={handleInputChange}
        required
      />

      <Form.Input
        name="timeout"
        label="Ping timeout in ms"
        value={formData.timeout}
        onChange={handleInputChange}
        style={{ width: "8em" }}
      />

      <Form.Field
        name="resolveIP"
        label="Resolve IP to DNS Name"
        control={Checkbox}
        checked={formData.resolveIP}
        value={formData.resolveIP}
        //onChange={handleInputChange}
        onChange={handleCheckBoxState}
      />
      <Divider />

      <Form.Group>
        <Form.Button type="submit" positive>
          Submit
        </Form.Button>

        <Form.Button type="button" negative>
          Cancel
        </Form.Button>
      </Form.Group>
    </Form>
  );
}
