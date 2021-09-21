const fakeApiCall = (letter:string) =>
  new Promise(resolve => {
    setTimeout(() => resolve(letter), 300);
  });
export const api = async (text:string) => {
  const textArr = text.split("");
  let i = 0;
  while (i < textArr.length) {
    //Make Api Call Here
    await fakeApiCall(textArr[i]);
    i++;
  }
  return text;
};
