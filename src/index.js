import * as ohm from 'ohm-js';
import grammarSource from './grammar.js';
import { toJson } from './semantics.js';
import * as mustache from 'mustache';
import JSZip from 'jszip';
import FileSaver from 'file-saver';

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


function genTable(element, config) {
    let out = 'create table ';
    if (config.schema) {
        out = out + config.schema + '.';
    }
    out = out + element.tableName + '(\n';

    for (const c in element.columns) {
        if (c > 0) { out = out + ',\n '; }
        let col = element.columns[c]
        if (col.constraint.length == 1) {
            out = out + '\t' + col.columnName + ' \t' + col.dataType + ' ' + col.notNull;
        } else {
            out = out + '\t' + col.sourceString;
        }

    }
    out = out + '\n);'
    return out;

}

function genIndex(element, config) {
    let out = 'create index ';
    if (config.schema) {
        out = out + config.schema + '.';
    }
    out = out + element.indName + ' on '
    if (config.schema) {
        out = out + config.schema + '.';
    }
    out = out + element.tblName + '(' + element.clnName + ');';
    return out;

}

function genComment(element, config) {
    let out = 'comment on ';
    if (element.columnName) {
        out = out + 'column '
    } else {
        out = out + 'table '
    };
    if (config.schema) {
        out = out + config.schema + '.';
    };
    out = out + element.tableName
    if (element.columnName) {
        out = out + '.' + element.columnName;
    };
    out = out + ' is ' + element.val + ';';

    return out;

}

function genConstraint(element, column, constraint, config) {
    let out = 'alter table ';
    if (config.schema) {
        out = out + config.schema + '.';
    };
    out = out + element.tableName + ' add constraint ' + constraint.name + '\n\tforeign key (' + column.columnName + ')\n\treferences ';
    if (config.schema) {
        out = out + config.schema + '.';
    };
    out = out + constraint.table + ' (id) ' + constraint.cascade + ';';

    return out;

}

function genTrigger(element,config){
    let out = 'create or replace trigger '
    if (config.schema) {
        out = out + config.schema + '.';
    };
    out = out + element.name + '\n\t before insert or update \ton '
    if (config.schema) {
        out = out + config.schema + '.';
    };
    out = out + element.tblName + ' \t for each row\n'+element.body;
    return out;
}

export function refactor(config, statmentsJson) {
    let stmts = statmentsJson;
    let output = {
        'tables': [],
        'triggers':[]
    };
    for (const i in stmts) {
        let element = stmts[i];
        if (element.type == 'createTable') {
            let ind = output.tables.findIndex((elm) => elm.name == element.tableName);
            let obj = {};
            if (typeof ind !== 'undefined' && ind > -1) { obj = output.tables[ind]; }
            else {
                obj = {
                    name: '',
                    statements: ['']
                };
                ind = output.tables.push(obj);
            }
            obj.name = element.tableName;
            obj.statements[0] = { type: element.type, stmt: genTable(element, config) };
            for (const c in element.columns) {
                let col = element.columns[c]
                if (col.constraint.length == 1) {
                    if (col.constraint[0].type == 'columnConstraint') {
                        let con =
                            'alter table ' + obj.name + ' add constraint '
                            + col.constraint[0].name + ' foreign key (' + col.columnName + ') '
                            + 'references ' + col.constraint[0].table + '(id) ' + col.constraint[0].cascade
                        obj.statements.push({ type: col.constraint[0].type, stmt: genConstraint(element, col, col.constraint[0], config), fkTable: col.constraint[0].table });
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
            obj.statements.push({ type: 'ddlIndex', stmt: genIndex(element, config) });
        } else if (element.type == 'ddlcomment') {
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
            obj.statements.push({ type: element.type, stmt: genComment(element, config) });
        } else if (element.type == 'trigger'){
            let ind = output.triggers.findIndex((elm) => elm.name == element.name);
            let obj = {};
            if (typeof ind !== 'undefined' && ind > -1) { obj = output.triggers[ind]; }
            else {
                obj = {
                    name: '',
                    statements: ['']
                };
                ind = output.triggers.push(obj);
            }
            obj.name = element.name;
            obj.statements[0] = { type: element.type, stmt: genTrigger(element, config) };
        }

    };
    return output
}

function constraintChangelog(config, element) {
    if (config.constraintChangelog) {
        return config.constraintChangelog.replace('{{fkTable}}', element.fkTable);
    } else {
        return undefined;
    }

}

export function createFiles(config, refactorJSON) {
    const zip = new JSZip();
    const folderConst = zip.folder('constraints');
    const folderTables = zip.folder('tables');
    const folderTrigger = zip.folder('triggers');
    let fileprefix = config.fileprefix;
    for (const i in refactorJSON.tables) {
        let element = refactorJSON.tables[i];
        let constraint = [];
        let table = [];
        let tblChange = [];
        let indexChange = [];
        let commentChange = [];
        let constraintChange = [];
        table.push(fileprefix);
        constraint.push(fileprefix);

        // lets 1st find createTable statement it should go 1st
        tblChange = element.statements.filter((val) => val.type == 'createTable');
        table.push(config.tableChangelog);
        table.push(...tblChange.map((x) => x.stmt));


        indexChange = element.statements.filter((val) => val.type == 'ddlIndex');
        table.push(config.indexChangelog);
        table.push(...indexChange.map((x) => x.stmt));

        commentChange = element.statements.filter((val) => val.type == 'ddlcomment');
        table.push(config.commentChangelog);
        table.push(...commentChange.map((x) => x.stmt));

        constraintChange = element.statements.filter((val) => val.type == 'columnConstraint');

        for (const x in constraintChange) {
            let stmt = constraintChange[x];
            constraint.push(constraintChangelog(config, stmt));
            constraint.push(stmt.stmt);
        }

        folderTables.file(element.name + '.sql', table.filter(Boolean).join('\n'));
        folderConst.file(element.name + '.sql', constraint.filter(Boolean).join('\n'));
    }
    for (const i in refactorJSON.triggers){
        let element = refactorJSON.triggers[i];
        let stmts = [];
        let trigStatement = [];
        stmts.push(fileprefix);
        trigStatement = element.statements.filter((val) => val.type == 'trigger');

        for (const x in trigStatement) {
            let stmt = trigStatement[x];
            stmts.push(config.triggerChangelog);
            stmts.push(stmt.stmt);
        }
        folderTrigger.file(element.name + '.sql',stmts.filter(Boolean).join('\n'));
    }

    zip.generateAsync({ type: 'blob' }).then(function (content) {
        FileSaver.saveAs(content, 'download.zip');
    });

}