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


function genTable(element) {
    let out = 'create table ' + element.tableName + '('
    for (const c in element.columns) {
        if (c > 0) { out = out + ', '; }
        let col = element.columns[c]
        if (col.constraint.length == 1) {
            out = out + col.columnName + ' ' + col.dataType + ' ' + col.notNull;
        } else {
            out = out + col.sourceString;
        }

    }
    out = out + ');'
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
                    name: '',
                    statements: ['']
                };
                ind = output.tables.push(obj);
            }
            obj.name = element.tableName;
            obj.statements[0] = { type: element.type, stmt: genTable(element) };
            for (const c in element.columns) {
                let col = element.columns[c]
                if (col.constraint.length == 1) {
                    if (col.constraint[0].type == 'columnConstraint') {
                        let con =
                            'alter table ' + obj.name + ' add constraint '
                            + col.constraint[0].name + ' foreign key (' + col.columnName + ') '
                            + 'references ' + col.constraint[0].table + '(id) ' + col.constraint[0].cascade
                        obj.statements.push({ type: col.constraint[0].type, stmt: con });
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
            obj.statements.push({ type: 'ddlIndex', stmt: element.sourceString });
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
            obj.statements.push({ type: element.type, stmt: element.sourceString });
        }

    };
    return output
}

function constraintChangelog(config,element){
    if(config.constraintChangelog){
        return config.constraintChangelog.replace('{{fkTable}}',element.fkTable);
    }else{
        return undefined;
    }
    
}

export function createFiles(config, refactorJSON) {
    const zip = new JSZip();
    const folderConst = zip.folder('constraints');
    const folderTables = zip.folder('tables');
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
                constraint.push(constraintChangelog(config,stmt));
                constraint.push(stmt.stmt);
        }

        folderTables.file(element.name + '.sql', table.filter(Boolean).join('\n'));
        folderConst.file(element.name + '.sql', constraint.filter(Boolean).join('\n'));
    }
    zip.generateAsync({ type: 'blob' }).then(function (content) {
        FileSaver.saveAs(content, 'download.zip');
    });

}