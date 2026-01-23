package com.ruleengine.dto;

import java.util.List;

/**
 * Response DTO for attribute change propagation results.
 */
public class ApplyAttributeChangeResponse {

    private boolean success;
    private String message;
    private List<Long> updatedRuleIds;
    private List<Long> failedRuleIds;
    private List<String> errors;

    public ApplyAttributeChangeResponse() {
    }

    public ApplyAttributeChangeResponse(boolean success, String message,
            List<Long> updatedRuleIds, List<Long> failedRuleIds, List<String> errors) {
        this.success = success;
        this.message = message;
        this.updatedRuleIds = updatedRuleIds;
        this.failedRuleIds = failedRuleIds;
        this.errors = errors;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<Long> getUpdatedRuleIds() {
        return updatedRuleIds;
    }

    public void setUpdatedRuleIds(List<Long> updatedRuleIds) {
        this.updatedRuleIds = updatedRuleIds;
    }

    public List<Long> getFailedRuleIds() {
        return failedRuleIds;
    }

    public void setFailedRuleIds(List<Long> failedRuleIds) {
        this.failedRuleIds = failedRuleIds;
    }

    public List<String> getErrors() {
        return errors;
    }

    public void setErrors(List<String> errors) {
        this.errors = errors;
    }

    // Static factory methods
    public static ApplyAttributeChangeResponse success(String message, List<Long> updatedRuleIds) {
        return new ApplyAttributeChangeResponse(true, message, updatedRuleIds, List.of(), List.of());
    }

    public static ApplyAttributeChangeResponse failure(String message, List<String> errors) {
        return new ApplyAttributeChangeResponse(false, message, List.of(), List.of(), errors);
    }

    public static ApplyAttributeChangeResponse partial(String message,
            List<Long> updatedRuleIds, List<Long> failedRuleIds, List<String> errors) {
        return new ApplyAttributeChangeResponse(false, message, updatedRuleIds, failedRuleIds, errors);
    }
}
