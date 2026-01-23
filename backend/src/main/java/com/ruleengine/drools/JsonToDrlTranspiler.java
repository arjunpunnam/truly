package com.ruleengine.drools;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.dto.RuleDefinition;
import com.ruleengine.dto.RuleDefinition.Condition;
import com.ruleengine.dto.RuleDefinition.ConditionGroup;
import com.ruleengine.dto.RuleDefinition.RuleAction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Transpiles JSON rule definitions into Drools Rule Language (DRL).
 */
@Service
public class JsonToDrlTranspiler {

    private static final Logger log = LoggerFactory.getLogger(JsonToDrlTranspiler.class);
    private final ObjectMapper objectMapper;

    // Thread-local storage for current fact type during rule generation
    private String currentFactType = null;

    public JsonToDrlTranspiler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Map of UI operator names to Drools operators.
     */
    private static final Map<String, String> OPERATOR_MAP = Map.ofEntries(
            // Comparison operators
            Map.entry("equals", "=="),
            Map.entry("notEquals", "!="),
            Map.entry("greaterThan", ">"),
            Map.entry("greaterThanOrEquals", ">="),
            Map.entry("lessThan", "<"),
            Map.entry("lessThanOrEquals", "<="),

            // String operators
            Map.entry("contains", "contains"),
            Map.entry("notContains", "not contains"),
            Map.entry("startsWith", "str[startsWith]"),
            Map.entry("endsWith", "str[endsWith]"),
            Map.entry("matches", "matches"),

            // Collection operators
            Map.entry("memberOf", "memberOf"),
            Map.entry("notMemberOf", "not memberOf"),

            // Null operators
            Map.entry("isNull", "== null"),
            Map.entry("isNotNull", "!= null"),

            // Temporal operators (for dates)
            Map.entry("before", "before"),
            Map.entry("after", "after"),
            Map.entry("during", "during"),
            Map.entry("meets", "meets"),
            Map.entry("metBy", "metby"),
            Map.entry("overlaps", "overlaps"),
            Map.entry("overlappedBy", "overlappedby"),
            Map.entry("starts", "starts"),
            Map.entry("startedBy", "startedby"),
            Map.entry("finishes", "finishes"),
            Map.entry("finishedBy", "finishedby"),
            Map.entry("coincides", "coincides"));

    /**
     * Transpile a rule definition to DRL.
     */
    public String transpile(RuleDefinition rule, String packageName, String factClassName) {
        log.info("Transpiling rule '{}' with factClassName: '{}'", rule.getName(), factClassName);
        StringBuilder drl = new StringBuilder();

        // Package declaration
        drl.append("package ").append(packageName).append(";\n\n");

        // Imports
        drl.append("import java.util.*;\n");
        drl.append("import java.time.*;\n");
        drl.append("import com.ruleengine.drools.DynamicFact;\n");
        drl.append("import com.ruleengine.drools.ActionContext;\n\n");

        // Global for action executor
        drl.append("global ActionContext actionContext;\n\n");

        // Rule definition
        drl.append("rule \"").append(escapeString(rule.getName())).append("\"\n");

        // Salience (priority)
        if (rule.getPriority() != 0) {
            drl.append("    salience ").append(rule.getPriority()).append("\n");
        }

        // Enabled/disabled via activation-group
        if (!rule.isEnabled()) {
            drl.append("    enabled false\n");
        }

        // Add no-loop true if rule has MODIFY actions to prevent infinite re-firing of
        // same rule
        boolean hasModifyAction = rule.getActions() != null &&
                rule.getActions().stream().anyMatch(a -> "MODIFY".equals(a.getType()));
        if (hasModifyAction) {
            drl.append("    no-loop true\n");
        }

        // Activation group - only one rule in the group fires (highest salience wins)
        if (rule.getActivationGroup() != null && !rule.getActivationGroup().isEmpty()) {
            drl.append("    activation-group \"").append(escapeString(rule.getActivationGroup())).append("\"\n");
        }

        // Lock-on-active - rule won't re-fire on modifications when in active
        // agenda-group
        if (Boolean.TRUE.equals(rule.getLockOnActive())) {
            drl.append("    lock-on-active true\n");
        }

        // Date-effective - rule becomes active on this date
        if (rule.getDateEffective() != null && !rule.getDateEffective().isEmpty()) {
            drl.append("    date-effective \"").append(rule.getDateEffective()).append("\"\n");
        }

        // Date-expires - rule expires on this date
        if (rule.getDateExpires() != null && !rule.getDateExpires().isEmpty()) {
            drl.append("    date-expires \"").append(rule.getDateExpires()).append("\"\n");
        }

        drl.append("    when\n");

        // Generate LHS (conditions)
        String lhs = generateLHS(rule.getConditions(), factClassName);
        drl.append(lhs);

        drl.append("    then\n");

        // Generate RHS (actions)
        String rhs = generateRHS(rule.getActions());
        drl.append(rhs);

        drl.append("end\n");

        return drl.toString();
    }

