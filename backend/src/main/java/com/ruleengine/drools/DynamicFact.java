package com.ruleengine.drools;

import java.util.HashMap;
import java.util.Map;

/**
 * A dynamic fact that can hold any data structure.
 * This allows rules to work with arbitrary JSON objects.
 */
public class DynamicFact {

    private String factType;
    private Map<String, Object> data;

    public String getFactType() {
        return factType;
    }

    public void setFactType(String factType) {
        this.factType = factType;
    }

    public Map<String, Object> getData() {
        return data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data;
    }

    public DynamicFact() {
        this.data = new HashMap<>();
    }

    public DynamicFact(String factType) {
        this.factType = factType;
        this.data = new HashMap<>();
    }

    public DynamicFact(String factType, Map<String, Object> data) {
        this.factType = factType;
        this.data = data != null ? new HashMap<>(data) : new HashMap<>();
    }

    /**
     * Simple getter for top-level fields (faster than getValue for simple paths).
     * Use this for simple field access like "id", "status", etc.
     */
    public Object get(String key) {
        return data != null ? data.get(key) : null;
    }

    /**
     * Get a value by path (supports nested paths like "customer.address.city").
     * For simple top-level fields, use get(key) instead for better performance.
     */
    @SuppressWarnings("unchecked")
    public Object getValue(String path) {
        if (path == null || path.isEmpty()) {
            return null;
        }

        // For simple paths (no dots), use direct map access
        if (!path.contains(".") && !path.contains("[")) {
            return get(path);
        }

        String[] parts = path.split("\\.");
        Object current = data;

        for (String part : parts) {
            if (current == null) {
                return null;
            }

            // Handle array index notation like "items[0]"
            if (part.contains("[") && part.contains("]")) {
                String fieldName = part.substring(0, part.indexOf('['));
                int index = Integer.parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));

                if (current instanceof Map) {
                    current = ((Map<String, Object>) current).get(fieldName);
                }

                if (current instanceof java.util.List) {
                    java.util.List<?> list = (java.util.List<?>) current;
                    if (index >= 0 && index < list.size()) {
                        current = list.get(index);
                    } else {
                        return null;
                    }
                }
            } else if (current instanceof Map) {
                current = ((Map<String, Object>) current).get(part);
            } else {
                return null;
            }
        }

        return current;
    }

    /**
     * Set a value by path (supports nested paths).
     */
    @SuppressWarnings("unchecked")
    public void setValue(String path, Object value) {
        if (path == null || path.isEmpty()) {
            return;
        }

        String[] parts = path.split("\\.");
        Map<String, Object> current = data;

        // Navigate to the parent of the target field, creating maps as needed
        for (int i = 0; i < parts.length - 1; i++) {
            String part = parts[i];
            Object next = current.get(part);

            if (next == null) {
                next = new HashMap<String, Object>();
                current.put(part, next);
            }

            if (next instanceof Map) {
                current = (Map<String, Object>) next;
            } else {
                // Cannot navigate further
                return;
            }
        }

        // Set the final value
        current.put(parts[parts.length - 1], value);
    }

    /**
     * Check if a path exists.
     */
    public boolean hasValue(String path) {
        return getValue(path) != null;
    }

    /**
     * Get value as a specific type.
     */
    @SuppressWarnings("unchecked")
    public <T> T getValue(String path, Class<T> type) {
        Object value = getValue(path);
        if (value == null) {
            return null;
        }
        if (type.isInstance(value)) {
            return (T) value;
        }
        // Try basic conversions
        if (type == String.class) {
            return (T) value.toString();
        }
        if (type == Integer.class && value instanceof Number) {
            return (T) Integer.valueOf(((Number) value).intValue());
        }
        if (type == Long.class && value instanceof Number) {
            return (T) Long.valueOf(((Number) value).longValue());
        }
        if (type == Double.class && value instanceof Number) {
            return (T) Double.valueOf(((Number) value).doubleValue());
        }
        if (type == Boolean.class && value instanceof Boolean) {
            return (T) value;
        }
        return null;
    }

    /**
     * Create a copy of this fact.
     */
    public DynamicFact copy() {
        return new DynamicFact(this.factType, deepCopy(this.data));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> deepCopy(Map<String, Object> original) {
        Map<String, Object> copy = new HashMap<>();
        for (Map.Entry<String, Object> entry : original.entrySet()) {
            Object value = entry.getValue();
            if (value instanceof Map) {
                copy.put(entry.getKey(), deepCopy((Map<String, Object>) value));
            } else if (value instanceof java.util.List) {
                copy.put(entry.getKey(), new java.util.ArrayList<>((java.util.List<?>) value));
            } else {
                copy.put(entry.getKey(), value);
            }
        }
        return copy;
    }
}
