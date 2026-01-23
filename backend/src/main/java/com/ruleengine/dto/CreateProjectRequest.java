package com.ruleengine.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateProjectRequest {
    @NotBlank
    @JsonProperty("name")
    private String name;

    @JsonProperty("description")
    private String description;

    // Support for multiple input schemas
    @JsonProperty("inputSchemaIds")
    private List<Long> inputSchemaIds;

    // Support for multiple output schemas
    @JsonProperty("outputSchemaIds")
    private List<Long> outputSchemaIds;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<Long> getInputSchemaIds() {
        return inputSchemaIds;
    }

    public void setInputSchemaIds(List<Long> inputSchemaIds) {
        this.inputSchemaIds = inputSchemaIds;
    }

    public List<Long> getOutputSchemaIds() {
        return outputSchemaIds;
    }

    public void setOutputSchemaIds(List<Long> outputSchemaIds) {
        this.outputSchemaIds = outputSchemaIds;
    }

    // Allowed output action types (comma-separated: MODIFY,INSERT,LOG,WEBHOOK)
    @JsonProperty("allowedOutputTypes")
    private String allowedOutputTypes;

    public String getAllowedOutputTypes() {
        return allowedOutputTypes;
    }

    public void setAllowedOutputTypes(String allowedOutputTypes) {
        this.allowedOutputTypes = allowedOutputTypes;
    }
}