    /**
     * Generate the Left-Hand Side (conditions) of the rule.
     */
    private String generateLHS(ConditionGroup conditions, String factClassName) {
        StringBuilder lhs = new StringBuilder();

        // Bind the main fact
        lhs.append("        $fact : DynamicFact(\n");
        lhs.append("            factType == \"").append(factClassName).append("\"");

        if (conditions != null && conditions.getConditions() != null && !conditions.getConditions().isEmpty()) {
            // Store fact class name for path sanitization
            this.currentFactType = factClassName;
            List<String> conditionStrings = conditions.getConditions().stream()
                    .map(this::generateCondition)
                    .filter(s -> s != null && !s.isEmpty())
                    .collect(Collectors.toList());

            if (!conditionStrings.isEmpty()) {
                lhs.append(",\n            ");
                lhs.append(String.join(",\n            ", conditionStrings));
            }
            this.currentFactType = null;
        }

        lhs.append("\n        )\n");

        return lhs.toString();
    }

    /**
     * Generate a single condition expression.
     */
    private String generateCondition(Condition condition) {
        if (condition == null) {
            return null;
        }

        // Handle nested condition groups
        if (condition.getNested() != null) {
            return generateNestedCondition(condition.getNested());
        }

        String fact = condition.getFact();
        String operator = condition.getOperator();
        Object value = condition.getValue();

        if (fact == null || operator == null) {
            return null;
        }

        // Sanitize path - remove fact type prefix if present (e.g., "Order.id" -> "id")
        log.info("Before sanitization - fact: '{}', currentFactType: '{}'", fact, currentFactType);
        String sanitizedPath = sanitizePath(fact);
        log.info("After sanitization - original: '{}', sanitized: '{}'", fact, sanitizedPath);

        // AGGRESSIVE FIX: Force sanitization if path still contains the fact type
        // prefix
        // This is a safety net in case sanitizePath() didn't work
        if (sanitizedPath.equals(fact) && fact.contains(".")) {
            String[] pathParts = fact.split("\\.");
            if (pathParts.length > 1) {
                // If currentFactType is set and matches first part, remove it
                if (currentFactType != null && pathParts[0].equals(currentFactType)) {
                    sanitizedPath = fact.substring(currentFactType.length() + 1);
                    log.warn("FORCE sanitized path '{}' to '{}' (currentFactType match)", fact, sanitizedPath);
                }
                // Otherwise, if first part is capitalized (looks like a type name), remove it
                else if (pathParts[0] != null && !pathParts[0].isEmpty() &&
                        Character.isUpperCase(pathParts[0].charAt(0)) &&
                        pathParts[0].matches("^[A-Z][a-zA-Z0-9]*$")) {
                    sanitizedPath = fact.substring(pathParts[0].length() + 1);
                    log.warn("FORCE sanitized path '{}' to '{}' (capitalized prefix removal)", fact, sanitizedPath);
                }
            }
        }

        // Convert to Drools operator
        String droolsOperator = OPERATOR_MAP.getOrDefault(operator, operator);

        // Determine if this is a simple top-level field (no dots, no brackets)
        boolean isSimplePath = !sanitizedPath.contains(".") && !sanitizedPath.contains("[");
        String getterMethod = isSimplePath ? "get" : "getValue";

        // Handle special cases
        if ("isNull".equals(operator)) {
            return String.format("%s(\"%s\") == null", getterMethod, sanitizedPath);
        }
        if ("isNotNull".equals(operator)) {
            return String.format("%s(\"%s\") != null", getterMethod, sanitizedPath);
        }

        // Generate value expression
        String valueExpr;
        if (condition.isValueIsField()) {
            String fieldPath = sanitizePath(String.valueOf(value));
            valueExpr = String.format("getValue(\"%s\")", fieldPath);
        } else {
            valueExpr = formatValue(value);
        }

        // Handle string operators specially - use getValue with String.class for type
        // safety
        // Use comma-separated constraints (null-safe pattern)
        if ("startsWith".equals(operator) || "endsWith".equals(operator)) {
            String method = "startsWith".equals(operator) ? "startsWith" : "endsWith";
            return String.format("getValue(\"%s\", String.class) != null, getValue(\"%s\", String.class).%s(%s)",
                    sanitizedPath, sanitizedPath, method, valueExpr);
        }

        if ("contains".equals(operator) && value instanceof String) {
            return String.format("getValue(\"%s\", String.class) != null, getValue(\"%s\", String.class).contains(%s)",
                    sanitizedPath, sanitizedPath, valueExpr);
        }

        if ("matches".equals(operator)) {
            return String.format("getValue(\"%s\", String.class) != null, getValue(\"%s\", String.class).matches(%s)",
                    sanitizedPath, sanitizedPath, valueExpr);
        }

        // Handle collection operators
        if ("memberOf".equals(operator) || "notMemberOf".equals(operator)) {
            String not = "notMemberOf".equals(operator) ? "!" : "";
            String collectionPath = sanitizedPath.contains(".")
                    ? sanitizedPath.substring(0, sanitizedPath.lastIndexOf('.'))
                    : sanitizedPath;
            return String.format("%s((Collection)getValue(\"%s\")).contains(%s)",
                    not, collectionPath, valueExpr);
        }

        // Standard comparison with strict type checking
        return generateStrictComparison(sanitizedPath, droolsOperator, valueExpr, value);
    }

