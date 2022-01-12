import { observer } from "mobx-react-lite";
import React from "react";
import './App.scss';
import { Route,  useLocation } from "react-router";
import { Container } from "semantic-ui-react";
import Aside from "./components/Aside";
import NavBar from "./components/common/NavBar";
import EntryForm from "./components/EntryForm";
import First from "./components/pages/First";
import Home from "./components/pages/Home";
import Second from "./components/pages/Second";

function App() {
  const location = useLocation();
  return (
    <>
    
      <NavBar />

      {/* <Route exact path='/' component={Home}/> */}
      <Aside/>

      
      <Route
      path={'/(.+)'}
      render= {()=> (
        <>
      <Container style={{ marginTop: "7em" }}>
        <>
        <Route exact path='/' component={Home}/>
          <Route path="/s1/first" component={First}/>
          <Route path="/s1/second" component={Second}/>
          <Route path="/s2/third" component={First}/>
          <Route path="/s2/fourth" component={Second}/>
        </>
        
      </Container>
    </>
      )}
      />
      </>
  );
}

export default observer(App);
