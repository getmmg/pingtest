import axios, { AxiosResponse } from "axios";
import { ApiModel } from "../datamodels/ApiModel";

axios.defaults.baseURL = "https://fakestoreapi.com/";


axios.interceptors.request.use(function (config) {
  // Do something before request is sent
  console.log(config);
  return config;
}, function (error) {
  // Do something with request error
  return Promise.reject(error);
});

const responseBody = <T>(response: AxiosResponse<T>) => response.data;
const requests = {
  get: <T>(url: string) => axios.get<T>(url).then(responseBody),
  post: <T>(url: string, body: {}) =>
    axios.post<T>(url, body).then(responseBody),
};

const PingTestResults = {
  getResult: () => requests.get<ApiModel[]>("/products"),
};

const agent = {
  PingTestResults,
};

export default agent;
