import * as ohm from 'ohm-js';
import grammarSource from './grammar.js';
import { toJson } from './semantics.js';

const removeEmptyLines = str => str.split(/\r?\n/).filter(line => line.trim() !== '').join('\n');

export function convert(sql) {
    let result;
    sql = removeEmptyLines(sql);
    console.log(grammarSource);
    const g = ohm.grammar(grammarSource.grammarSource);
    const semantics = g.createSemantics().addOperation("toJson", toJson);
    const m = g.match(sql);
    if (m.succeeded()) {
        result = semantics(m).toJson();
    } else {
        result = m.message
    }
    return JSON.stringify(result, null, 2);
}
