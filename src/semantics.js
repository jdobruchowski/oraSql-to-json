exports.toJson =
{
    Program(statements) {
        return statements.children.map(c => c.toJson());
    },
    CreateTable(a, b, name, c, columns, d, colums2, f, e, g) {
        let cc = [columns.toJson()];
        colums2.children.map(c => c.toJson())
        let i = 0;
        while (i < colums2.children.length) {
            cc.push(colums2.children[i].toJson());
            i++;
        }
        return {
            type: 'createTable',
            tableName: name.sourceString,
            columns: cc,
            sourceString : this.sourceString
        };
    },
    columnDefinition(name, a, dataType) {
        return {
            type: 'columnDefinition',
            columnName: name.sourceString,
            "dataType": dataType.sourceString,
            sourceString : this.sourceString
        };
    },
    columnDefinition(name, a, dataType, b, c, d, f, e) {
        return {
            type: 'columnDefinition',
            columnName: name.sourceString,
            gerate: b.sourceString,
            check: c.sourceString,
            constraint: d.toJson(),
            pkcons: f.sourceString,
            notNull: e.sourceString,
            sourceString : this.sourceString,
            "dataType": dataType.sourceString,
        };
    },
    constraint(a,b,c,d,e,f,g,h,i,j){
        return {
            type:'columnConstraint',
            name:d.sourceString,
            table:h.sourceString,
            cascade:j.sourceString,
            sourceString : this.sourceString
        }
    },
    name(a, b) {
        return this.sourceString;
    },
    _terminal() {
        return this.sourceString;
    },
    comment(a, b, c) {
        return {
            type: 'comment',
            value: this.sourceString,
            sourceString : this.sourceString
        }
    },
    ddlcomment(a, b, obj, c, d, f, txt, e) {
        let commObj = obj.toJson();
        return {
            type: 'ddlcomment',
            objType: obj.ctorName,
            tableName: commObj.tableName,
            columnName: commObj.columnName,
            val: txt.sourceString,
            sourceString : this.sourceString
        }
    },
    ddlCommentTable(a,b,c){
        return {
            tableName:c.sourceString,
            columnName: null
        }
    },
    ddlCommentColumn(a,b,c,d,e){
        return {
            tableName:c.sourceString,
            columnName:e.sourceString
        }
    },
    ddlIndex(a, b, indexName, c, d, e, tableName, f, g, columnName, h) {
        return {
            type: 'ddlIndex',
            indName: indexName.sourceString,
            tblName: tableName.sourceString,
            clnName: columnName.sourceString,
            sourceString : this.sourceString
        }
    },
    _iter(...children) {
        return children.map(c => c.toJson());
      },
    Trigger(a,b,c,d,e,f,g){
        return{
            type: 'trigger',
            name: b.sourceString,
            tblName: e.sourceString,
            body: g.sourceString,
            sourceString: this.sourceString,
        }
    }


}