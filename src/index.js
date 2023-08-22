import * as ohm from 'ohm-js';
import grammarSource from './grammar.js';
import { toJson } from './semantics.js';
import * as mustache from 'mustache';

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
    return result;
}


function genTable(element){
    let out ='create table ' + element.tableName + '('
    for (const c in element.columns){
        if (c>0){out = out + ', ';}
        let col = element.columns[c]
        if (col.constraint.length == 1){
            out = out + col.columnName + ' ' + col.dataType + ' ' +col.notNull;
        } else {
            out = out + col.sourceString;
        }
        out = out + ');'
    }
    return out;
    
}

export function refactor(config, statmentsJson) {
    let stmts = statmentsJson;
    let output = {
        'tables': []
    };
    for (const i in stmts) {
       let element = stmts[i];
        if (element.type == 'createTable') {
            let ind = output.tables.findIndex((elm) => elm.name == element.tableName);
            let obj = {};
            if (typeof ind !== 'undefined' && ind > -1) { obj = output.tables[ind]; }
            else {
                obj = {
                    name:'',
                    statements: ['']
                };
                ind = output.tables.push(obj);
            }
            obj.name = element.tableName;
            obj.statements[0] = genTable(element);
            for (const c in element.columns){
                let col = element.columns[c]
                if (col.constraint.length == 1){
                    if(col.constraint[0].type == 'columnConstraint'){
                        let con = 
                        'alter table ' + obj.name + ' add constraint ' 
                        + col.constraint[0].name +' foreign key (' + col.columnName + ') ' 
                        + 'references ' + col.constraint[0].table + '(id) '+col.constraint[0].cascade
                        obj.statements.push(con);
                    }
                }
            }


           
        } else if (element.type == 'ddlIndex') {
           let ind = output.tables.findIndex((elm) => elm.name == element.tblName);
           let obj = {};
            if (typeof ind !== 'undefined' && ind > -1) { obj = output.tables[ind]; } else {
                obj = {
                    name: '',
                    statements: ['']
                };
                ind = output.tables.push(obj);
            }
            obj.name = element.tblName;
            obj.statements.push(element.sourceString);
        }else if (element.type == 'ddlcomment') {
            let ind = output.tables.findIndex((elm) => elm.name == element.tableName);
            let obj = {};
             if (typeof ind !== 'undefined' && ind > -1) { obj = output.tables[ind]; } else {
                 obj = {
                     name: '',
                     statements: ['']
                 };
                 ind = output.tables.push(obj);
             }
             obj.name = element.tableName;
             obj.statements.push(element.sourceString);
         }

    };
    return output
}