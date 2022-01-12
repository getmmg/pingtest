import { observer } from "mobx-react-lite";
import { useState } from "react";
import {Menu, MenuItem, ProSidebar, SidebarContent, SubMenu} from 'react-pro-sidebar';
import { Link, useLocation } from "react-router-dom";

export default observer (


    
    function Aside(){
        const location = useLocation();
        const [menuCollapse, setMenuCollapse] = useState(false);
        const [activeMenu, setActiveMenu] = useState("");
        const [activePath, setActivePath] = useState(() => { 
          const activePath = 
            location.pathname; 
          return activePath; 
        });
      
        const menuIconClick = () => {
          setMenuCollapse(!menuCollapse);
        };
        return (
            <ProSidebar
            style={{marginTop: '3.8em', marginLeft: '1em'}}
            breakPoint="md"
            >
                <SidebarContent>
                    <Menu iconShape="circle"  >
                    
                    <SubMenu title="S1" open={activePath.startsWith("/s1") || activeMenu==="/s1"} onClick={()=> setActiveMenu("/s1")}>
                    <MenuItem active={activePath=="/s1/first"} >First Page<Link to="/s1/first" onClick={() => setActivePath("/s1/first")}/></MenuItem>
                    <MenuItem active={activePath=="/s1/second"}>Second Page<Link to="/s1/second" onClick={() => setActivePath("/s1/second")}/></MenuItem>
                    </SubMenu>

                    <SubMenu title="S2" open={activePath.startsWith("/s2") || activeMenu==="/s2"} onClick={()=> setActiveMenu("/s2")}>
                    <MenuItem active={activePath=="/s2/third"}>Third Page<Link to="/s2/third" onClick={() => setActivePath("/s2/third")} /></MenuItem>
                    <MenuItem active={activePath=="/s2/fourth"}>Fourth Page<Link to="/s2/fourth" onClick={() => setActivePath("/s2/fourth")}/></MenuItem>
                    </SubMenu>


                    <MenuItem >
  Dashboard
  <Link to="/" />
</MenuItem>
              
                    </Menu>
                 
                </SidebarContent>
            </ProSidebar>
        )
    }
)