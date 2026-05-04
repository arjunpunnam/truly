package com.ruleengine.drools;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.dto.RuleDefinition;
import com.ruleengine.dto.RuleDefinition.Condition;
import com.ruleengine.dto.RuleDefinition.ConditionGroup;
import com.ruleengine.dto.RuleDefinition.RuleAction;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JsonToDrlTranspilerTest {

    private final JsonToDrlTranspiler transpiler = new JsonToDrlTranspiler(new ObjectMapper());

    @Test
    void transpileSanitizesPathsWithCurrentRequestFactTypeOnly() {
        RuleDefinition orderRule = rule(
                "Order Rule",
                new ConditionGroup("all", List.of(
                        condition("Order.status", "equals", "NEW", false, null),
                        condition(null, null, null, false, new ConditionGroup("all", List.of(
                                condition("Order.total", "greaterThan", 100, false, null),
                                condition("Order.discount", "equals", "Order.expectedDiscount", true, null)))))),
                List.of(modify("Order.approvalState", "review")));
        RuleDefinition customerRule = rule(
                "Customer Rule",
                new ConditionGroup("all", List.of(
                        condition("Customer.tier", "equals", "gold", false, null))),
                List.of(modify("Customer.flag", true)));

        String orderDrl = transpiler.transpile(orderRule, "com.ruleengine.test", "Order");
        String customerDrl = transpiler.transpile(customerRule, "com.ruleengine.test", "Customer");

        assertTrue(orderDrl.contains("factType == \"Order\""));
        assertTrue(orderDrl.contains("getValue(\"status\", String.class)"));
        assertTrue(orderDrl.contains("getValue(\"total\", Integer.class)"));
        assertTrue(orderDrl.contains(
                "getValue(\"discount\", String.class) != null, getValue(\"discount\", String.class) == getValue(\"expectedDiscount\")"));
        assertTrue(orderDrl.contains("modify($fact) { setValue(\"approvalState\", \"review\") };"));
        assertFalse(orderDrl.contains("Order.status"));
        assertFalse(orderDrl.contains("Order.approvalState"));

        assertTrue(customerDrl.contains("factType == \"Customer\""));
        assertTrue(customerDrl.contains("getValue(\"tier\", String.class)"));
        assertTrue(customerDrl.contains("modify($fact) { setValue(\"flag\", true) };"));
        assertFalse(customerDrl.contains("Customer.tier"));
        assertFalse(customerDrl.contains("Customer.flag"));
    }

    private RuleDefinition rule(String name, ConditionGroup conditions, List<RuleAction> actions) {
        RuleDefinition rule = new RuleDefinition();
        rule.setName(name);
        rule.setEnabled(true);
        rule.setConditions(conditions);
        rule.setActions(actions);
        return rule;
    }

    private Condition condition(String fact, String operator, Object value, boolean valueIsField, ConditionGroup nested) {
        Condition condition = new Condition();
        condition.setFact(fact);
        condition.setOperator(operator);
        condition.setValue(value);
        condition.setValueIsField(valueIsField);
        condition.setNested(nested);
        return condition;
    }

    private RuleAction modify(String targetField, Object value) {
        RuleAction action = new RuleAction();
        action.setType("MODIFY");
        action.setTargetField(targetField);
        action.setValue(value);
        return action;
    }
}
