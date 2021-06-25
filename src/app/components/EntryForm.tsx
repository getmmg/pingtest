import React from "react";
import { Divider, Form, TextArea } from "semantic-ui-react";

export default function EntryForm() {
  return (
    <Form onSubmit={() => console.log("Hello")}>
      <Form.Group widths="equal">
        <Form.Input
          fluid
          id="username"
          label="Username"
          placeholder="Enter Username"
          required
        />
        <Form.Input
          fluid
          id="password"
          label="Password"
          placeholder="Enter password"
          type="password"
          required
        />
      </Form.Group>
      <Divider />

      <Form.Field
        id="listofsubnet"
        control={TextArea}
        label="Enter Subnets (max 1024 IP per subnet /22)"
        placeholder="Subnets can be in these formats:\n159.156.1.0/29\n159.156.2.0 255.255.255.0\n192.168.1.0 (full class C will be pinged)"
        required
      />

      <Form.Input
        id="timeout"
        label="Ping timeout in ms"
        value="1000"
        style={{ width: "8em" }}
      />

      <Form.Field
        id="resolveIP"
        label="Resolve IP to DNS Name"
        control="input"
        type="checkbox"
        checked
      />
      <Divider />

      <Form.Group>
        <Form.Button type="submit" positive>
          Submit
        </Form.Button>

        <Form.Button type="cancel" negative>
          Cancel
        </Form.Button>
      </Form.Group>
    </Form>
  );
}
