/**
 * Replaces variables in a template string with actual values from data object.
 * Supports:
 * - Direct mapping: {{key}} -> data[key]
 * - Config mapping: config.mapping[key] -> data[mapped_key]
 * - Fallback: Removes unresolved placeholders
 */
export const replaceVariables = (template: string, data: Record<string, string>, config?: any) => {
    if (!template) return '';

    let result = template;

    // 0. Handle empty data
    if (!data || Object.keys(data).length === 0) {
        // Replace all {{variable}} with empty string to avoid showing raw placeholders
        return result.replace(/{{([^}]+)}}/g, '');
    }

    // 1. Replace explicit keys from config mapping if available
    if (config?.personalization_field_mapping) {
        Object.keys(config.personalization_field_mapping).forEach(logicalKey => {
            const fieldId = config.personalization_field_mapping[logicalKey];
            if (data[fieldId] !== undefined) {
                result = result.replace(new RegExp(`{{${logicalKey}}}`, 'g'), data[fieldId]);
            }
        });
    }

    // 2. Replace direct field IDs matches
    Object.keys(data).forEach(key => {
        // Only replace if it hasn't been replaced yet (though regex above is specific)
        // Use global flag 'g' to replace all occurrences
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    });

    // 3. Clean up remaining placeholders that weren't resolved
    // This ensures checking "Hello {{name}}" becomes "Hello " if name is missing
    result = result.replace(/{{([^}]+)}}/g, '');

    return result;
}
