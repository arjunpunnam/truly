package com.ruleengine.dto;

/**
 * Request DTO for applying attribute changes with propagation.
 */
public class ApplyAttributeChangeRequest {

    private String changeType; // "rename", "retype", "delete"
    private String oldName; // Current attribute name
    private String newName; // New name (for rename)
    private String newType; // New type (for retype)
    private boolean confirmPropagation;

    public ApplyAttributeChangeRequest() {
    }

    public String getChangeType() {
        return changeType;
    }

    public void setChangeType(String changeType) {
        this.changeType = changeType;
    }

    public String getOldName() {
        return oldName;
    }

    public void setOldName(String oldName) {
        this.oldName = oldName;
    }

    public String getNewName() {
        return newName;
    }

    public void setNewName(String newName) {
        this.newName = newName;
    }

    public String getNewType() {
        return newType;
    }

    public void setNewType(String newType) {
        this.newType = newType;
    }

    public boolean isConfirmPropagation() {
        return confirmPropagation;
    }

    public void setConfirmPropagation(boolean confirmPropagation) {
        this.confirmPropagation = confirmPropagation;
    }
}
