package com.ruleengine.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ruleengine.drools.DroolsService;
import com.ruleengine.drools.JsonToDrlTranspiler;
import com.ruleengine.dto.ApplyAttributeChangeRequest;
import com.ruleengine.dto.ApplyAttributeChangeResponse;
import com.ruleengine.dto.AttributeImpactDto;
import com.ruleengine.dto.RuleDefinition;
import com.ruleengine.model.Rule;
import com.ruleengine.model.RuleProject;
import com.ruleengine.model.Schema;
import com.ruleengine.repository.RuleRepository;
import com.ruleengine.repository.SchemaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SchemaAttributeServiceTest {

    @Mock
    private SchemaRepository schemaRepository;
    @Mock
    private RuleRepository ruleRepository;
    @Mock
    private JsonToDrlTranspiler transpiler;
    @Mock
    private DroolsService droolsService;

    private ObjectMapper objectMapper = new ObjectMapper();
    private SchemaAttributeService service;

    private Schema schema;
    private Rule rule;
    private RuleProject project;

    @BeforeEach
    void setUp() {
        service = new SchemaAttributeService(schemaRepository, ruleRepository, objectMapper, transpiler, droolsService);

        project = new RuleProject();
        project.setId(10L);
        project.setName("Test Project");

        schema = new Schema();
        schema.setId(1L);
        schema.setName("Person");
        schema.setJsonSchema(
                "{\"type\":\"object\",\"properties\":{\"age\":{\"type\":\"integer\"},\"name\":{\"type\":\"string\"}}}");
        schema.setProject(project);

        rule = new Rule();
        rule.setId(100L);
        rule.setName("Age Rule");
        rule.setProject(project);
        rule.setSchema(schema);
        // Rule uses 'age' in condition and matches on it
        rule.setRuleJson(
                "{\"name\":\"Age Rule\",\"conditions\":{\"conditions\":[{\"fact\":\"age\",\"operator\":\"greaterThan\",\"value\":18}]},\"actions\":[{\"type\":\"LOG\",\"targetField\":\"age\"}]}");
    }

    @Test
    void analyzeImpact_ShouldDetectUsages() {
        when(schemaRepository.findById(1L)).thenReturn(Optional.of(schema));
        when(ruleRepository.findBySchemaId(1L)).thenReturn(List.of(rule));

        AttributeImpactDto impact = service.analyzeImpact(1L, "age");

        assertNotNull(impact);
        assertEquals("age", impact.getAttributeName());
        assertEquals(1, impact.getTotalAffectedRules());
        assertEquals("low", impact.getRiskLevel());

        assertEquals(1, impact.getAffectedRules().size());
        assertEquals(100L, impact.getAffectedRules().get(0).getRuleId());

        List<AttributeImpactDto.UsageDto> usages = impact.getAffectedRules().get(0).getUsages();
        assertEquals(2, usages.size()); // 1 condition + 1 action
    }

    @Test
    void analyzeImpact_ShouldReturnNone_WhenAttributeNotUsed() {
        when(schemaRepository.findById(1L)).thenReturn(Optional.of(schema));
        when(ruleRepository.findBySchemaId(1L)).thenReturn(List.of(rule));

        AttributeImpactDto impact = service.analyzeImpact(1L, "name");

        assertNotNull(impact);
        assertEquals("name", impact.getAttributeName());
        assertEquals(0, impact.getTotalAffectedRules());
        assertEquals("none", impact.getRiskLevel());
    }

    @Test
    void applyAttributeChange_Rename_ShouldUpdateSchemaAndRule() throws Exception {
        when(schemaRepository.findById(1L)).thenReturn(Optional.of(schema));
        when(ruleRepository.findBySchemaId(1L)).thenReturn(List.of(rule));
        when(transpiler.transpile(any(RuleDefinition.class), anyString(), anyString()))
                .thenReturn("package com.test; rule 'r' when then end");
        when(droolsService.validateDrl(anyString())).thenReturn(Collections.emptyList());

        ApplyAttributeChangeRequest request = new ApplyAttributeChangeRequest();
        request.setChangeType("rename");
        request.setOldName("age");
        request.setNewName("years");
        request.setConfirmPropagation(true);

        ApplyAttributeChangeResponse response = service.applyAttributeChange(1L, request);

        assertTrue(response.isSuccess());
        assertEquals(1, response.getUpdatedRuleIds().size());

        // Verify Schema Updated
        ArgumentCaptor<Schema> schemaCaptor = ArgumentCaptor.forClass(Schema.class);
        verify(schemaRepository).save(schemaCaptor.capture());
        ObjectNode schemaNode = (ObjectNode) objectMapper.readTree(schemaCaptor.getValue().getJsonSchema());
        assertFalse(schemaNode.get("properties").has("age"));
        assertTrue(schemaNode.get("properties").has("years"));

        // Verify Rule Updated
        ArgumentCaptor<Rule> ruleCaptor = ArgumentCaptor.forClass(Rule.class);
        verify(ruleRepository).save(ruleCaptor.capture());
        String updatedJson = ruleCaptor.getValue().getRuleJson();
        assertTrue(updatedJson.contains("\"fact\":\"years\""));
        assertFalse(updatedJson.contains("\"fact\":\"age\""));
    }
}
