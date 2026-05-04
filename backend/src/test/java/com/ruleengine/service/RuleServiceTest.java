package com.ruleengine.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.drools.DroolsService;
import com.ruleengine.drools.DynamicFact;
import com.ruleengine.drools.JsonToDrlTranspiler;
import com.ruleengine.dto.ExecuteRulesRequest;
import com.ruleengine.dto.ExecuteRulesResponse;
import com.ruleengine.model.Rule;
import com.ruleengine.model.Schema;
import com.ruleengine.repository.RuleAuditLogRepository;
import com.ruleengine.repository.RuleProjectRepository;
import com.ruleengine.repository.RuleRepository;
import com.ruleengine.repository.SchemaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RuleServiceTest {

    @Mock
    private RuleRepository ruleRepository;
    @Mock
    private SchemaRepository schemaRepository;
    @Mock
    private RuleProjectRepository projectRepository;
    @Mock
    private RuleAuditLogRepository auditLogRepository;
    @Mock
    private JsonToDrlTranspiler transpiler;
    @Mock
    private DroolsService droolsService;

    private RuleService service;
    private Schema schema;

    @BeforeEach
    void setUp() {
        service = new RuleService(ruleRepository, schemaRepository, projectRepository, auditLogRepository, transpiler,
                droolsService, new ObjectMapper());

        schema = new Schema();
        schema.setId(1L);
        schema.setName("Person");
    }

    @Test
    void executeRules_WithExplicitRuleIds_FiltersDisabledRulesBeforeExecution() {
        Rule enabledRule = rule(10L, "Enabled Rule", true);
        Rule disabledRule = rule(20L, "Disabled Rule", false);
        List<Map<String, Object>> facts = List.of(Map.of("age", 30));

        when(ruleRepository.findAllById(List.of(10L, 20L))).thenReturn(List.of(enabledRule, disabledRule));
        when(droolsService.executeRules(anyList(), anyList()))
                .thenReturn(ExecuteRulesResponse.builder()
                        .success(true)
                        .resultFacts(facts)
                        .firedRules(List.of())
                        .executionTimeMs(1)
                        .build());

        ExecuteRulesResponse response = service.executeRules(ExecuteRulesRequest.builder()
                .ruleIds(List.of(10L, 20L))
                .facts(facts)
                .dryRun(true)
                .build());

        assertTrue(response.isSuccess());

        ArgumentCaptor<List<Rule>> rulesCaptor = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<List<DynamicFact>> factsCaptor = ArgumentCaptor.forClass(List.class);
        verify(droolsService).executeRules(rulesCaptor.capture(), factsCaptor.capture());

        assertEquals(List.of(enabledRule), rulesCaptor.getValue());
        assertEquals(1, factsCaptor.getValue().size());
        assertEquals("Person", factsCaptor.getValue().get(0).getFactType());
    }

    @Test
    void executeRules_WithOnlyDisabledExplicitRuleIds_ReturnsWithoutDroolsExecution() {
        Rule disabledRule = rule(20L, "Disabled Rule", false);
        List<Map<String, Object>> facts = List.of(Map.of("age", 30));

        when(ruleRepository.findAllById(List.of(20L))).thenReturn(List.of(disabledRule));

        ExecuteRulesResponse response = service.executeRules(ExecuteRulesRequest.builder()
                .ruleIds(List.of(20L))
                .facts(facts)
                .dryRun(true)
                .build());

        assertTrue(response.isSuccess());
        assertEquals(facts, response.getResultFacts());
        assertEquals(List.of(), response.getFiredRules());
        verify(droolsService, never()).executeRules(anyList(), anyList());
    }

    private Rule rule(Long id, String name, boolean enabled) {
        Rule rule = new Rule();
        rule.setId(id);
        rule.setName(name);
        rule.setSchema(schema);
        rule.setGeneratedDrl("package com.ruleengine.generated; rule \"" + name + "\" when then end");
        rule.setRuleJson("{}");
        rule.setEnabled(enabled);
        return rule;
    }
}
