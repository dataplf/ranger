/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useReducer, useEffect, useMemo } from "react";
import {
  serverError,
  policyConditionUpdatedJSON
} from "../../../utils/XAUtils";
import Editable from "Components/Editable";
import { useNavigate } from "react-router-dom";
import { Button, Form as FormB, Card } from "react-bootstrap";
import Select from "react-select";
import { filter, groupBy, some, sortBy, forIn, has, isArray } from "lodash";
import AsyncSelect from "react-select/async";
import { Form, Field } from "react-final-form";
import { fetchApi } from "Utils/fetchAPI";
import PrinciplePermissionComp from "../Dataset/PrinciplePermissionComp";
import { FieldArray } from "react-final-form-arrays";
import AddSharedResourceComp from "./AddSharedResourceComp";
import { toast } from "react-toastify";
import arrayMutators from "final-form-arrays";

const initialState = {
  loader: false,
  preventUnBlock: false,
  blockUI: false,
  formData: {}
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_DATA":
      return {
        ...state,
        loader: false,
        serviceDetails: action.serviceDetails,
        serviceCompDetails: action.serviceCompDetails,
        policyData: action?.policyData,
        formData: action.formData
      };
    default:
      throw new Error();
  }
}

const datashareFormReducer = (state, action) => {
  switch (action.type) {
    case "SET_SELECTED_SERVICE":
      return {
        ...state,
        selectedService: action.selectedService
      };
    case "SET_SELECTED_ZONE":
      return {
        ...state,
        selectedZone: action.selectedZone
      };
    case "SET_PREVENT_ALERT":
      return {
        ...state,
        preventUnBlock: action.preventUnBlock
      };
    case "SET_BLOCK_UI":
      return {
        ...state,
        blockUI: action.blockUI
      };
    default:
      throw new Error();
  }
};

