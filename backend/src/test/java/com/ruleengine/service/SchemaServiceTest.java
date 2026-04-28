package com.ruleengine.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.dto.SchemaDto;
import com.ruleengine.dto.SchemaPropertyDto;
import com.ruleengine.model.Schema;
import com.ruleengine.repository.RuleProjectRepository;
import com.ruleengine.repository.RuleRepository;
import com.ruleengine.repository.SchemaRepository;
import com.ruleengine.parser.SchemaParserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SchemaServiceTest {

    @Mock
    private SchemaRepository schemaRepository;
    @Mock
    private RuleRepository ruleRepository;
    @Mock
    private RuleProjectRepository ruleProjectRepository;
    @Mock
    private SchemaParserService schemaParserService;

    private SchemaService service;

    @BeforeEach
    void setUp() {
        service = new SchemaService(schemaRepository, ruleRepository, ruleProjectRepository, schemaParserService,
                new ObjectMapper());
    }

    @Test
    void getSchemasByProject_ParsesLegacyArrayPropertiesFormat() {
        Schema schema = new Schema();
        schema.setId(1L);
        schema.setName("Legacy");
        schema.setJsonSchema("""
                {
                  "name": "Legacy",
                  "path": "Legacy",
                  "type": "object",
                  "properties": [
                    {
                      "name": "decision",
                      "path": "decision",
                      "type": "string"
                    }
                  ]
                }
                """);

        when(schemaRepository.findByProjectIdOrProjectIsNull(99L)).thenReturn(List.of(schema));

        List<SchemaDto> result = service.getSchemasByProject(99L);

        assertEquals(1, result.size());
        assertNotNull(result.get(0).getProperties());
        assertEquals(1, result.get(0).getProperties().size());
        assertEquals("decision", result.get(0).getProperties().get(0).getName());
        assertEquals("decision", result.get(0).getProperties().get(0).getPath());
    }

    @Test
    void getSchemasByProject_ParsesJsonSchemaObjectPropertiesFormat() {
        Schema schema = new Schema();
        schema.setId(2L);
        schema.setName("JsonSchema");
        schema.setJsonSchema("""
                {
                  "type": "object",
                  "required": ["decision"],
                  "properties": {
                    "decision": { "type": "string" },
                    "payment": {
                      "type": "object",
                      "required": ["method"],
                      "properties": {
                        "method": { "type": "string" }
                      }
                    }
                  }
                }
                """);

        when(schemaRepository.findByProjectIdOrProjectIsNull(42L)).thenReturn(List.of(schema));

        List<SchemaDto> result = service.getSchemasByProject(42L);

        assertEquals(1, result.size());
        List<SchemaPropertyDto> properties = result.get(0).getProperties();
        assertEquals(2, properties.size());

        SchemaPropertyDto decision = findByName(properties, "decision");
        assertNotNull(decision);
        assertTrue(decision.isRequired());
        assertEquals("decision", decision.getPath());

        SchemaPropertyDto payment = findByName(properties, "payment");
        assertNotNull(payment);
        assertEquals("payment", payment.getPath());
        assertNotNull(payment.getProperties());
        assertEquals(1, payment.getProperties().size());
        assertEquals("method", payment.getProperties().get(0).getName());
        assertEquals("payment.method", payment.getProperties().get(0).getPath());
        assertTrue(payment.getProperties().get(0).isRequired());
    }

    private SchemaPropertyDto findByName(List<SchemaPropertyDto> properties, String name) {
        return properties.stream().filter(p -> name.equals(p.getName())).findFirst().orElse(null);
    }
}
