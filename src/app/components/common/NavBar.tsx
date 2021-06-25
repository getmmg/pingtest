import React from "react";
import { Menu } from "semantic-ui-react";

export default function NavBar() {
  return (
    <Menu fixed="top" color="red" inverted secondary>
      <Menu.Item header as="h3">
        PingTool
      </Menu.Item>
    </Menu>
  );
}
