import React from "react";
import { Container } from "semantic-ui-react";
import NavBar from "./components/common/NavBar";
import EntryForm from "./components/EntryForm";

function App() {
  return (
    <>
      <NavBar />
      <Container style={{ marginTop: "7em" }}>
        <EntryForm />
      </Container>
    </>
  );
}

export default App;