const AddDatashareView = () => {
  const [step, setStep] = useState(1);
  const [saveButtonText, setSaveButtonText] = useState("Continue");
  const [datashareName, setName] = useState();
  const [datashareDescription, setDatashareDescription] = useState();
  const [datashareDetails, dispatch] = useReducer(
    datashareFormReducer,
    initialState
  );
  const { loader, selectedService, selectedZone, preventUnBlock } =
    datashareDetails;
  const [serviceDef, setServiceDef] = useState({});
  const [serviceDetails, setService] = useState({});
  const [policyState, policyDispatch] = useReducer(reducer, initialState);
  const { loaders, serviceDetailss, serviceCompDetails, policyData, formData } =
    policyState;
  const [blockUI, setBlockUI] = useState(false);
  const [tagName, setTagName] = useState();
  const [showModal, policyConditionState] = useState(false);
  const [sharedResourceList, setSharedResourceList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [groupList, setGroupList] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [maskDef, setMaskDef] = useState(false);
  const [rowFilter, setRowFilterDef] = useState(false);
  const [accessTypeOptions, setAccessTypeOptions] = useState([]);
  const [accessType, setAccessType] = useState([]);
  const [maskTypeOptions, setMaskTypeOptions] = useState([]);
  const [selectedShareMask, setSelectedShareMask] = useState({});
  const [datashareTermsAndConditions, setDatashareTermsAndConditions] =
    useState();
  const [datashareConditionExpr, setDatashareConditionExpr] = useState();
  const navigate = useNavigate();
  const [defaultZoneOptions, setDefaultZoneOptions] = useState([]);
  const [defaultServiceOptions, setDefaultServiceOptions] = useState([]);

  const cancelDatashareDetails = () => {
    if (step == 1) {
      navigate("/gds/mydatasharelisting");
    } else {
      setStep(step - 1);
    }
    setSaveButtonText("Continue");
  };

  const datashareTermsAndConditionsChange = (event) => {
    setDatashareTermsAndConditions(event.target.value);
  };

  const noneOptions = {
    label: "None",
    value: "none"
  };

  const toggleMoreOptionsModalClose = () => {
    setShowMoreOptions(false);
  };

  const toggleClose = () => {
    setShowMoreOptions(false);
  };

  const subhmitDatashareDetails = async (values) => {
    if (step == 5) {
      let dataShareInfo = {
        name: datashareName,
        acl: {
          users: {},
          groups: {},
          roles: {}
        },
        service: selectedService.label,
        description: datashareDescription,
        termsOfUse: datashareTermsAndConditions,
        conditionExpr: datashareConditionExpr,
        defaultAccessTypes:
          values.permission != undefined
            ? Object.entries(values.permission).map(([key, obj]) => {
                return obj.value;
              })
            : []
      };

      if (selectedZone != undefined) {
        dataShareInfo.zone = selectedZone.label;
      }

      dataShareInfo.defaultTagMasks = [];
      if (values.tagMaskInfo != undefined) {
        for (let i = 0; i < values.tagMaskInfo.length; i++) {
          let data = {};
          data.tagName = values.tagMaskInfo[i].tagName;
          data.maskInfo = {};
          data.maskInfo.dataMaskType = values.tagMaskInfo[i].masking.value;
          data.maskInfo.conditionExpr =
            values.tagMaskInfo[i].shareDataMaskInfo?.valueExpr;
          dataShareInfo.defaultTagMasks.push(data);
        }
      }

      userList.forEach((user) => {
        dataShareInfo.acl.users[user.name] = user.perm;
      });

      groupList.forEach((group) => {
        dataShareInfo.acl.groups[group.name] = group.perm;
      });

      roleList.forEach((role) => {
        dataShareInfo.acl.roles[role.name] = role.perm;
      });

      dispatch({
        type: "SET_PREVENT_ALERT",
        preventUnBlock: true
      });
      try {
        dispatch({
          type: "SET_BLOCK_UI",
          blockUI: true
        });
        const createDatashareResp = await fetchApi({
          url: `gds/datashare`,
          method: "post",
          data: dataShareInfo
        });
        toast.success("Datashare created successfully!!");
        self.location.hash = "#/gds/mydatasharelisting";
      } catch (error) {
        dispatch({
          type: "SET_BLOCK_UI",
          blockUI: false
        });
        serverError(error);
        toast.error(error);
        console.error(`Error occurred while creating datashare  ${error}`);
      }
    } else if (step == 4) {
      setSaveButtonText("Create Datashare");
      setStep(step + 1);
    } else if (step == 1) {
      if (datashareName == undefined) {
        toast.error("Please add Datashare Name");
        return;
      } else if (selectedService == undefined) {
        toast.error("Please add Service Name");
        return;
      } else {
        if (selectedService.def != undefined) {
          fetchServiceDef(selectedService.def);
        } else {
          let serviceType = await fetchServiceTypeByName(selectedService.label);
          fetchServiceDef(serviceType);
        }
        setStep(step + 1);
      }
      setStep(step + 1);
    } else {
      setSaveButtonText("Continue");
      setStep(step + 1);
    }
  };

  const fetchServiceDef = async (serviceDefName) => {
    let serviceDefsResp = [];
    try {
      serviceDefsResp = await fetchApi({
        url: `plugins/definitions/name/${serviceDefName}`
      });
    } catch (error) {
      console.error(
        `Error occurred while fetching Service Definition or CSRF headers! ${error}`
      );
    }
    let modifiedServiceDef = serviceDefsResp.data;
    for (const obj of modifiedServiceDef.resources) {
      obj.recursiveSupported = false;
      obj.excludesSupported = false;
    }
    if (Object.keys(modifiedServiceDef.rowFilterDef).length !== 0) {
      setRowFilterDef(true);
    }
    if (Object.keys(modifiedServiceDef.dataMaskDef).length !== 0) {
      setMaskDef(true);
      setMaskTypeOptions(
        modifiedServiceDef.dataMaskDef.maskTypes.map(
          ({ label, name: value }) => ({
            label,
            value
          })
        )
      );
    }
    setAccessTypeOptions(
      modifiedServiceDef.accessTypes.map(({ label, name: value }) => ({
        label,
        value
      }))
    );

    setServiceDef(modifiedServiceDef);
  };

  const datashareNameChange = (event) => {
    setName(event.target.value);
    console.log("DatashareName is:", event.target.value);
  };

  const tagNameChange = (event) => {
    setTagName(event.target.value);
  };

  const datashareDescriptionChange = (event) => {
    setDatashareDescription(event.target.value);
    console.log("Datashare Description is:", event.target.value);
  };

  const onSubmit = () => {
    console.log("Submitting");
  };

  const fetchServiceTypeByName = async (name) => {
    let params = {};
    params["serviceName"] = name;
    try {
      let serviceResp = await fetchApi({
        url: "plugins/services",
        params: params
      });
      return serviceResp.data.services[0].type;
    } catch (error) {
      console.error(`Error occurred while fetching service details ! ${error}`);
    }
  };

  const fetchService = async (zoneId) => {
    try {
      if (zoneId == undefined) {
        let serviceResp = await fetchApi({
          url: "plugins/services"
        });
        return serviceResp.data.services.map(({ name, id, type }) => ({
          label: name,
          id: id,
          def: type
        }));
      } else {
        let serviceResp = await fetchApi({
          url: `public/v2/api/zones/${zoneId}/service-headers`
        });
        return serviceResp.data.map(({ name, id }) => ({
          label: name,
          id: id
        }));
      }
    } catch (error) {
      console.error(`Error occurred while fetching service details ! ${error}`);
    }
  };

  const onFocusServiceSelect = () => {
    fetchService(selectedZone?.id).then((opts) => {
      setDefaultServiceOptions(opts);
    });
  };

  const onFocusZoneSelect = () => {
    fetchSecurityZone(selectedService?.id).then((opts) => {
      setDefaultZoneOptions(opts);
    });
  };

  const fetchSecurityZone = async (serviceId) => {
    let zoneResp = [];
    try {
      if (serviceId == undefined) {
        zoneResp = await fetchApi({
          url: "public/v2/api/zone-headers"
        });
        console.log("test");
      } else {
        zoneResp = await fetchApi({
          url: `public/v2/api/zones/zone-headers/for-service/${serviceId}`
        });
      }
    } catch (e) {
      console.log(e);
    }
    console.log(zoneResp);
    // const zoneResp = await fetchApi({
    //   url: "zones/zones",
    //   params: params
    // });
    // return zoneResp.data.securityZones.map(({ name, id }) => ({
    //   label: name,
    //   value: id
    // }));
    return zoneResp.data.map(({ name, id }) => ({
      label: name,
      id: id
    }));
  };

  const onServiceChange = (e, input) => {
    dispatch({
      type: "SET_SELECTED_SERVICE",
      selectedService: e
    });
    input.onChange(e);
  };

  const setZone = (e, input) => {
    dispatch({
      type: "SET_SELECTED_ZONE",
      selectedZone: e
    });
    input.onChange(e);
  };

  const resourceErrorCheck = (errors, values) => {
    let serviceCompResourcesDetails = serviceDef.resources;

    const grpResources = groupBy(serviceCompResourcesDetails || [], "level");
    let grpResourcesKeys = [];
    for (const resourceKey in grpResources) {
      grpResourcesKeys.push(+resourceKey);
    }
    grpResourcesKeys = grpResourcesKeys.sort();
    for (const key of grpResourcesKeys) {
      if (errors[`value-${key}`] !== undefined) {
        return true;
      }
    }
  };

  const onAccessTypeChange = (event, input) => {
    setAccessType(event);
    input.onChange(event);
  };

  const getAccessTypeOptions = () => {
    let srcOp = serviceDef.accessTypes;
    return srcOp.map(({ label, name: value }) => ({
      label,
      value
    }));
  };

  const getMaskingAccessTypeOptions = () => {
    return serviceDef.dataMaskDef.maskTypes.map(({ label, name: value }) => ({
      label,
      value
    }));
  };

  const onShareMaskChange = (event, input) => {
    setSelectedShareMask(event);
    input.onChange(event);
  };

  const handleDataChange = (userList, groupList, roleList) => {
    setUserList(userList);
    setGroupList(groupList);
    setRoleList(roleList);
  };

  const datashareBooleanExpression = (event) => {
    setDatashareConditionExpr(event.target.value);
  };

  const MaskingConfig = (props) => {
    const { addTagMaskingConfig } = props;
    return (
      <div>
        <FieldArray name="tagMaskInfo">
          {({ fields }) =>
            fields.map((name, index) => (
              <div>
                <span>Tag Name : </span>
                <div className="gds-form-input">
                  <Field
                    name={`${name}.tagName`}
                    render={({ input, meta }) => (
                      <input
                        {...input}
                        type="text"
                        //name={`${name}.tagName`}
                        className="form-control"
                        data-cy="tagName"
                        //onChange={tagNameChange}
                        //value={tagName}
                      />
                    )}
                  />
                </div>
                <span>Masking Type : </span>
                <Field
                  className="form-control"
                  name={`${name}.shareDataMaskInfo`}
                  render={({ input, meta }) => (
                    <div>
                      <Field
                        name={`maskType`}
                        render={({ input, meta }) => (
                          <Field
                            name={`${name}.masking`}
                            render={({ input, meta }) => (
                              <div className="d-flex ">
                                <div className="w-50">
                                  <Select
                                    {...input}
                                    defaultOptions
                                    //value={selectedShareMask}
                                    options={maskTypeOptions}
                                    onChange={(e) =>
                                      onShareMaskChange(e, input)
                                    }
                                    isClearable={false}
                                    width="500px"
                                  />
                                </div>
                                {fields?.value[index]?.masking?.label ==
                                  "Custom" && (
                                  <div className="pl-2 w-50">
                                    <Field
                                      className="form-control"
                                      name={`${name}.shareDataMaskInfo.valueExpr`}
                                      //validate={required}
                                      render={({ input, meta }) => (
                                        <>
                                          <FormB.Control
                                            type="text"
                                            className="gds-input"
                                            {...input}
                                            placeholder="Enter masked value or expression..."
                                          />
                                          {meta.error && (
                                            <span className="invalid-field">
                                              {meta.error}
                                            </span>
                                          )}
                                        </>
                                      )}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          />
                        )}
                      />
                    </div>
                  )}
                />
                <Button
                  variant="danger"
                  size="sm"
                  title="Remove"
                  onClick={() => {
                    fields.remove(index);
                  }}
                  data-action="delete"
                  data-cy="delete"
                >
                  <i className="fa-fw fa fa-remove"></i>
                </Button>
              </div>
            ))
          }
        </FieldArray>

        <Button
          className="btn btn-mini mt-2"
          type="button"
          onClick={() => addTagMaskingConfig("tagMaskInfo", undefined)}
          data-action="addTagMaskInfo"
          data-cy="addTagMaskInfo"
          title="Add"
        >
          Add More
        </Button>
      </div>
    );
  };

  return (
    <>
      <Form
        id="myform2"
        name="myform2"
        onSubmit={onSubmit}
        mutators={{
          ...arrayMutators
        }}
        render={({
          handleSubmit,
          submitting,
          required,
          values,
          form: {
            mutators: { push: addTagMaskingConfig, pop }
          }
        }) => (
          <div>
            <div className="gds-form-header-wrapper">
              <h3 className="gds-header bold">Create Datashare</h3>

              <div className="gds-header-btn-grp">
                <Button
                  variant="secondary"
                  type="button"
                  size="sm"
                  onClick={cancelDatashareDetails}
                  data-id="cancel"
                  data-cy="cancel"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={() => subhmitDatashareDetails(values)}
                  size="sm"
                  data-id="save"
                  data-cy="save"
                >
                  {saveButtonText}
                </Button>
              </div>
            </div>

            {step == 1 && (
              <div className="gds-form-wrap">
                <div className="gds-form-header">
                  <h6 className="gds-form-step-num">Step 1</h6>
                  <h2 className="gds-form-step-name">Basic details</h2>
                </div>
                <div className="gds-form-content">
                  <div className="gds-form-input">
                    <input
                      type="text"
                      name="datashareName"
                      placeholder="Datashare Name"
                      className="form-control"
                      data-cy="datashareName"
                      onChange={datashareNameChange}
                      value={datashareName}
                    />
                  </div>
                  <div className="gds-form-content">
                    <Field
                      className="form-control"
                      name="selectService"
                      render={({ input }) => (
                        <div className="gds-form-input">
                          <AsyncSelect
                            {...input}
                            defaultOptions={defaultServiceOptions}
                            onFocus={() => {
                              onFocusServiceSelect();
                            }}
                            value={selectedService}
                            loadOptions={fetchService}
                            onChange={(e) => onServiceChange(e, input)}
                            isClearable={true}
                            placeholder="Select Service"
                            width="500px"
                          />
                        </div>
                      )}
                    />
                    <div className="gds-form-input">
                      <Field
                        className="form-control"
                        name="selectSecurityZone"
                        render={({ input }) => (
                          <div className="gds-form-input">
                            <AsyncSelect
                              {...input}
                              value={selectedZone}
                              loadOptions={fetchSecurityZone}
                              onFocus={() => {
                                onFocusZoneSelect();
                              }}
                              defaultOptions={defaultZoneOptions}
                              onChange={(e) => setZone(e, input)}
                              isClearable={true}
                              placeholder="Select Security Zone (Optional)"
                              width="500px"
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>
                  <div className="gds-form-input">
                    <textarea
                      placeholder="Datashare Description"
                      className="form-control"
                      id="description"
                      data-cy="description"
                      onChange={datashareDescriptionChange}
                      value={datashareDescription}
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            )}

            {step == 2 && (
              <div className="gds-form-wrap">
                <div className="gds-form-header">
                  <h6 className="gds-form-step-num">Step 2</h6>
                  <h2 className="gds-form-step-name">Specify Conditions</h2>
                </div>
                <div>
                  <Card className="gds-section-card gds-bg-white">
                    <div className="gds-section-title">
                      <p className="gds-card-heading">Conditions</p>
                    </div>
                    <div className="gds-flex mg-b-10">
                      <textarea
                        placeholder="Boolean Expression"
                        className="form-control"
                        id="dsBooleanExpression"
                        onChange={datashareBooleanExpression}
                        data-cy="dsBooleanExpression"
                        rows={4}
                      />
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {step == 3 && (
              <div className="gds-form-wrap">
                <div className="gds-form-header">
                  <h6 className="gds-form-step-num">Step 3</h6>
                  <h2 className="gds-form-step-name">
                    Select default access types
                  </h2>
                </div>
                <div>
                  <div className="gds-section-title">
                    <p className="gds-card-heading">Access Configuration</p>
                  </div>
                  <div className="gds-flex mg-b-10">
                    <div className="gds-flex">
                      <div>
                        <Field
                          name={`permission`}
                          render={({ input, meta }) => (
                            <div className="flex-1">
                              <span> Default Access Types : </span>
                              <Select
                                {...input}
                                options={accessTypeOptions}
                                onChange={(e) => onAccessTypeChange(e, input)}
                                menuPortalTarget={document.body}
                                value={accessType}
                                menuPlacement="auto"
                                placeholder="All Permissions"
                                isClearable
                                isMulti
                              />
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {false && maskDef ? (
                  <div className="gds-section-title">
                    <p className="gds-card-heading">
                      Tag Masking Configuration
                    </p>

                    <MaskingConfig addTagMaskingConfig={addTagMaskingConfig} />
                    {/* <div>
                      <FieldArray name="tagMaskInfo">
                        {({ fields }) =>
                          fields.map((name, index) => (
                            <div>
                              <span>Tag Name : </span>
                              <div className="gds-form-input">
                                <input
                                  type="text"
                                  name="tagName"
                                  className="form-control"
                                  data-cy="tagName"
                                  onChange={tagNameChange}
                                  value={tagName}
                                />
                              </div>
                              <span>Masking Type : </span>
                              <Field
                                className="form-control"
                                name={`shareDataMaskInfo`}
                                render={({ input, meta }) => (
                                  <div>
                                    <Field
                                      name={`maskType`}
                                      render={({ input, meta }) => (
                                        <Field
                                          name="masking"
                                          render={({ input, meta }) => (
                                            <div className="d-flex ">
                                              <div className="w-50">
                                                <Select
                                                  {...input}
                                                  defaultOptions
                                                  value={selectedShareMask}
                                                  options={maskTypeOptions}
                                                  onChange={(e) =>
                                                    onShareMaskChange(e, input)
                                                  }
                                                  isClearable={false}
                                                  width="500px"
                                                />
                                              </div>
                                              {selectedShareMask?.label ==
                                                "Custom" && (
                                                <div className="pl-2 w-50">
                                                  <Field
                                                    className="form-control"
                                                    name={`shareDataMaskInfo.valueExpr`}
                                                    validate={required}
                                                    render={({
                                                      input,
                                                      meta
                                                    }) => (
                                                      <>
                                                        <FormB.Control
                                                          type="text"
                                                          className="gds-input"
                                                          {...input}
                                                          placeholder="Enter masked value or expression..."
                                                        />
                                                        {meta.error && (
                                                          <span className="invalid-field">
                                                            {meta.error}
                                                          </span>
                                                        )}
                                                      </>
                                                    )}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        />
                                      )}
                                    />
                                  </div>
                                )}
                              />
                              <Button
                                variant="danger"
                                size="sm"
                                title="Remove"
                                onClick={() => {
                                  fields.remove(index);
                                }}
                                data-action="delete"
                                data-cy="delete"
                              >
                                <i className="fa-fw fa fa-remove"></i>
                              </Button>
                            </div>
                          ))
                        }
                      </FieldArray>

                      <Button
                        className="btn btn-mini mt-2"
                        type="button"
                        onClick={() => push("tagMaskInfo", undefined)}
                        data-action="addTagMaskInfo"
                        data-cy="addTagMaskInfo"
                        title="Add"
                      >
                        Add More
                      </Button>
                    </div> */}
                  </div>
                ) : (
                  <div></div>
                )}
              </div>
            )}

            {step == 4 && (
              <div className="gds-form-wrap">
                <div className="gds-form-header">
                  <h6 className="gds-form-step-num">Step 4</h6>
                  <h2 className="gds-form-step-name">Datashare Visibility</h2>
                </div>
                <PrinciplePermissionComp
                  userList={userList}
                  groupList={groupList}
                  roleList={roleList}
                  type="datashare"
                  onDataChange={handleDataChange}
                />
              </div>
            )}

            {step == 5 && (
              <div className="gds-form-wrap">
                <div className="gds-form-header">
                  <h6 className="gds-form-step-num">Step 5</h6>
                  <h2 className="gds-form-step-name">
                    Specify terms and conditions
                  </h2>
                </div>
                <table className="gds-table">
                  <tr>
                    <td>
                      <textarea
                        placeholder="Terms & Conditions"
                        className="form-control"
                        id="termsAndConditions"
                        data-cy="termsAndConditions"
                        onChange={datashareTermsAndConditionsChange}
                        value={datashareTermsAndConditions}
                        rows={16}
                      />
                    </td>
                  </tr>
                </table>
              </div>
            )}
          </div>
        )}
      />
    </>
  );
};

export default AddDatashareView;