    /**
     * Sanitize path by removing fact type prefix if present.
     * Example: "Order.id" -> "id", "Customer.address.city" -> "address.city"
     */
    private String sanitizePath(String path) {
        if (path == null || path.isEmpty()) {
            return path;
        }

        // First, try to match with current fact type (most accurate)
        if (currentFactType != null && !currentFactType.isEmpty()) {
            String factTypePrefix = currentFactType + ".";
            if (path.startsWith(factTypePrefix)) {
                // Remove fact type prefix (e.g., "Order.id" -> "id")
                String sanitized = path.substring(factTypePrefix.length());
                log.info("Sanitized path '{}' to '{}' using factType '{}'", path, sanitized, currentFactType);
                return sanitized;
            }
            // Also try case-insensitive match
            String factTypePrefixLower = factTypePrefix.toLowerCase();
            if (path.length() >= factTypePrefix.length() &&
                    path.substring(0, factTypePrefix.length()).toLowerCase().equals(factTypePrefixLower)) {
                String sanitized = path.substring(factTypePrefix.length());
                log.info("Sanitized path '{}' to '{}' using case-insensitive factType '{}'", path, sanitized,
                        currentFactType);
                return sanitized;
            }
        }

        // Fallback: ALWAYS check for capitalized prefix patterns (runs even if
        // currentFactType didn't match)
        // This ensures we catch cases like "Order.id" even if currentFactType is null
        // or different
        String[] parts = path.split("\\.");
        if (parts.length > 1 && parts[0] != null && !parts[0].isEmpty()) {
            String firstPart = parts[0];
            // If first part is capitalized and looks like a type/class name, remove it
            // This handles cases where the path includes the schema/type name as a prefix
            if (Character.isUpperCase(firstPart.charAt(0)) && firstPart.matches("^[A-Z][a-zA-Z0-9]*$")) {
                // ALWAYS remove capitalized prefixes - fact paths should never start with type
                // names
                // Valid paths are like "id", "status", "customer.name", etc.
                // The only exception would be if it's a valid nested object path, but those are
                // rare
                // and the user can always use the correct path without the type prefix
                String sanitized = path.substring(firstPart.length() + 1);
                log.info(
                        "Sanitized path '{}' to '{}' by removing capitalized prefix '{}' (fallback, currentFactType: {})",
                        path, sanitized, firstPart, currentFactType);
                return sanitized;
            }
        }

        log.warn("Path '{}' was not sanitized (currentFactType: {})", path, currentFactType);
        return path;
    }

