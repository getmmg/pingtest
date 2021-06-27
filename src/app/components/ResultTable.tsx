import { observer } from "mobx-react-lite";
import { Container, Divider, Header, Table } from "semantic-ui-react";
import { useStore } from "../stores/store";

export default observer(function ResultTable() {
  const { apiStore } = useStore();

  if (apiStore.apiResultRegistry.size == 0) return <Container />;

  return (
    <>
      <Container style={{ marginTop: "4em" }}>
        <Header content="Ping Test Results" />
        <Divider />

        <Table celled>
          <Table.Header>
            <Table.Row>
              {apiStore.tableHeader.map((headerValue) => (
                <Table.HeaderCell>{headerValue}</Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {apiStore.apiResults.map((apiResult) => (
              <Table.Row key={apiResult.id}>
                <Table.Cell>{apiResult.id}</Table.Cell>
                <Table.Cell>{apiResult.title}</Table.Cell>
                <Table.Cell>{apiResult.price}</Table.Cell>
                <Table.Cell>{apiResult.description}</Table.Cell>
                <Table.Cell>{apiResult.category}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    </>
  );
});
