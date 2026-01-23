package com.ruleengine.controller;

import com.ruleengine.dto.*;
import com.ruleengine.service.RuleMatchPayloadGenerator;
import com.ruleengine.service.RuleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rules")
public class RuleController {

    private final RuleService ruleService;
    private final RuleMatchPayloadGenerator payloadGenerator;

    public RuleController(RuleService ruleService, RuleMatchPayloadGenerator payloadGenerator) {
        this.ruleService = ruleService;
        this.payloadGenerator = payloadGenerator;
    }

    @GetMapping
    public List<RuleDto> getAllRules(@RequestParam(required = false) Long schemaId) {
        if (schemaId != null) {
            return ruleService.getRulesBySchema(schemaId);
        }
        return ruleService.getAllRules();
    }

    @GetMapping("/{id}")
    public RuleDto getRule(@PathVariable Long id) {
        return ruleService.getRule(id);
    }

    @GetMapping("/{id}/drl")
    public ResponseEntity<String> getGeneratedDrl(@PathVariable Long id) {
        String drl = ruleService.getGeneratedDrl(id);
        return ResponseEntity.ok()
                .header("Content-Type", "text/plain")
                .body(drl);
    }

    @GetMapping("/{id}/match-payload")
    public ResponseEntity<Map<String, Object>> getMatchingPayload(@PathVariable Long id) {
        Map<String, Object> payload = payloadGenerator.generateMatchingPayload(id);
        return ResponseEntity.ok(payload);
    }

    @PostMapping
    public ResponseEntity<RuleDto> createRule(@RequestBody RuleDefinition definition) {
        RuleDto rule = ruleService.createRule(definition);
        return ResponseEntity.status(HttpStatus.CREATED).body(rule);
    }

    @PutMapping("/{id}")
    public RuleDto updateRule(@PathVariable Long id, @RequestBody RuleDefinition definition) {
        return ruleService.updateRule(id, definition);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        ruleService.deleteRule(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/toggle")
    public RuleDto toggleRule(@PathVariable Long id) {
        return ruleService.toggleRule(id);
    }

    @PostMapping("/execute")
    public ExecuteRulesResponse executeRules(@RequestBody ExecuteRulesRequest request) {
        return ruleService.executeRules(request);
    }

    @PostMapping("/{id}/regenerate")
    public ResponseEntity<RuleDto> regenerateDrl(@PathVariable Long id) {
        RuleDto rule = ruleService.regenerateDrl(id);
        return ResponseEntity.ok(rule);
    }
}
