package com.ruleengine.dto;

import java.util.List;

public class SchemaPreviewDto {
    private String name;
    private List<String> entities;

    public SchemaPreviewDto() {
    }

    public SchemaPreviewDto(String name, List<String> entities) {
        this.name = name;
        this.entities = entities;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<String> getEntities() {
        return entities;
    }

    public void setEntities(List<String> entities) {
        this.entities = entities;
    }
}