    /**
     * Generate simple comparison expression.
     * Uses simpler get() method for top-level fields, getValue() for nested paths.
     */
    private String generateStrictComparison(String path, String operator, String valueExpr, Object value) {
        // Use getValue(path, Class) for type-safe access
        // Use comma-separated constraints (like null-safe dereference operator !.)
        // First constraint checks for null, second does the comparison
        // Drools will short-circuit if the first constraint fails

        // For numeric comparisons, use getValue with appropriate type
        if (value instanceof Number) {
            if (value instanceof Integer || value instanceof Long) {
                // Integer comparison - comma-separated null check and comparison
                return String.format("getValue(\"%s\", Integer.class) != null, getValue(\"%s\", Integer.class) %s %s",
                        path, path, operator, valueExpr);
            } else if (value instanceof Double || value instanceof Float) {
                // Double comparison - comma-separated null check and comparison
                return String.format("getValue(\"%s\", Double.class) != null, getValue(\"%s\", Double.class) %s %s",
                        path, path, operator, valueExpr);
            } else {
                // Generic number comparison - use Double for all numeric types
                return String.format("getValue(\"%s\", Double.class) != null, getValue(\"%s\", Double.class) %s %s",
                        path, path, operator, valueExpr);
            }
        } else if (value instanceof Boolean) {
            // Boolean comparison - comma-separated null check and comparison
            return String.format("getValue(\"%s\", Boolean.class) != null, getValue(\"%s\", Boolean.class) %s %s",
                    path, path, operator, valueExpr);
        } else if (value instanceof String) {
            // String comparison - comma-separated null check and comparison
            return String.format("getValue(\"%s\", String.class) != null, getValue(\"%s\", String.class) %s %s",
                    path, path, operator, valueExpr);
        } else {
            // Default: use getValue for all paths (handles nested paths too)
            // Use comma-separated constraints for null-safety (Drools doesn't support
            // ternary in patterns)
            if ("==".equals(operator) || "equals".equals(operator)) {
                // For equals, if value is null we check getValue is null, otherwise check
                // equals
                if ("null".equals(valueExpr)) {
                    return String.format("getValue(\"%s\") == null", path);
                } else {
                    return String.format("getValue(\"%s\") != null, getValue(\"%s\").equals(%s)",
                            path, path, valueExpr);
                }
            } else if ("!=".equals(operator) || "notEquals".equals(operator)) {
                if ("null".equals(valueExpr)) {
                    return String.format("getValue(\"%s\") != null", path);
                } else {
                    // For not equals, value must exist and not equal the target
                    return String.format("getValue(\"%s\") != null, !getValue(\"%s\").equals(%s)",
                            path, path, valueExpr);
                }
            } else {
                // For other operators, use comma-separated null check and comparison
                return String.format("getValue(\"%s\") != null, getValue(\"%s\") %s %s",
                        path, path, operator, valueExpr);
            }
        }
    }

