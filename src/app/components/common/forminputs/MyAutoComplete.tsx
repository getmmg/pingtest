import React, { useState, useMemo } from "react";
import { api } from "./api";


export const MyAutocomplete: React.FC = () => {
  const [apiResult, setApiResult] = useState("");
  const promiseStore = useMemo<{latestPromise: null | Promise<any>}>(() => ({latestPromise: null }), []);
  const handleChange = async (e:any) => {
    if(promiseStore.latestPromise) {
      //Cancel Api Request 
    }
    const localPromise = api(e.target.value).then((result) => {
      // compare the localPromise with the latestPromise. If they're the same we'll udpate the state.
      if(localPromise === promiseStore.latestPromise){
        setApiResult(result);
      }
    });
    promiseStore.latestPromise = localPromise;
  };

  return (
    <div>
      <input onChange={handleChange} />
      <p>Api Returned : {apiResult}</p>
    </div>
  );
};
