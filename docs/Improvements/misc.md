Schema UI: Improve CSS/styling around schema updates to be more user-friendly.
Action Block: Implement attribute selection from the output schema in the Action Block (currently not possible).
Rule Template Config: Add "Allowed Outputs" configuration field to Rule Templates (e.g., restrict to modifying object vs creating facts).
Hierarchy View: Refactor Template View to show full hierarchy: Project -> Schemas -> Rule Templates -> Rules.
Dont show Rules (4) in template view. For your understanding here is the structure
Project (1)
schemas (2)
    rule-templates (3)
        Rule (4)
        Rule (5)
        Rule (6)
    rule-templates (7)   
        Rule (8)
        Rule (9)
        Rule (10)
Project Audit: Add an Audit tab to the project view to track all changes made to the project.
Execution Dashboard: Create a dashboard for rule executions (success/trigger counts) with time-based filtering (last minute, hour, 24h).