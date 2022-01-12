import {
  makeAutoObservable,
  makeObservable,
  observable,
  runInAction,
} from "mobx";
import agent from "../api/agent";
import { ApiModel } from "../datamodels/ApiModel";
import { EntryFormModel } from "../datamodels/EntryFormModel";

export default class ApiStore {
  apiResultRegistry = new Map<number, ApiModel>();
  apiResults: ApiModel[] = [];
  showResults = false;
  loading = false;
  tableHeader: String[] = ["Id", "Title", "Price", "Description", "Category"];


  title = "Hello from Mobx";

  constructor() {
    makeAutoObservable(this);
  }

  getResults = async (formData: EntryFormModel) => {
    try {
      this.loading = true;
      const result = await agent.PingTestResults.getResult();
      runInAction(() => {
        console.log(formData);
        result.forEach((apiModel) =>
          this.apiResultRegistry.set(apiModel.id, apiModel)
        );
        this.apiResults = result;
        this.loading = false;
      });
    } catch (error) {
      this.loading = false;
      console.log(error);
    }
  };

  resetForm = () => {
    runInAction(() => {
      this.apiResults = [];
      this.apiResultRegistry.clear();
    });
  };
}
