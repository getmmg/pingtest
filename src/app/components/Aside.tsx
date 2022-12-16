import { observer } from "mobx-react-lite";
import { useState } from "react";
import {Menu, MenuItem, ProSidebar, SidebarContent, SubMenu} from 'react-pro-sidebar';
import { Link, useLocation } from "react-router-dom";
import { boolean } from "yup/lib/locale";

export default observer (


    
    function Aside(){
        const location = useLocation();
        const [menuCollapse, setMenuCollapse] = useState(false);
        const [activeMenu,  setActiveMenu] = useState([]);
        const [activePath, setActivePath] = useState(() => { 
          const activePath = 
            location.pathname; 
          return activePath; 
        });

        const menuItemClick = (menuItem:string, subMenuItem:string) =>{
          setActivePath(subMenuItem);
          updateMenu(menuItem);
          
        }

        const updateMenu = (newMenuItem:string) => {
          const index = activeMenu.indexOf(newMenuItem as never, 0)
          
          console.log(activeMenu)
          console.log(index)
          if(index > -1){
            activeMenu.splice(index, 1)
          }else{
            activeMenu.push(newMenuItem as never);
          }
          console.log(activeMenu)
          console.log("----------")
        }

        const checkIfMenuOpen = (newMenuItem:string) => {
          let menuOpen = false;
          for(let i =0; i<activeMenu.length;i++){
            let thisMenuItem:string = activeMenu[i];
            if(thisMenuItem.startsWith(newMenuItem)){
              menuOpen = true;
              break;
            }
          }
          return menuOpen;
        }
      
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
                    
                    <SubMenu title="S1" open={checkIfMenuOpen("/s1")} onClick={() => menuItemClick("/s1", "/s1")}>
                    <MenuItem active={activePath=="/s1/first"}>First Page<Link to="/s1/first" onClick={() => menuItemClick("/s1", "/s1/first")}/></MenuItem>
                    <MenuItem active={activePath=="/s1/second"}>Second Page<Link to="/s1/second" onClick={() => menuItemClick("/s1", "/s1/second")}/></MenuItem>
                    </SubMenu>

                    <SubMenu title="S2" open={checkIfMenuOpen("/s2") } onClick={() => menuItemClick("/s2", "/s2")}>
                    <MenuItem active={activePath=="/s2/third"}>Third Page<Link to="/s2/third" onClick={() => menuItemClick("/s2", "/s2/third")} /></MenuItem>
                    <MenuItem active={activePath=="/s2/fourth"}>Fourth Page<Link to="/s2/fourth" onClick={() => menuItemClick("/s2", "/s2/fourth")}/></MenuItem>
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