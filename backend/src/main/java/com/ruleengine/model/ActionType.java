package com.ruleengine.model;

/**
 * Types of actions that can be executed when a rule fires.
 */
public enum ActionType {
    MODIFY,    // Modify a field value on a fact
    INSERT,    // Insert a new fact into working memory
    RETRACT,   // Remove a fact from working memory
    LOG,       // Log an audit entry
    WEBHOOK    // Call an external REST endpoint
}
