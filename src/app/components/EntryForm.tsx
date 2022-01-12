import { Formik, Form, Field } from "formik";
import { observer } from "mobx-react-lite";

import { Button, Divider } from "semantic-ui-react";

import { EntryFormModel } from "../datamodels/EntryFormModel";
import * as Yup from "yup";

import { useStore } from "../stores/store";
import ResultTable from "./ResultTable";

import MyTextInput from "./common/forminputs/MyTextInput";
import MyTextArea from "./common/forminputs/MyTextArea";

import GitHubSearch from "./common/forminputs/MyAuto";


// interface Props {
//   formData: EntryFormModel | undefined;
// }

export default observer(function EntryForm() {
  const { apiStore } = useStore();
  const initialState = {
    selection : "",
    username: "",
    password: "",
    listofsubnet: "",
    timeout: "1000",
    resolveIP: true,
  };

  const validationSchema = Yup.object({
    selection: Yup.string().required("selection is required"),
    username: Yup.string().required("Username is required"),
    password: Yup.string().required("Password is required"),
    listofsubnet: Yup.string().required("List of Subnets is required"),
    timeout: Yup.number()
      .required("Timeout is required")
      .min(500, "Timeout should be between 500 & 2000")
      .max(2000, "Timeout should be between 500 & 2000"),
  });

  // function resetForm() {
  //   //setFormData(initialState);
  //   apiStore.resetForm();
  // }

  function handleFormSubmit(formData: EntryFormModel) {
    console.log(formData)
    apiStore.getResults(formData).then(() => console.log("result done"));
  }

  // function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
  //   const { name, value } = event.target;
  //   setFormData({ ...formData, [name]: value });
  // }

  // function handleCheckBoxState(event: SyntheticEvent, data: any) {
  //   setFormData({ ...formData, ["resolveIP"]: !formData.resolveIP });
  // }

  return (
    <>
      <Formik
        validationSchema={validationSchema}
        enableReinitialize
        initialValues={initialState}
        onSubmit={(values) => handleFormSubmit(values)}
      >
        {({ handleSubmit, isValid, resetForm, dirty, isSubmitting }) => (
          <Form className="ui form" onSubmit={handleSubmit} autoComplete="off">
            {/* <Form.Group widths="equal"> */}

          <GitHubSearch/>
   
            
            <MyTextInput name="username" placeholder="Enter Username" />

            <MyTextInput
              name="password"
              placeholder="Enter Password"
              type="password"
            />

            {/* </Form.Group> */}
            <Divider />

            <MyTextArea
              rows={4}
              name="listofsubnet"
              placeholder="Subnets can be in these formats:
              159.156.1.0/29
              159.156.2.0 255.255.255.0
              192.168.1.0 (full class C will be pinged)"
            />

            <MyTextInput name="timeout" placeholder="" />

            <div className="ui">
              <label>
                <Field type="checkbox" id="resolveIP" name="resolveIP" />
                Resolve IP to DNS Name
              </label>
            </div>

            {/* <div>
              <label className="ui">
                <Field
                  id="resolveIP"
                  name="resolveIP"
                  label="Resolve IP to DNS Name"
                  type="checkbox"
                />
                Resolve IP to DNS Name
              </label>
            </div> */}

            <Divider />

            {/* <Form.Group> */}
            <Button
              type="submit"
              //disabled={!dirty || !isValid}
              positive
              loading={apiStore.loading}
              //loading={isSubmitting}
              content="Submit"
              floated="right"
            />

            <Button
              content="Reset"
              floated="right"
              type="button"
              negative
              onClick={() => {
                apiStore.resetForm();
                resetForm();
              }}
            />

            {/* </Form.Group> */}
          </Form>
        )}
      </Formik>

      <ResultTable />
    </>
  );
});