    /**
     * Generate a nested condition group.
     */
    private String generateNestedCondition(ConditionGroup group) {
        if (group.getConditions() == null || group.getConditions().isEmpty()) {
            return null;
        }

        String joiner = "all".equalsIgnoreCase(group.getOperator()) ? " && " : " || ";

        List<String> conditions = group.getConditions().stream()
                .map(this::generateCondition)
                .filter(s -> s != null && !s.isEmpty())
                .collect(Collectors.toList());

        if (conditions.isEmpty()) {
            return null;
        }

        return "(" + String.join(joiner, conditions) + ")";
    }

    /**
     * Generate the Right-Hand Side (actions) of the rule.
     */
    private String generateRHS(List<RuleAction> actions) {
        if (actions == null || actions.isEmpty()) {
            return "        // No actions defined\n";
        }

        StringBuilder rhs = new StringBuilder();

        for (RuleAction action : actions) {
            switch (action.getType().toUpperCase()) {
                case "MODIFY":
                    rhs.append(generateModifyAction(action));
                    break;
                case "INSERT":
                    rhs.append(generateInsertAction(action));
                    break;
                case "RETRACT":
                    rhs.append(generateRetractAction(action));
                    break;
                case "LOG":
                    rhs.append(generateLogAction(action));
                    break;
                case "WEBHOOK":
                    rhs.append(generateWebhookAction(action));
                    break;
                default:
                    log.warn("Unknown action type: {}", action.getType());
            }
        }

        return rhs.toString();
    }

    private String generateModifyAction(RuleAction action) {
        String sanitizedPath = sanitizePath(action.getTargetField());
        return String.format("        modify($fact) { setValue(\"%s\", %s) };\n",
                sanitizedPath, formatValue(action.getValue()));
    }

    private String generateInsertAction(RuleAction action) {
        StringBuilder sb = new StringBuilder();
        sb.append("        DynamicFact newFact = new DynamicFact(\"").append(action.getFactType()).append("\");\n");
        if (action.getFactData() != null) {
            action.getFactData().forEach((key, value) -> {
                sb.append(String.format("        newFact.setValue(\"%s\", %s);\n", key, formatValue(value)));
            });
        }
        sb.append("        insert(newFact);\n");
        return sb.toString();
    }

    private String generateRetractAction(RuleAction action) {
        return "        retract($fact);\n";
    }

    private String generateLogAction(RuleAction action) {
        return String.format("        actionContext.log(\"%s\", $fact);\n",
                escapeString(action.getLogMessage()));
    }

    private String generateWebhookAction(RuleAction action) {
        StringBuilder sb = new StringBuilder();
        sb.append("        actionContext.executeWebhook(\n");
        sb.append("            \"").append(escapeString(action.getWebhookUrl())).append("\",\n");
        sb.append("            \"").append(action.getWebhookMethod() != null ? action.getWebhookMethod() : "POST")
                .append("\",\n");
        sb.append("            $fact,\n");

        // Headers
        if (action.getWebhookHeaders() != null && !action.getWebhookHeaders().isEmpty()) {
            String headers = action.getWebhookHeaders().entrySet().stream()
                    .map(e -> String.format("\"%s\", \"%s\"", escapeString(e.getKey()), escapeString(e.getValue())))
                    .collect(Collectors.joining(", ", "java.util.Map.of(", ")"));
            sb.append("            ").append(headers);
        } else {
            sb.append("            java.util.Collections.emptyMap()");
        }
        sb.append("\n        );\n");

        return sb.toString();
    }

    /**
     * Format a value for DRL.
     */
    private String formatValue(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof String) {
            return "\"" + escapeString((String) value) + "\"";
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        // For complex objects, serialize to JSON string
        try {
            return "\"" + escapeString(objectMapper.writeValueAsString(value)) + "\"";
        } catch (Exception e) {
            return "\"" + escapeString(value.toString()) + "\"";
        }
    }

    /**
     * Escape special characters in strings.
     */
    private String escapeString(String str) {
        if (str == null)
            return "";
        return str.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
