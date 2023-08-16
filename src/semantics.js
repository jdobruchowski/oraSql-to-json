exports.toJson = 
{
    Program(statements) {
      return statements.children.map(c => c.toJson());
    },
    CreateTable(a, b, name, c, columns, d, colums2,f , e, g) {
        let cc = [columns.toJson()];
       colums2.children.map(c=>c.toJson())
       let i =0;
       while (i < colums2.children.length){
        cc.push(colums2.children[i].toJson());
        i++;
       }
      return {
        type: 'createTable',
        tableName: name.sourceString,
        columns: cc,
      };
    },
    columnDefinition(name,a,dataType){
        return{
            type: 'columnDefinition',
            columnName: name.sourceString,
        };
    },
    columnDefinition(name,a,dataType,b,c,d,f,e){
        return{
            type: 'columnDefinition',
            columnName: name.sourceString,
        };
    },
    name(a,b){
        return this.sourceString;
    },
    _terminal(){
        return this.sourceString;
    }


}