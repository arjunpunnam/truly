package com.ruleengine.drools;

import com.ruleengine.dto.ExecuteRulesResponse;
import com.ruleengine.dto.ExecuteRulesResponse.FiredRule;
import com.ruleengine.model.Rule;
import org.kie.api.KieBase;
import org.kie.api.KieServices;
import org.kie.api.builder.KieBuilder;
import org.kie.api.builder.KieFileSystem;
import org.kie.api.builder.Message;
import org.kie.api.event.rule.AfterMatchFiredEvent;
import org.kie.api.event.rule.DefaultAgendaEventListener;
import org.kie.api.runtime.KieContainer;
import org.kie.api.runtime.KieSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Service for compiling and executing Drools rules.
 */
@Service
public class DroolsService {

    private static final Logger log = LoggerFactory.getLogger(DroolsService.class);
    private final ActionContext actionContext;

    public DroolsService(ActionContext actionContext) {
        this.actionContext = actionContext;
    }

    // Cache of compiled knowledge bases by schema ID
    private final Map<Long, KieBase> kieBaseCache = new ConcurrentHashMap<>();

    /**
     * Compile DRL rules into a KieBase.
     */
    public KieBase compileRules(List<String> drlContents) {
        KieServices ks = KieServices.Factory.get();
        KieFileSystem kfs = ks.newKieFileSystem();

        for (int i = 0; i < drlContents.size(); i++) {
            String drl = drlContents.get(i);
            kfs.write("src/main/resources/rules/rule_" + i + ".drl", drl);
            log.debug("Added DRL rule {}:\n{}", i, drl);
        }

        KieBuilder kieBuilder = ks.newKieBuilder(kfs).buildAll();

        if (kieBuilder.getResults().hasMessages(Message.Level.ERROR)) {
            String errors = kieBuilder.getResults().getMessages(Message.Level.ERROR)
                    .stream()
                    .map(Message::getText)
                    .collect(Collectors.joining("\n"));
            throw new RuntimeException("Failed to compile rules:\n" + errors);
        }

        KieContainer kieContainer = ks.newKieContainer(ks.getRepository().getDefaultReleaseId());
        return kieContainer.getKieBase();
    }

    /**
     * Execute rules against facts.
     */
    public ExecuteRulesResponse executeRules(List<Rule> rules, List<DynamicFact> facts) {
        long startTime = System.currentTimeMillis();

        try {
            // Compile rules
            List<String> drlContents = rules.stream()
                    .map(Rule::getGeneratedDrl)
                    .filter(drl -> drl != null && !drl.isEmpty())
                    .collect(Collectors.toList());

            if (drlContents.isEmpty()) {
                return ExecuteRulesResponse.builder()
                        .success(true)
                        .resultFacts(facts.stream().map(DynamicFact::getData).collect(Collectors.toList()))
                        .firedRules(Collections.emptyList())
                        .executionTimeMs(System.currentTimeMillis() - startTime)
                        .build();
            }

            KieBase kieBase = compileRules(drlContents);
            KieSession kieSession = kieBase.newKieSession();

            // Set globals
            kieSession.setGlobal("actionContext", actionContext);

            // Track fired rules
            Map<String, Integer> firedRuleCounts = new HashMap<>();
            kieSession.addEventListener(new DefaultAgendaEventListener() {
                @Override
                public void afterMatchFired(AfterMatchFiredEvent event) {
                    String ruleName = event.getMatch().getRule().getName();
                    firedRuleCounts.merge(ruleName, 1, Integer::sum);
                }
            });

            // Insert facts
            for (DynamicFact fact : facts) {
                kieSession.insert(fact);
            }

            // Fire rules with a limit to prevent infinite loops
            // (modify() can cause rules to re-fire)
            int maxRuleFirings = 1000;
            int rulesFired = kieSession.fireAllRules(maxRuleFirings);
            log.info("Fired {} rules (max: {})", rulesFired, maxRuleFirings);

            if (rulesFired >= maxRuleFirings) {
                log.warn(
                        "Rule execution hit maximum firing limit of {}. Check for infinite loops caused by modify() actions.",
                        maxRuleFirings);
            }

            // Collect results
            List<Map<String, Object>> resultFacts = facts.stream()
                    .map(DynamicFact::getData)
                    .collect(Collectors.toList());

            // Build fired rules list
            Map<String, Long> ruleNameToId = rules.stream()
                    .collect(Collectors.toMap(Rule::getName, Rule::getId));

            List<FiredRule> firedRules = firedRuleCounts.entrySet().stream()
                    .map(e -> FiredRule.builder()
                            .ruleName(e.getKey())
                            .ruleId(ruleNameToId.get(e.getKey()))
                            .fireCount(e.getValue())
                            .build())
                    .collect(Collectors.toList());

            // Get webhook results
            List<ExecuteRulesResponse.WebhookResult> webhookResults = actionContext.getAndClearWebhookResults();

            kieSession.dispose();

            return ExecuteRulesResponse.builder()
                    .success(true)
                    .resultFacts(resultFacts)
                    .firedRules(firedRules)
                    .webhookResults(webhookResults)
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();

        } catch (Exception e) {
            log.error("Rule execution failed", e);
            actionContext.clear();

            return ExecuteRulesResponse.builder()
                    .success(false)
                    .errorMessage(e.getMessage())
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
        }
    }

    /**
     * Validate DRL syntax without executing.
     */
    public List<String> validateDrl(String drl) {
        try {
            KieServices ks = KieServices.Factory.get();
            KieFileSystem kfs = ks.newKieFileSystem();
            kfs.write("src/main/resources/rules/validation.drl", drl);

            KieBuilder kieBuilder = ks.newKieBuilder(kfs).buildAll();

            return kieBuilder.getResults().getMessages().stream()
                    .map(m -> m.getLevel() + ": " + m.getText())
                    .collect(Collectors.toList());

        } catch (Exception e) {
            return Collections.singletonList("ERROR: " + e.getMessage());
        }
    }

    /**
     * Invalidate cached KieBase for a schema.
     */
    public void invalidateCache(Long schemaId) {
        kieBaseCache.remove(schemaId);
    }

    /**
     * Clear all cached KieBases.
     */
    public void clearCache() {
        kieBaseCache.clear();
    }
}
